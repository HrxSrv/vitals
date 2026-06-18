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
 * Override table to correct known LLM normalization inconsistencies.
 *
 * The LLM does the heavy lifting — it understands medical context, sample
 * types, and subtype distinctions. This table is a safety net for cases
 * where the LLM produces a variant name for a test that already has a
 * canonical nameNormalized in the system.
 *
 * Keys   — lowercase snake_case; what the LLM returns OR what sanitize()
 *           produces after cleaning an LLM-provided nameNormalized.
 * Values — the canonical nameNormalized stored in biomarker_definitions.
 *
 * Rules:
 *  - Only add entries for tests that ARE the same test (same analyte,
 *    same sample type). Do NOT collapse genuinely different tests.
 *  - Absolute cell counts (e.g. absolute_neutrophils) are DIFFERENT from
 *    percentages (neutrophils). Keep them separate.
 *  - hs_crp (high-sensitivity CRP) is a different assay from crp — keep separate.
 *  - Add entries when you observe inconsistency in production extraction logs.
 */
export const BIOMARKER_OVERRIDES: Record<string, string> = {

  // ── Liver enzymes ──────────────────────────────────────────────────────────
  sgpt:                        'alt',
  sgot:                        'ast',
  alat:                        'alt',
  asat:                        'ast',
  alanine_aminotransferase:    'alt',
  alanine_transaminase:        'alt',
  aspartate_aminotransferase:  'ast',
  aspartate_transaminase:      'ast',
  serum_alt:                   'alt',
  serum_ast:                   'ast',
  serum_sgpt:                  'alt',
  serum_sgot:                  'ast',
  alp:                         'alkaline_phosphatase',
  alk_phos:                    'alkaline_phosphatase',
  serum_alp:                   'alkaline_phosphatase',
  gamma_gt:                    'ggt',
  gamma_glutamyl_transferase:  'ggt',
  gamma_glutamyltransferase:   'ggt',
  serum_ggt:                   'ggt',

  // ── Bilirubin ──────────────────────────────────────────────────────────────
  bilirubin:                   'total_bilirubin',
  serum_bilirubin:             'total_bilirubin',
  total_serum_bilirubin:       'total_bilirubin',
  conjugated_bilirubin:        'direct_bilirubin',
  unconjugated_bilirubin:      'indirect_bilirubin',

  // ── Protein / albumin ──────────────────────────────────────────────────────
  serum_albumin:               'albumin',
  serum_total_protein:         'total_protein',
  serum_protein:               'total_protein',
  microalbumin:                'urine_albumin',
  urine_microalbumin:          'urine_albumin',
  spot_urine_albumin:          'urine_albumin',

  // ── Glucose / diabetes ─────────────────────────────────────────────────────
  fbs:                         'fasting_blood_sugar',
  fasting_glucose:             'fasting_blood_sugar',
  blood_sugar_fasting:         'fasting_blood_sugar',
  blood_glucose_fasting:       'fasting_blood_sugar',
  serum_glucose_fasting:       'fasting_blood_sugar',
  rbs:                         'random_blood_sugar',
  blood_sugar_random:          'random_blood_sugar',
  random_glucose:              'random_blood_sugar',
  blood_glucose_random:        'random_blood_sugar',
  ppbs:                        'postprandial_blood_sugar',
  pp2bs:                       'postprandial_blood_sugar',
  postprandial_glucose:        'postprandial_blood_sugar',
  blood_glucose_postprandial:  'postprandial_blood_sugar',
  hemoglobin_a1c:              'hba1c',
  glycated_hemoglobin:         'hba1c',
  glycosylated_hemoglobin:     'hba1c',
  a1c:                         'hba1c',
  hba1_c:                      'hba1c',

  // ── Kidney ─────────────────────────────────────────────────────────────────
  bun:                         'blood_urea_nitrogen',
  urea:                        'blood_urea_nitrogen',
  urea_nitrogen:               'blood_urea_nitrogen',
  serum_urea:                  'blood_urea_nitrogen',
  blood_urea:                  'blood_urea_nitrogen',
  serum_creatinine:            'creatinine',
  s_creatinine:                'creatinine',
  creatinine_serum:            'creatinine',
  gfr:                         'egfr',
  estimated_gfr:               'egfr',
  creatinine_clearance:        'egfr',
  urate:                       'uric_acid',
  serum_uric_acid:             'uric_acid',
  s_uric_acid:                 'uric_acid',

  // ── Lipids ─────────────────────────────────────────────────────────────────
  ldl:                         'ldl_cholesterol',
  ldl_c:                       'ldl_cholesterol',
  hdl:                         'hdl_cholesterol',
  hdl_c:                       'hdl_cholesterol',
  vldl:                        'vldl_cholesterol',
  vldl_c:                      'vldl_cholesterol',
  tg:                          'triglycerides',
  trigs:                       'triglycerides',
  serum_triglycerides:         'triglycerides',
  chol:                        'total_cholesterol',
  cholesterol:                 'total_cholesterol',
  serum_cholesterol:           'total_cholesterol',
  total_lipids:                'total_cholesterol', // approximation only

  // ── Thyroid ────────────────────────────────────────────────────────────────
  ft3:                         'free_t3',
  ft4:                         'free_t4',
  thyrotropin:                 'tsh',
  thyroid_stimulating_hormone: 'tsh',
  serum_tsh:                   'tsh',
  t3_total:                    't3',
  t4_total:                    't4',
  triiodothyronine:            't3',
  thyroxine:                   't4',

  // ── CBC — haemoglobin / haematocrit ────────────────────────────────────────
  hb:                          'hemoglobin',
  hgb:                         'hemoglobin',
  haemoglobin:                 'hemoglobin',
  serum_hemoglobin:            'hemoglobin',
  hct:                         'hematocrit',
  haematocrit:                 'hematocrit',
  pcv:                         'hematocrit',  // packed cell volume
  packed_cell_volume:          'hematocrit',

  // ── CBC — white cells ──────────────────────────────────────────────────────
  wbc:                         'white_blood_cells',
  wbc_count:                   'white_blood_cells',
  leukocytes:                  'white_blood_cells',
  leucocytes:                  'white_blood_cells',
  tlc:                         'white_blood_cells',  // total leucocyte count
  total_leucocyte_count:       'white_blood_cells',
  total_leukocyte_count:       'white_blood_cells',
  total_wbc:                   'white_blood_cells',

  // ── CBC — red cells ────────────────────────────────────────────────────────
  erythrocytes:                'rbc',
  rbc_count:                   'rbc',
  red_blood_cell_count:        'rbc',
  red_cell_count:              'rbc',
  erythrocyte_count:           'rbc',

  // ── CBC — platelets ────────────────────────────────────────────────────────
  plt:                         'platelets',
  platelet_count:              'platelets',
  thrombocytes:                'platelets',

  // ── CBC — indices ──────────────────────────────────────────────────────────
  mean_corpuscular_volume:     'mcv',
  mean_cell_volume:            'mcv',
  mean_corpuscular_hemoglobin: 'mch',
  mean_cell_hemoglobin:        'mch',
  mchc_percent:                'mchc',
  rdw_cv:                      'rdw',   // both report the same concept; some labs say rdw-cv
  red_cell_distribution_width: 'rdw',
  mean_platelet_volume:        'mpv',
  platelet_distribution_width: 'pdw',
  plateletcrit:                'pct',

  // ── Inflammation ───────────────────────────────────────────────────────────
  sed_rate:                    'esr',
  erythrocyte_sedimentation_rate: 'esr',
  westergren_esr:              'esr',
  c_reactive_protein:          'crp',
  crp_quantitative:            'crp',
  // NOTE: hs_crp (high-sensitivity CRP) is a different assay — do NOT merge with crp

  // ── Electrolytes ───────────────────────────────────────────────────────────
  serum_sodium:                'sodium',
  s_sodium:                    'sodium',
  na:                          'sodium',
  serum_potassium:             'potassium',
  s_potassium:                 'potassium',
  k:                           'potassium',
  serum_chloride:              'chloride',
  s_chloride:                  'chloride',
  cl:                          'chloride',
  serum_calcium:               'calcium',
  s_calcium:                   'calcium',
  ca:                          'calcium',
  serum_magnesium:             'magnesium',
  s_magnesium:                 'magnesium',
  mg_ion:                      'magnesium',
  serum_phosphorus:            'phosphorus',
  s_phosphorus:                'phosphorus',
  inorganic_phosphorus:        'phosphorus',
  phosphate:                   'phosphorus',

  // ── Iron studies ───────────────────────────────────────────────────────────
  serum_iron:                  'iron',
  s_iron:                      'iron',
  serum_ferritin:              'ferritin',
  s_ferritin:                  'ferritin',
  tibc_serum:                  'tibc',
  total_iron_binding_capacity: 'tibc',
  uibc_serum:                  'uibc',
  unsaturated_iron_binding_capacity: 'uibc',
  iron_saturation:             'transferrin_saturation',
  percent_transferrin_saturation: 'transferrin_saturation',

  // ── Vitamins ───────────────────────────────────────────────────────────────
  vit_d:                       'vitamin_d',
  vitamin_d3:                  'vitamin_d',
  serum_vitamin_d:             'vitamin_d',
  '25_oh_vitamin_d':           'vitamin_d',
  '25_hydroxyvitamin_d':       'vitamin_d',
  vit_b12:                     'vitamin_b12',
  serum_b12:                   'vitamin_b12',
  cobalamin:                   'vitamin_b12',
  cyanocobalamin:              'vitamin_b12',
  folic_acid:                  'folate',
  serum_folate:                'folate',
  serum_folic_acid:            'folate',
  vitamin_b9:                  'folate',

  // ── hs-CRP ────────────────────────────────────────────────────────────────
  // NOTE: hs_crp stays separate from crp (different assay, different range)
  high_sensitivity_crp:              'hs_crp',
  high_sensitivity_c_reactive_protein: 'hs_crp',
  hs_c_reactive_protein:             'hs_crp',
  hscrp:                             'hs_crp',

  // ── Homocysteine ───────────────────────────────────────────────────────────
  serum_homocysteine:          'homocysteine',
  total_homocysteine:          'homocysteine',
  hcy:                         'homocysteine',

  // ── LDH ───────────────────────────────────────────────────────────────────
  ldh:                         'ldh',
  lactate_dehydrogenase:       'ldh',
  lactic_dehydrogenase:        'ldh',
  lactic_acid_dehydrogenase:   'ldh',

  // ── Coagulation ───────────────────────────────────────────────────────────
  serum_fibrinogen:            'fibrinogen',
  plasma_fibrinogen:           'fibrinogen',
  d_dimers:                    'd_dimer',
  // NOTE: fdp (fibrin degradation products) is broader than d_dimer — do NOT merge

  // ── Absolute CBC counts ────────────────────────────────────────────────────
  // Distinct from percentage differentials (neutrophils %, lymphocytes %, etc.)
  anc:                         'absolute_neutrophils',
  absolute_neutrophil_count:   'absolute_neutrophils',
  neutrophil_absolute:         'absolute_neutrophils',
  alc:                         'absolute_lymphocytes',
  absolute_lymphocyte_count:   'absolute_lymphocytes',
  lymphocyte_absolute:         'absolute_lymphocytes',
  amc:                         'absolute_monocytes',
  absolute_monocyte_count:     'absolute_monocytes',
  monocyte_absolute:           'absolute_monocytes',
  aec:                         'absolute_eosinophils',
  absolute_eosinophil_count:   'absolute_eosinophils',
  eosinophil_absolute:         'absolute_eosinophils',
  absolute_basophil_count:     'absolute_basophils',
  basophil_absolute:           'absolute_basophils',

  // ── Reticulocytes ─────────────────────────────────────────────────────────
  reticulocyte_count:          'reticulocytes',
  retics:                      'reticulocytes',
  reticulocyte_percent:        'reticulocytes',

  // ── Hormones ──────────────────────────────────────────────────────────────
  total_testosterone:          'testosterone',
  serum_testosterone:          'testosterone',
  testosterone_total:          'testosterone',
  serum_prolactin:             'prolactin',
  prl:                         'prolactin',
  serum_cortisol:              'cortisol',
  morning_cortisol:            'cortisol',
  am_cortisol:                 'cortisol',
  hydrocortisone:              'cortisol',
  prostate_specific_antigen:   'psa',
  total_psa:                   'psa',
  psa_total:                   'psa',

  // ── Insulin / metabolic ───────────────────────────────────────────────────
  fasting_insulin:             'insulin_fasting',
  insulin:                     'insulin_fasting',  // most labs measure fasting insulin
  serum_insulin:               'insulin_fasting',
  connecting_peptide:          'c_peptide',
  serum_c_peptide:             'c_peptide',

  // ── Urine ACR ─────────────────────────────────────────────────────────────
  uacr:                        'urine_albumin_creatinine_ratio',
  acr:                         'urine_albumin_creatinine_ratio',
  albumin_creatinine_ratio:    'urine_albumin_creatinine_ratio',
  spot_urine_acr:              'urine_albumin_creatinine_ratio',

  // ── Advanced lipids ───────────────────────────────────────────────────────
  lipoprotein_a:               'lp_a',
  lipoprotein_little_a:        'lp_a',
  apolipoprotein_b:            'apob',
  apo_b:                       'apob',
  apolipoprotein_a1:           'apoa1',
  apolipoprotein_a_1:          'apoa1',
  apo_a1:                      'apoa1',
};
