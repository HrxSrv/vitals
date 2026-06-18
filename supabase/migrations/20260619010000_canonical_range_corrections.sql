-- Canonical reference range corrections and additions.
--
-- Sources:
--   WHO Laboratory Reference Ranges (2011)
--   ICMR Reference Values for Indian Population (2020)
--   AHA/ACC Cholesterol Guidelines (2019)
--   Endocrine Society Clinical Practice Guidelines
--   Mayo Clinic Laboratory Reference Values
--
-- All rows touched here are or become canonical (range_source = 'canonical').
-- They will never be overwritten by OCR extraction.

-- ── 1. Corrections to existing seeded values ─────────────────────────────────

-- eGFR: no clinical upper bound — values above 120 just mean very good kidney
-- function, not pathology. Setting high = 200 prevents false "high" alerts.
UPDATE biomarker_definitions
SET ref_range_high = 200,
    critical_low   = 30,   -- KDIGO: stage 3b/4 boundary; below this = urgent
    critical_high  = NULL
WHERE name_normalized = 'egfr' AND range_source = 'canonical';

-- HDL cholesterol: above 60 (men) / 70 (women) is cardioprotective, never
-- flagged as "high" in routine clinical practice. Set neutral upper to 120.
UPDATE biomarker_definitions
SET ref_range_high   = 120,
    ref_range_high_m = 120,
    ref_range_high_f = 120
WHERE name_normalized = 'hdl_cholesterol' AND range_source = 'canonical';

-- ESR: Westergren method (WHO standard). Gender-neutral upper kept at 20
-- (female adult limit); gender-specific splits added below.
UPDATE biomarker_definitions
SET ref_range_high   = 20,
    ref_range_low_m  = 0,  ref_range_high_m = 15,
    ref_range_low_f  = 0,  ref_range_high_f = 20
WHERE name_normalized = 'esr' AND range_source = 'canonical';

-- GGT: gender-specific ULN (AASLD / typical Indian lab values).
UPDATE biomarker_definitions
SET ref_range_low    = 11, ref_range_high   = 50,
    ref_range_low_m  = 11, ref_range_high_m = 50,
    ref_range_low_f  = 7,  ref_range_high_f = 32
WHERE name_normalized = 'ggt' AND range_source = 'canonical';

-- Transferrin saturation: female lower bound is 15 %, not 20 %.
UPDATE biomarker_definitions
SET ref_range_low_m  = 20, ref_range_high_m = 50,
    ref_range_low_f  = 15, ref_range_high_f = 45
WHERE name_normalized = 'transferrin_saturation' AND range_source = 'canonical';

-- ── 2. New biomarkers ─────────────────────────────────────────────────────────

-- Folate (serum)
-- WHO deficiency: < 3.0 ng/mL; ICMR adequate: ≥ 5.7 ng/mL (13 nmol/L)
-- Mayo reference: 2.7–17.0 ng/mL
INSERT INTO biomarker_definitions
  (name_normalized, display_name, category, unit,
   ref_range_low, ref_range_high, critical_low, critical_high,
   description, range_source)
VALUES
  ('folate', 'Folate (Serum)', 'vitamins', 'ng/mL',
   5.7, 17.0, 2.0, NULL,
   'Serum folate (vitamin B9). Deficiency linked to anaemia and neural tube defects.',
   'canonical')
ON CONFLICT (name_normalized) DO NOTHING;

-- hs-CRP (high-sensitivity CRP — different assay from routine CRP)
-- ACC/AHA cardiovascular risk stratification:
--   Low risk   < 1.0 mg/L
--   Moderate   1.0–3.0 mg/L
--   High risk  > 3.0 mg/L
INSERT INTO biomarker_definitions
  (name_normalized, display_name, category, unit,
   ref_range_low, ref_range_high, critical_low, critical_high,
   description, range_source)
VALUES
  ('hs_crp', 'hs-CRP', 'other', 'mg/L',
   0, 1.0, 0, 10.0,
   'High-sensitivity C-reactive protein. Used for cardiovascular risk stratification (not the same assay as routine CRP).',
   'canonical')
ON CONFLICT (name_normalized) DO NOTHING;

-- Homocysteine
-- Normal adult: 5–15 μmol/L (WHO). Moderate hyperhomocysteinaemia > 15.
-- Slight gender difference: males tend to run slightly higher.
INSERT INTO biomarker_definitions
  (name_normalized, display_name, category, unit,
   ref_range_low, ref_range_high, critical_low, critical_high,
   ref_range_low_m, ref_range_high_m, ref_range_low_f, ref_range_high_f,
   description, range_source)
VALUES
  ('homocysteine', 'Homocysteine', 'other', 'μmol/L',
   5.0, 15.0, 0, 50.0,
   5.0, 15.0, 5.0, 12.0,
   'Amino acid; elevated levels associated with cardiovascular and neurological risk.',
   'canonical')
ON CONFLICT (name_normalized) DO NOTHING;

-- LDH (Lactate Dehydrogenase)
-- Adults: 140–280 U/L (Mayo). Varies slightly by method; most Indian labs: 135–225 U/L.
INSERT INTO biomarker_definitions
  (name_normalized, display_name, category, unit,
   ref_range_low, ref_range_high, critical_low, critical_high,
   description, range_source)
VALUES
  ('ldh', 'LDH', 'other', 'U/L',
   135, 225, 0, 2000,
   'Lactate dehydrogenase. Elevated in tissue damage, haemolysis, liver disease, some cancers.',
   'canonical')
ON CONFLICT (name_normalized) DO NOTHING;

-- Fibrinogen
-- Normal coagulation reference: 200–400 mg/dL
INSERT INTO biomarker_definitions
  (name_normalized, display_name, category, unit,
   ref_range_low, ref_range_high, critical_low, critical_high,
   description, range_source)
VALUES
  ('fibrinogen', 'Fibrinogen', 'other', 'mg/dL',
   200, 400, 100, 700,
   'Clotting protein. Elevated in inflammation and cardiovascular risk; low in DIC.',
   'canonical')
ON CONFLICT (name_normalized) DO NOTHING;

-- D-Dimer
-- Standard: < 500 ng/mL (FEU) for ruling out VTE (WHO/ISTH).
-- Note: rises normally with age; age-adjusted cutoff = age × 10 for > 50 y.
INSERT INTO biomarker_definitions
  (name_normalized, display_name, category, unit,
   ref_range_low, ref_range_high, critical_low, critical_high,
   description, range_source)
VALUES
  ('d_dimer', 'D-Dimer', 'other', 'ng/mL',
   0, 500, 0, NULL,
   'Fibrin degradation product. Elevated in thrombosis, DIC, and pulmonary embolism.',
   'canonical')
ON CONFLICT (name_normalized) DO NOTHING;

-- ── CBC absolute counts (different from %) ─────────────────────────────────
-- Units: ×10³/μL (= cells/mm³ ÷ 1000). Reference: WHO / ICMR.

INSERT INTO biomarker_definitions
  (name_normalized, display_name, category, unit,
   ref_range_low, ref_range_high, critical_low, critical_high,
   description, range_source)
VALUES
  ('absolute_neutrophils', 'Absolute Neutrophil Count (ANC)', 'blood_count', '×10³/μL',
   1.8, 7.5, 0.5, 30.0,
   'Absolute neutrophil count. Low (< 1.5) = neutropaenia; critical low (< 0.5) = severe neutropaenia.',
   'canonical'),

  ('absolute_lymphocytes', 'Absolute Lymphocyte Count (ALC)', 'blood_count', '×10³/μL',
   1.0, 4.8, 0.5, 15.0,
   'Absolute lymphocyte count.',
   'canonical'),

  ('absolute_monocytes', 'Absolute Monocyte Count', 'blood_count', '×10³/μL',
   0.2, 1.0, 0, 5.0,
   'Absolute monocyte count.',
   'canonical'),

  ('absolute_eosinophils', 'Absolute Eosinophil Count (AEC)', 'blood_count', '×10³/μL',
   0.1, 0.5, 0, 3.0,
   'Absolute eosinophil count. Elevated in allergy and parasitic infection.',
   'canonical'),

  ('absolute_basophils', 'Absolute Basophil Count', 'blood_count', '×10³/μL',
   0.0, 0.1, 0, 1.0,
   'Absolute basophil count.',
   'canonical')
ON CONFLICT (name_normalized) DO NOTHING;

-- Reticulocytes
INSERT INTO biomarker_definitions
  (name_normalized, display_name, category, unit,
   ref_range_low, ref_range_high, critical_low, critical_high,
   description, range_source)
VALUES
  ('reticulocytes', 'Reticulocyte Count', 'blood_count', '%',
   0.5, 2.5, 0, 10.0,
   'Immature red blood cells. Elevated in haemolytic anaemia; low in aplastic anaemia.',
   'canonical')
ON CONFLICT (name_normalized) DO NOTHING;

-- RDW-SD
INSERT INTO biomarker_definitions
  (name_normalized, display_name, category, unit,
   ref_range_low, ref_range_high, critical_low, critical_high,
   description, range_source)
VALUES
  ('rdw_sd', 'RDW-SD', 'blood_count', 'fL',
   37, 54, 25, 80,
   'Red cell distribution width — standard deviation. Measures absolute size variation.',
   'canonical')
ON CONFLICT (name_normalized) DO NOTHING;

-- ── Hormones ──────────────────────────────────────────────────────────────────

-- Testosterone (total)
-- WHO/Endocrine Society: Male hypogonadism threshold < 300 ng/dL.
-- Female testosterone is an order of magnitude lower.
INSERT INTO biomarker_definitions
  (name_normalized, display_name, category, unit,
   ref_range_low, ref_range_high, critical_low, critical_high,
   ref_range_low_m, ref_range_high_m, ref_range_low_f, ref_range_high_f,
   description, range_source)
VALUES
  ('testosterone', 'Total Testosterone', 'hormones', 'ng/dL',
   15, 1000, 0, NULL,
   300, 1000, 15, 70,
   'Total testosterone. Male range applies for hypogonadism screening; female range differs substantially.',
   'canonical')
ON CONFLICT (name_normalized) DO NOTHING;

-- Prolactin
-- Endocrine Society reference:
--   Male:        2–18 ng/mL (some labs up to 20)
--   Female (non-pregnant): 2–29 ng/mL
INSERT INTO biomarker_definitions
  (name_normalized, display_name, category, unit,
   ref_range_low, ref_range_high, critical_low, critical_high,
   ref_range_low_m, ref_range_high_m, ref_range_low_f, ref_range_high_f,
   description, range_source)
VALUES
  ('prolactin', 'Prolactin', 'hormones', 'ng/mL',
   2, 29, 0, NULL,
   2, 18, 2, 29,
   'Prolactin. Elevated (hyperprolactinaemia) can cause infertility and galactorrhoea.',
   'canonical')
ON CONFLICT (name_normalized) DO NOTHING;

-- Cortisol (AM — morning, 8–10 AM draw; PM values are lower)
-- Mayo Clinic: AM cortisol 6.2–19.4 μg/dL; ICMR similar.
INSERT INTO biomarker_definitions
  (name_normalized, display_name, category, unit,
   ref_range_low, ref_range_high, critical_low, critical_high,
   description, range_source)
VALUES
  ('cortisol', 'Cortisol (AM)', 'hormones', 'μg/dL',
   6.2, 19.4, 2.0, 50.0,
   'Morning cortisol (8–10 AM). Low suggests adrenal insufficiency; high suggests Cushing syndrome.',
   'canonical')
ON CONFLICT (name_normalized) DO NOTHING;

-- PSA (Prostate-Specific Antigen) — male-only marker
-- Standard clinical cutoff: > 4 ng/mL warrants further investigation.
-- Note: PSA rises with age; age-specific cutoffs exist but 4 ng/mL is widely used.
INSERT INTO biomarker_definitions
  (name_normalized, display_name, category, unit,
   ref_range_low, ref_range_high, critical_low, critical_high,
   ref_range_low_m, ref_range_high_m,
   description, range_source)
VALUES
  ('psa', 'PSA (Prostate-Specific Antigen)', 'hormones', 'ng/mL',
   0, 4.0, 0, NULL,
   0, 4.0, NULL, NULL,
   'Prostate-specific antigen. Elevated levels require clinical correlation; not diagnostic alone.',
   'canonical')
ON CONFLICT (name_normalized) DO NOTHING;

-- Fasting insulin
-- Normal fasting insulin: 2–25 μIU/mL. HOMA-IR > 2.5 suggests insulin resistance.
INSERT INTO biomarker_definitions
  (name_normalized, display_name, category, unit,
   ref_range_low, ref_range_high, critical_low, critical_high,
   description, range_source)
VALUES
  ('insulin_fasting', 'Fasting Insulin', 'diabetes', 'μIU/mL',
   2, 25, 0, 100,
   'Fasting insulin. Elevated levels indicate insulin resistance; used with glucose for HOMA-IR.',
   'canonical')
ON CONFLICT (name_normalized) DO NOTHING;

-- C-Peptide
-- Reflects endogenous insulin secretion.
-- Normal fasting: 0.5–2.0 ng/mL (Mayo)
INSERT INTO biomarker_definitions
  (name_normalized, display_name, category, unit,
   ref_range_low, ref_range_high, critical_low, critical_high,
   description, range_source)
VALUES
  ('c_peptide', 'C-Peptide', 'diabetes', 'ng/mL',
   0.5, 2.0, 0, 10.0,
   'C-peptide. Marker of endogenous insulin production; helps distinguish type 1 from type 2 diabetes.',
   'canonical')
ON CONFLICT (name_normalized) DO NOTHING;

-- ── Kidney: UACR ──────────────────────────────────────────────────────────────

-- Urine Albumin-to-Creatinine Ratio (UACR / ACR)
-- KDIGO / ADA:
--   Normal < 30 mg/g
--   Microalbuminuria 30–300 mg/g (early CKD marker)
--   Macroalbuminuria > 300 mg/g
INSERT INTO biomarker_definitions
  (name_normalized, display_name, category, unit,
   ref_range_low, ref_range_high, critical_low, critical_high,
   description, range_source)
VALUES
  ('urine_albumin_creatinine_ratio', 'Urine Albumin-Creatinine Ratio (UACR)', 'kidney', 'mg/g',
   0, 30, 0, NULL,
   'UACR < 30 = normal; 30–300 = microalbuminuria (early CKD); > 300 = macroalbuminuria.',
   'canonical')
ON CONFLICT (name_normalized) DO NOTHING;

-- ── Cardiovascular ────────────────────────────────────────────────────────────

-- Lipoprotein(a) — Lp(a)
-- ESC/EAS 2019: Lp(a) < 50 mg/dL = acceptable; ≥ 50 = elevated CV risk.
-- Desirable < 30 mg/dL (NCEP).
INSERT INTO biomarker_definitions
  (name_normalized, display_name, category, unit,
   ref_range_low, ref_range_high, critical_low, critical_high,
   description, range_source)
VALUES
  ('lp_a', 'Lipoprotein(a)', 'lipid', 'mg/dL',
   0, 30, 0, NULL,
   'Lp(a). Independently associated with cardiovascular risk; not modifiable by statins.',
   'canonical')
ON CONFLICT (name_normalized) DO NOTHING;

-- ApoB (Apolipoprotein B)
-- Optimal: < 90 mg/dL (general); < 80 mg/dL (high-risk patients). AHA/ESC.
-- Gender-neutral range used here; < 90 as normal.
INSERT INTO biomarker_definitions
  (name_normalized, display_name, category, unit,
   ref_range_low, ref_range_high, critical_low, critical_high,
   description, range_source)
VALUES
  ('apob', 'Apolipoprotein B (ApoB)', 'lipid', 'mg/dL',
   40, 90, 20, 200,
   'ApoB. Each LDL, VLDL and IDL particle carries one ApoB; best single marker of atherogenic particle number.',
   'canonical')
ON CONFLICT (name_normalized) DO NOTHING;

-- ApoA1 (Apolipoprotein A-I)
-- Normal: Male 110–180 mg/dL, Female 120–200 mg/dL. (WHO / Mayo)
INSERT INTO biomarker_definitions
  (name_normalized, display_name, category, unit,
   ref_range_low, ref_range_high, critical_low, critical_high,
   ref_range_low_m, ref_range_high_m, ref_range_low_f, ref_range_high_f,
   description, range_source)
VALUES
  ('apoa1', 'Apolipoprotein A-I (ApoA1)', 'lipid', 'mg/dL',
   110, 200, 50, NULL,
   110, 180, 120, 200,
   'ApoA1. Main protein component of HDL; inversely associated with cardiovascular risk.',
   'canonical')
ON CONFLICT (name_normalized) DO NOTHING;
