-- Add gender-specific reference range columns and a source flag to biomarker_definitions.
--
-- Rationale:
--   Some biomarkers (hemoglobin, ferritin, creatinine, …) have clinically distinct
--   normal ranges for males vs females. Storing both lets the API surface the range
--   that actually applies to the patient rather than a wide gender-neutral band.
--
--   range_source distinguishes:
--     'canonical' — seeded from medical literature; NEVER overwritten by OCR extraction
--     'extracted' — auto-created from a lab report; may be updated as more data arrives

ALTER TABLE biomarker_definitions
  ADD COLUMN IF NOT EXISTS ref_range_low_m   NUMERIC,
  ADD COLUMN IF NOT EXISTS ref_range_high_m  NUMERIC,
  ADD COLUMN IF NOT EXISTS ref_range_low_f   NUMERIC,
  ADD COLUMN IF NOT EXISTS ref_range_high_f  NUMERIC,
  ADD COLUMN IF NOT EXISTS range_source      TEXT NOT NULL DEFAULT 'extracted'
    CHECK (range_source IN ('canonical', 'extracted'));

COMMENT ON COLUMN biomarker_definitions.ref_range_low_m  IS 'Male-specific lower reference bound';
COMMENT ON COLUMN biomarker_definitions.ref_range_high_m IS 'Male-specific upper reference bound';
COMMENT ON COLUMN biomarker_definitions.ref_range_low_f  IS 'Female-specific lower reference bound';
COMMENT ON COLUMN biomarker_definitions.ref_range_high_f IS 'Female-specific upper reference bound';
COMMENT ON COLUMN biomarker_definitions.range_source     IS 'canonical = literature-seeded, extracted = from OCR';

-- Mark all rows from the original seed migration as canonical
UPDATE biomarker_definitions
SET range_source = 'canonical'
WHERE name_normalized IN (
  'fasting_blood_sugar','hba1c','random_blood_sugar','postprandial_blood_sugar',
  'creatinine','blood_urea_nitrogen','uric_acid','egfr','bun_creatinine_ratio',
  'alt','ast','alkaline_phosphatase','total_bilirubin','direct_bilirubin',
  'indirect_bilirubin','total_protein','albumin','globulin','ag_ratio','ggt',
  'total_cholesterol','hdl_cholesterol','ldl_cholesterol','vldl_cholesterol',
  'triglycerides','cholesterol_hdl_ratio','ldl_hdl_ratio','non_hdl_cholesterol',
  'tsh','t3','t4','free_t3','free_t4',
  'hemoglobin','hematocrit','rbc_count','wbc_count','platelet_count',
  'mcv','mch','mchc','rdw',
  'neutrophils','lymphocytes','monocytes','eosinophils','basophils',
  'esr','crp','vitamin_d','vitamin_b12','iron','ferritin',
  'calcium','phosphorus','sodium','potassium','chloride','magnesium',
  'pdw','uibc','transferrin_saturation','tibc','mpv','pct',
  'white_blood_cells','red_blood_cells','platelets'
);

-- ── Gender-specific ranges (sources: ICMR, WHO, Mayo Clinic guidelines) ──────

-- CBC
UPDATE biomarker_definitions SET
  ref_range_low_m = 13.5, ref_range_high_m = 17.5,
  ref_range_low_f = 12.0, ref_range_high_f = 15.5
WHERE name_normalized = 'hemoglobin';

UPDATE biomarker_definitions SET
  ref_range_low_m = 41.0, ref_range_high_m = 53.0,
  ref_range_low_f = 36.0, ref_range_high_f = 46.0
WHERE name_normalized = 'hematocrit';

UPDATE biomarker_definitions SET
  ref_range_low_m = 4.5, ref_range_high_m = 5.9,
  ref_range_low_f = 4.0, ref_range_high_f = 5.2
WHERE name_normalized IN ('rbc_count', 'red_blood_cells');

-- Kidney
UPDATE biomarker_definitions SET
  ref_range_low_m = 0.74, ref_range_high_m = 1.35,
  ref_range_low_f = 0.59, ref_range_high_f = 1.04
WHERE name_normalized = 'creatinine';

UPDATE biomarker_definitions SET
  ref_range_low_m = 3.5, ref_range_high_m = 7.2,
  ref_range_low_f = 2.6, ref_range_high_f = 6.0
WHERE name_normalized = 'uric_acid';

-- Iron stores (large gender difference)
UPDATE biomarker_definitions SET
  ref_range_low_m = 24,  ref_range_high_m = 336,
  ref_range_low_f = 11,  ref_range_high_f = 307
WHERE name_normalized = 'ferritin';

UPDATE biomarker_definitions SET
  ref_range_low_m = 65,  ref_range_high_m = 176,
  ref_range_low_f = 50,  ref_range_high_f = 170
WHERE name_normalized = 'iron';

-- Lipids (HDL differs)
UPDATE biomarker_definitions SET
  ref_range_low_m = 40, ref_range_high_m = 60,
  ref_range_low_f = 50, ref_range_high_f = 80
WHERE name_normalized = 'hdl_cholesterol';

-- Liver enzymes (mild gender difference)
UPDATE biomarker_definitions SET
  ref_range_low_m = 7, ref_range_high_m = 56,
  ref_range_low_f = 7, ref_range_high_f = 45
WHERE name_normalized = 'alt';

UPDATE biomarker_definitions SET
  ref_range_low_m = 10, ref_range_high_m = 40,
  ref_range_low_f = 10, ref_range_high_f = 35
WHERE name_normalized = 'ast';

-- ── Update RPC functions to expose gender columns ─────────────────────────────

DROP FUNCTION IF EXISTS get_biomarkers_with_definitions(UUID);
CREATE OR REPLACE FUNCTION get_biomarkers_with_definitions(p_profile_id UUID)
RETURNS TABLE (
  id                  UUID,
  report_id           UUID,
  user_id             UUID,
  profile_id          UUID,
  name                TEXT,
  name_normalized     TEXT,
  category            TEXT,
  value               NUMERIC,
  unit                TEXT,
  ref_range_low       NUMERIC,
  ref_range_high      NUMERIC,
  report_date         DATE,
  created_at          TIMESTAMPTZ,
  def_name_normalized TEXT,
  def_display_name    TEXT,
  def_category        TEXT,
  def_unit            TEXT,
  def_ref_range_low   NUMERIC,
  def_ref_range_high  NUMERIC,
  def_ref_range_low_m NUMERIC,
  def_ref_range_high_m NUMERIC,
  def_ref_range_low_f NUMERIC,
  def_ref_range_high_f NUMERIC,
  def_critical_low    NUMERIC,
  def_critical_high   NUMERIC,
  def_description     TEXT,
  def_range_source    TEXT
)
LANGUAGE sql STABLE AS $$
  SELECT
    b.id, b.report_id, b.user_id, b.profile_id,
    b.name, b.name_normalized, b.category,
    b.value, b.unit,
    b.ref_range_low, b.ref_range_high,
    b.report_date, b.created_at,
    bd.name_normalized,
    bd.display_name,
    bd.category,
    bd.unit,
    bd.ref_range_low,
    bd.ref_range_high,
    bd.ref_range_low_m,
    bd.ref_range_high_m,
    bd.ref_range_low_f,
    bd.ref_range_high_f,
    bd.critical_low,
    bd.critical_high,
    bd.description,
    bd.range_source
  FROM biomarkers b
  LEFT JOIN biomarker_definitions bd ON b.name_normalized = bd.name_normalized
  WHERE b.profile_id = p_profile_id
  ORDER BY b.report_date DESC NULLS LAST, b.created_at DESC;
$$;

DROP FUNCTION IF EXISTS get_biomarkers_by_report(UUID);
CREATE OR REPLACE FUNCTION get_biomarkers_by_report(p_report_id UUID)
RETURNS TABLE (
  id                  UUID,
  report_id           UUID,
  user_id             UUID,
  profile_id          UUID,
  name                TEXT,
  name_normalized     TEXT,
  category            TEXT,
  value               NUMERIC,
  unit                TEXT,
  ref_range_low       NUMERIC,
  ref_range_high      NUMERIC,
  report_date         DATE,
  created_at          TIMESTAMPTZ,
  def_name_normalized TEXT,
  def_display_name    TEXT,
  def_category        TEXT,
  def_unit            TEXT,
  def_ref_range_low   NUMERIC,
  def_ref_range_high  NUMERIC,
  def_ref_range_low_m NUMERIC,
  def_ref_range_high_m NUMERIC,
  def_ref_range_low_f NUMERIC,
  def_ref_range_high_f NUMERIC,
  def_critical_low    NUMERIC,
  def_critical_high   NUMERIC,
  def_description     TEXT,
  def_range_source    TEXT
)
LANGUAGE sql STABLE AS $$
  SELECT
    b.id, b.report_id, b.user_id, b.profile_id,
    b.name, b.name_normalized, b.category,
    b.value, b.unit,
    b.ref_range_low, b.ref_range_high,
    b.report_date, b.created_at,
    bd.name_normalized,
    bd.display_name,
    bd.category,
    bd.unit,
    bd.ref_range_low,
    bd.ref_range_high,
    bd.ref_range_low_m,
    bd.ref_range_high_m,
    bd.ref_range_low_f,
    bd.ref_range_high_f,
    bd.critical_low,
    bd.critical_high,
    bd.description,
    bd.range_source
  FROM biomarkers b
  LEFT JOIN biomarker_definitions bd ON b.name_normalized = bd.name_normalized
  WHERE b.report_id = p_report_id
  ORDER BY b.name_normalized ASC;
$$;
