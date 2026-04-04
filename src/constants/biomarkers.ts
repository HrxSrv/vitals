// Biomarker categories
export const BIOMARKER_CATEGORIES = {
  DIABETES: 'diabetes',
  KIDNEY: 'kidney',
  LIVER: 'liver',
  LIPID: 'lipid',
  THYROID: 'thyroid',
  BLOOD_COUNT: 'blood_count',
  VITAMINS: 'vitamins',
  HORMONES: 'hormones',
  OTHER: 'other',
} as const;

export type BiomarkerCategory = (typeof BIOMARKER_CATEGORIES)[keyof typeof BIOMARKER_CATEGORIES];

/**
 * Small override table to correct known LLM inconsistencies.
 *
 * The LLM does the heavy lifting of normalization during extraction — it
 * understands medical context, sample types, and subtype distinctions.
 * This table only exists to fix cases where the LLM occasionally outputs
 * a different canonical name for the same test across runs.
 *
 * Keys are lowercase snake_case (the format the LLM returns or the sanitizer produces).
 * Values are the canonical name we want stored.
 *
 * Only add entries here when you observe real LLM inconsistency in production logs.
 */
export const BIOMARKER_OVERRIDES: Record<string, string> = {
  // LLM sometimes returns these alternate forms
  sgpt: 'alt',
  sgot: 'ast',
  alat: 'alt',
  asat: 'ast',
  fbs: 'fasting_blood_sugar',
  fasting_glucose: 'fasting_blood_sugar',
  blood_sugar_fasting: 'fasting_blood_sugar',
  hemoglobin_a1c: 'hba1c',
  glycated_hemoglobin: 'hba1c',
  a1c: 'hba1c',
  bun: 'blood_urea_nitrogen',
  urea: 'blood_urea_nitrogen',
  urea_nitrogen: 'blood_urea_nitrogen',
  gfr: 'egfr',
  estimated_gfr: 'egfr',
  alk_phos: 'alkaline_phosphatase',
  ldl: 'ldl_cholesterol',
  ldl_c: 'ldl_cholesterol',
  hdl: 'hdl_cholesterol',
  hdl_c: 'hdl_cholesterol',
  vldl: 'vldl_cholesterol',
  tg: 'triglycerides',
  trigs: 'triglycerides',
  hb: 'hemoglobin',
  hgb: 'hemoglobin',
  haemoglobin: 'hemoglobin',
  hct: 'hematocrit',
  haematocrit: 'hematocrit',
  pcv: 'hematocrit',
  wbc: 'white_blood_cells',
  leukocytes: 'white_blood_cells',
  erythrocytes: 'rbc',
  plt: 'platelets',
  platelet_count: 'platelets',
  sed_rate: 'esr',
  c_reactive_protein: 'crp',
  na: 'sodium',
  k: 'potassium',
  cl: 'chloride',
  ca: 'calcium',
  mg: 'magnesium',
  vit_d: 'vitamin_d',
  vit_b12: 'vitamin_b12',
  folic_acid: 'folate',
  cobalamin: 'vitamin_b12',
  ft3: 'free_t3',
  ft4: 'free_t4',
  thyrotropin: 'tsh',
  microalbumin: 'urine_albumin',
  urine_microalbumin: 'urine_albumin',
  serum_creatinine: 'creatinine',
  serum_albumin: 'albumin',
  urate: 'uric_acid',
  gamma_gt: 'ggt',
  gamma_glutamyl_transferase: 'ggt',
  chol: 'total_cholesterol',
  cholesterol: 'total_cholesterol',
  bilirubin: 'total_bilirubin',
  unconjugated_bilirubin: 'indirect_bilirubin',
};
