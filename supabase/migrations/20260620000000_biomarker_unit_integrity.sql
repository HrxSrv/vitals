-- Biomarker unit-dimension integrity gate
-- =======================================
--
-- Problem this fixes (Type-I "identity errors"):
--   The extractor writes `biomarkers.name_normalized` as free text. With no
--   referential integrity and no unit check, completely different tests end up
--   under the same slug — e.g. "Fasting Blood Sugar" (mg/dL) and urinary "Cast"
--   (/HPF) both filed under `ast` (catalog unit U/L). A patient's glucose then
--   plots as their liver enzyme.
--
--   Every such case is a *dimensional impossibility*: the contaminating value's
--   unit cannot be converted to the slug's canonical unit. The catalog
--   (biomarker_definitions) already holds the canonical unit for each slug — it
--   was just never wired to the write path.
--
-- What this migration does:
--   1. Adds a `biomarkers_unresolved` quarantine table.
--   2. Adds deterministic unit-dimension functions that classify a raw unit
--      string into a physical-quantity token (mass/volume, enzyme activity,
--      count/volume, percent, …) — tolerant of notation variants
--      (mg/dl≡mg/dL≡mg%, fL≡µm³, mEq/L≡mmol/L for monovalent ions, …).
--   3. Adds a BEFORE INSERT/UPDATE trigger on `biomarkers` that compares the
--      incoming unit's dimension to the slug's catalog unit. On a confident
--      mismatch it redirects the row to quarantine instead of corrupting the
--      trend column. Unknown units always pass (the gate only acts on a
--      confident mismatch — it never false-quarantines an unrecognised unit).
--   4. Re-adds the FK biomarkers.name_normalized -> biomarker_definitions as
--      NOT VALID (enforced on new writes; pre-existing orphan rows are left for
--      the separate backfill PR to clean up, then the FK can be VALIDATEd).
--
-- Scope note: this gate kills the dimensionally-impossible class. Same-dimension
-- confusions (e.g. Apo B mg/dL filed under non_hdl_cholesterol mg/dL) are NOT
-- caught here by design — those need the semantic resolver / alias layer
-- (a later PR). biomarker_definitions.name_normalized is already a PRIMARY KEY,
-- so no extra UNIQUE constraint is needed for the FK.

-- ---------------------------------------------------------------------------
-- 1. Quarantine table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS biomarkers_unresolved (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       UUID REFERENCES reports(id)  ON DELETE CASCADE,
  user_id         UUID NOT NULL,               -- Supabase Auth user id (auth.users; no local users table)
  profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,            -- raw biomarker name as written in the report
  name_normalized TEXT,                     -- slug the extractor proposed (may be wrong)
  value           NUMERIC,
  unit            TEXT,                     -- raw unit as extracted
  category        TEXT,
  ref_range_low   NUMERIC,
  ref_range_high  NUMERIC,
  report_date     DATE,
  reason          TEXT NOT NULL,            -- why it was quarantined
  expected_unit   TEXT,                     -- catalog unit the proposed slug requires
  expected_dimension TEXT,                  -- dimension token of expected_unit
  found_dimension TEXT,                     -- dimension token of the extracted unit
  resolution_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (resolution_status IN ('pending', 'resolved', 'discarded')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unresolved_report  ON biomarkers_unresolved(report_id);
CREATE INDEX IF NOT EXISTS idx_unresolved_profile ON biomarkers_unresolved(profile_id);
CREATE INDEX IF NOT EXISTS idx_unresolved_status  ON biomarkers_unresolved(resolution_status)
  WHERE resolution_status = 'pending';

COMMENT ON TABLE biomarkers_unresolved IS
  'Quarantine for biomarker rows rejected at the write boundary (e.g. unit-dimension mismatch). Feeds a future human review queue; never flows into trends.';

-- RLS: owners can see/triage their own quarantined rows; the backend service
-- role bypasses RLS for trigger inserts.
ALTER TABLE biomarkers_unresolved ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own unresolved biomarkers"
  ON biomarkers_unresolved FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own unresolved biomarkers"
  ON biomarkers_unresolved FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own unresolved biomarkers"
  ON biomarkers_unresolved FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own unresolved biomarkers"
  ON biomarkers_unresolved FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. Unit normalization + dimension classification
-- ---------------------------------------------------------------------------
-- Collapse the notation zoo seen in real reports to a comparable form:
--   casing, micro-sign variants (µ U+00B5 / μ U+03BC), superscripts, ×/^/*
--   exponent markers, whitespace, and "gm" -> "g".
CREATE OR REPLACE FUNCTION biomarker_normalize_unit(raw TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v TEXT;
BEGIN
  v := lower(coalesce(raw, ''));
  -- micro signs -> u ; drop multiplication dot / cross
  v := translate(v, 'µμ×·', 'uu');
  -- unicode superscripts -> ascii digits
  v := translate(v, '⁰¹²³⁴⁵⁶⁷⁸⁹', '0123456789');
  -- drop exponent markers and stray 'x' (e.g. "x 10^3" -> "103")
  v := replace(v, '^', '');
  v := replace(v, '*', '');
  v := replace(v, 'x', '');
  v := replace(v, ' ', '');
  -- "gm" is just grams
  v := replace(v, 'gm', 'g');
  RETURN v;
END;
$$;

-- Classify a raw unit string into a physical-quantity dimension token.
-- Returns 'unknown' for anything unrecognised so the gate stays conservative.
CREATE OR REPLACE FUNCTION biomarker_unit_dimension(raw TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v TEXT := biomarker_normalize_unit(raw);
BEGIN
  -- Empty / placeholder -> unknown (always passes the gate)
  IF v IN ('', '-', '--', 'na', 'n/a', 'nil') THEN
    RETURN 'unknown';
  END IF;

  -- Dimensionless ratios / indices
  IF v IN ('ratio', 'index', 'indexvalue') THEN
    RETURN 'dimensionless';
  END IF;

  -- Percent (bare). "mg%"/"g%" are handled as mass concentrations below.
  IF v = '%' THEN
    RETURN 'percent';
  END IF;

  -- eGFR rate (check before bare volume/count so "ml/min/..." isn't misread)
  IF v ~ 'ml/min' THEN
    RETURN 'egfr_rate';
  END IF;

  -- ESR sedimentation rate (mm/h, mm/hr, mm/hour)
  IF v ~ '^mm/h' THEN
    RETURN 'esr_rate';
  END IF;

  -- Mass concentration (prefix-sensitive: mg/dL is NOT µg/dL)
  IF v IN ('mg/dl', 'mg%', 'mg/100ml') THEN RETURN 'mg_per_dl'; END IF;
  IF v IN ('g/dl',  'g%',  'g/100ml') THEN RETURN 'g_per_dl';  END IF;
  IF v = 'ug/dl' THEN RETURN 'ug_per_dl'; END IF;
  IF v = 'ng/dl' THEN RETURN 'ng_per_dl'; END IF;
  IF v = 'pg/dl' THEN RETURN 'pg_per_dl'; END IF;
  IF v = 'ng/ml' THEN RETURN 'ng_per_ml'; END IF;
  IF v = 'pg/ml' THEN RETURN 'pg_per_ml'; END IF;
  IF v = 'ug/ml' THEN RETURN 'ug_per_ml'; END IF;
  IF v = 'mg/ml' THEN RETURN 'mg_per_ml'; END IF;
  IF v = 'ug/l'  THEN RETURN 'ug_per_l';  END IF;
  IF v = 'ng/l'  THEN RETURN 'ng_per_l';  END IF;
  IF v = 'mg/l'  THEN RETURN 'mg_per_l';  END IF;
  IF v = 'g/l'   THEN RETURN 'g_per_l';   END IF;

  -- Absolute mass
  IF v = 'pg' THEN RETURN 'mass_pg'; END IF;
  IF v = 'ng' THEN RETURN 'mass_ng'; END IF;

  -- Cell/particle volume (1 µm³ == 1 fL)
  IF v IN ('fl', 'um3') THEN RETURN 'vol_fl'; END IF;
  IF v = 'ml' THEN RETURN 'vol_ml'; END IF;
  IF v = 'l'  THEN RETURN 'vol_l';  END IF;

  -- Enzyme / hormone activity
  IF v ~ '^i?u/l$'   THEN RETURN 'activity_per_l';     END IF;  -- U/L, IU/L
  IF v ~ 'iu/ml$'    THEN RETURN 'activity_iu_per_ml'; END IF;  -- µIU/mL, mIU/mL, IU/mL
  IF v = 'u/ml'      THEN RETURN 'activity_per_ml';    END IF;

  -- Molar / equivalent concentration. mEq/L == mmol/L for monovalent ions
  -- (Na, K, Cl) — the common electrolyte case — so they share a dimension.
  IF v IN ('meq/l', 'mmol/l') THEN RETURN 'molar_per_l';  END IF;
  IF v = 'umol/l'  THEN RETURN 'umol_per_l'; END IF;
  IF v = 'mol/l'   THEN RETURN 'mol_per_l';  END IF;

  -- Count per microscopic field
  IF v ~ '/(hpf|lpf)$' THEN RETURN 'per_hpf'; END IF;

  -- Count per volume. All magnitudes (10^3, 10^6, /µL, lakh, …) collapse to one
  -- token: this gate separates counts from %/HPF/mass, not 10^3 from 10^6.
  IF v ~ '(million|thou|lakh|lac)'      THEN RETURN 'count_per_vol'; END IF;
  IF v ~ '10(2|3|6|9|12)/(ul|l)$'       THEN RETURN 'count_per_vol'; END IF;
  IF v ~ '^[0-9]+/(ul|l)$'              THEN RETURN 'count_per_vol'; END IF;
  IF v ~ '/(ul|cumm|cmm|mm3)$'          THEN RETURN 'count_per_vol'; END IF;
  IF v ~ '^k/ul$'                       THEN RETURN 'count_per_vol'; END IF;
  IF v ~ 'cells'                        THEN RETURN 'count_per_vol'; END IF;

  RETURN 'unknown';
END;
$$;

-- Two units are compatible if they share a dimension, or if either is unknown
-- (we never reject on a unit we can't classify).
CREATE OR REPLACE FUNCTION biomarker_units_compatible(unit_a TEXT, unit_b TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  da TEXT := biomarker_unit_dimension(unit_a);
  db TEXT := biomarker_unit_dimension(unit_b);
BEGIN
  RETURN da = 'unknown' OR db = 'unknown' OR da = db;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Write-boundary trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION biomarker_enforce_unit_dimension()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  def_unit TEXT;
BEGIN
  SELECT unit INTO def_unit
  FROM biomarker_definitions
  WHERE name_normalized = NEW.name_normalized;

  -- No catalog entry (or no canonical unit) -> nothing to compare against.
  IF def_unit IS NULL OR def_unit = '' THEN
    RETURN NEW;
  END IF;

  IF biomarker_units_compatible(NEW.unit, def_unit) THEN
    RETURN NEW;
  END IF;

  -- Dimensional mismatch.
  IF TG_OP = 'INSERT' THEN
    -- Redirect to quarantine and skip the insert (returning NULL drops the row
    -- without failing the surrounding batch).
    INSERT INTO biomarkers_unresolved (
      report_id, user_id, profile_id, name, name_normalized, value, unit,
      category, ref_range_low, ref_range_high, report_date,
      reason, expected_unit, expected_dimension, found_dimension
    ) VALUES (
      NEW.report_id, NEW.user_id, NEW.profile_id, NEW.name, NEW.name_normalized,
      NEW.value, NEW.unit, NEW.category, NEW.ref_range_low, NEW.ref_range_high,
      NEW.report_date, 'unit_dimension_mismatch', def_unit,
      biomarker_unit_dimension(def_unit), biomarker_unit_dimension(NEW.unit)
    );
    RETURN NULL;
  ELSE
    -- UPDATE that would introduce a mismatch is a bug upstream — surface it.
    RAISE EXCEPTION
      'biomarker "%" unit "%" is dimensionally incompatible with catalog unit "%" for slug "%"',
      NEW.name, NEW.unit, def_unit, NEW.name_normalized;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_biomarker_unit_integrity ON biomarkers;
CREATE TRIGGER trg_biomarker_unit_integrity
  BEFORE INSERT OR UPDATE ON biomarkers
  FOR EACH ROW
  EXECUTE FUNCTION biomarker_enforce_unit_dimension();

-- ---------------------------------------------------------------------------
-- 4. Restore referential integrity on the slug (NOT VALID for now)
-- ---------------------------------------------------------------------------
-- Enforced on every new write; pre-existing orphan slugs are not validated yet.
-- After the backfill PR cleans up orphans, run:
--   ALTER TABLE biomarkers VALIDATE CONSTRAINT fk_biomarkers_definition;
ALTER TABLE biomarkers
  DROP CONSTRAINT IF EXISTS fk_biomarkers_definition;
ALTER TABLE biomarkers
  ADD CONSTRAINT fk_biomarkers_definition
  FOREIGN KEY (name_normalized)
  REFERENCES biomarker_definitions(name_normalized)
  NOT VALID;

COMMENT ON COLUMN biomarkers.name_normalized IS
  'Canonical biomarker slug. FK to biomarker_definitions (NOT VALID until orphan backfill). Unit dimension is checked against the referenced definition on write.';
