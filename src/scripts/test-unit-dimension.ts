#!/usr/bin/env tsx
/**
 * Validates the unit-dimension classifier (src/utils/unit-dimension.ts), which
 * mirrors the SQL gate in migration 20260620000000_biomarker_unit_integrity.sql.
 *
 * Cases are drawn from the REAL unit strings present in production biomarkers,
 * including the confirmed Type-I contaminations. Run: pnpm test:units
 */
import { unitDimension, unitsCompatible } from '../utils/unit-dimension';

let pass = 0;
let fail = 0;

function eq(label: string, got: unknown, want: unknown) {
  if (got === want) {
    pass++;
  } else {
    fail++;
    console.error(`  ✗ ${label}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
}

// ── Notation variants must collapse to the SAME dimension ───────────────────
console.log('Notation variants (must be equal):');
eq('mg/dL == mg/dl', unitDimension('mg/dL'), unitDimension('mg/dl'));
eq('mg/dL == mg %', unitDimension('mg/dL'), unitDimension('mg %'));
eq('g/dL == gm/dL', unitDimension('g/dL'), unitDimension('gm/dL'));
eq('g/dL == gm %', unitDimension('g/dL'), unitDimension('gm %'));
eq('g/dL == G%', unitDimension('g/dL'), unitDimension('G%'));
eq('µg/dL == μg/dL (micro variants)', unitDimension('µg/dL'), unitDimension('μg/dL'));
eq('fL == fl', unitDimension('fL'), unitDimension('fl'));
eq('fL == µm³', unitDimension('fL'), unitDimension('µm³'));
eq('U/L == IU/L', unitDimension('U/L'), unitDimension('IU/L'));
eq('mm/hr == mm/h', unitDimension('mm/hr'), unitDimension('mm/h'));
eq('mm/hr == mm/hour', unitDimension('mm/hr'), unitDimension('mm/hour'));
eq('mEq/L == mmol/L (monovalent)', unitDimension('mEq/L'), unitDimension('mmol/L'));
eq('thou/mm3 == 10^3/μL', unitDimension('thou/mm3'), unitDimension('10^3/μL'));
eq('1000/µL == X 10³ / μL', unitDimension('1000/µL'), unitDimension('X 10³ / μL'));
eq('10^9/L == thousand/μL', unitDimension('10^9/L'), unitDimension('thousand/μL'));
eq('million/μL == millions/cumm', unitDimension('million/μL'), unitDimension('millions/cumm'));
eq('/Cmm == /μL', unitDimension('/Cmm'), unitDimension('/μL'));
eq('µIU/mL == μIU/mL', unitDimension('µIU/mL'), unitDimension('μIU/mL'));

// ── Exact dimension tokens ──────────────────────────────────────────────────
console.log('Exact tokens:');
eq("mg/dL", unitDimension('mg/dL'), 'mg_per_dl');
eq("µg/dL", unitDimension('µg/dL'), 'ug_per_dl');
eq("U/L", unitDimension('U/L'), 'activity_per_l');
eq("pg", unitDimension('pg'), 'mass_pg');
eq("g/dL", unitDimension('g/dL'), 'g_per_dl');
eq("%", unitDimension('%'), 'percent');
eq("/HPF", unitDimension('/HPF'), 'per_hpf');
eq("mEq/L", unitDimension('mEq/L'), 'molar_per_l');
eq("Ratio", unitDimension('Ratio'), 'dimensionless');
eq("empty -> unknown", unitDimension(''), 'unknown');
eq("dash -> unknown", unitDimension('-'), 'unknown');
eq("Ehrlich unit/dL -> unknown", unitDimension('Ehrlich unit/dL'), 'unknown');

// ── Confirmed Type-I contaminations MUST be incompatible (-> quarantine) ─────
console.log('Type-I contaminations (must be INCOMPATIBLE):');
const incompat: Array<[string, string, string]> = [
  ['ast', 'U/L', 'mg/dL'],          // Fasting Blood Sugar filed under AST
  ['ast', 'U/L', '/HPF'],           // urinary "Cast" filed under AST
  ['calcium', 'mg/dL', 'μg/dL'],    // TIBC/UIBC (iron) filed under calcium
  ['mch', 'pg', 'g/dL'],            // MCHC filed under MCH
  ['hba1c', '%', 'mg/dL'],          // estimated avg glucose filed under HbA1c
  ['sodium', 'mEq/L', 'mg/dL'],     // Lipoprotein(a) filed under sodium
  ['mcv', 'fL', 'mL'],              // urine Volume filed under MCV
  ['wbc_count', 'thousand/μL', '/HPF'], // pus cells filed under WBC
  ['mpv', 'fL', '%'],               // stray % filed under MPV
  ['ldl_cholesterol', 'mg/dL', 'Ratio'], // HDL/LDL ratio filed under LDL
  ['neutrophils', '%', '10^3/μl'],  // absolute count filed under %-differential
];
for (const [slug, catalog, contaminant] of incompat) {
  eq(`${slug}: ${catalog} vs ${contaminant}`, unitsCompatible(contaminant, catalog), false);
}

// ── Legitimate values MUST stay compatible (no false quarantine) ────────────
console.log('Legitimate (must be COMPATIBLE):');
const compat: Array<[string, string, string]> = [
  ['chloride', 'mEq/L', 'mmol/L'],          // real electrolyte notation variant
  ['iron', 'μg/dL', 'µg/dL'],               // micro-sign variant
  ['hemoglobin', 'g/dL', 'gm %'],           // gram-percent
  ['mcv', 'fL', 'fl'],                       // casing
  ['mpv', 'fL', 'µm³'],                      // µm³ == fL
  ['absolute_eosinophils', 'thou/mm3', '10^3/μL'], // count notation variant
  ['egfr', 'mL/min/1.73m²', 'ml/min'],      // eGFR variant
  ['ag_ratio', 'ratio', ''],                 // missing unit on a ratio -> pass
  ['blood_urea_nitrogen', 'mg/dL', 'mg/dl'], // casing
];
for (const [slug, catalog, value] of compat) {
  eq(`${slug}: ${catalog} vs ${value}`, unitsCompatible(value, catalog), true);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
