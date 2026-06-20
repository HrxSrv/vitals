/**
 * Unit-dimension classification — TypeScript mirror of the SQL functions in
 * migration 20260620000000_biomarker_unit_integrity.sql.
 *
 * The database trigger is the authoritative gate (it runs regardless of which
 * code path writes a biomarker). This module exists so the application layer can
 * reason about the same rules for observability, tests, and the future resolver
 * — KEEP THE TWO IN SYNC. If you change a rule here, change the SQL too.
 *
 * Principle: classification is conservative. Anything unrecognised maps to
 * 'unknown', and a pair is considered compatible whenever either side is
 * unknown — so the gate only ever acts on a *confident* dimensional mismatch
 * and never false-quarantines a legitimate but unusual unit.
 */

/**
 * Collapse the lab-report notation zoo to a comparable form: casing, micro-sign
 * variants (µ U+00B5 / μ U+03BC), unicode superscripts, ×/^/* exponent markers,
 * whitespace, and "gm" -> "g".
 */
export function normalizeUnit(raw: string | null | undefined): string {
  let v = (raw ?? '').toLowerCase();
  // micro signs -> u ; drop multiplication dot / cross
  v = v.replace(/[µμ]/g, 'u').replace(/[×·]/g, '');
  // unicode superscripts -> ascii digits
  const supers: Record<string, string> = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
    '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  };
  v = v.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => supers[c] ?? '');
  // drop exponent markers and stray 'x' (e.g. "x 10^3" -> "103")
  v = v.replace(/[\^*x]/g, '');
  v = v.replace(/\s+/g, '');
  // "gm" is just grams
  v = v.replace(/gm/g, 'g');
  return v;
}

/**
 * Classify a raw unit string into a physical-quantity dimension token.
 * Returns 'unknown' for anything unrecognised.
 */
export function unitDimension(raw: string | null | undefined): string {
  const v = normalizeUnit(raw);

  if (['', '-', '--', 'na', 'n/a', 'nil'].includes(v)) return 'unknown';
  if (['ratio', 'index', 'indexvalue'].includes(v)) return 'dimensionless';
  if (v === '%') return 'percent';

  if (/ml\/min/.test(v)) return 'egfr_rate';
  if (/^mm\/h/.test(v)) return 'esr_rate';

  // Mass concentration (prefix-sensitive: mg/dL is NOT µg/dL)
  if (['mg/dl', 'mg%', 'mg/100ml'].includes(v)) return 'mg_per_dl';
  if (['g/dl', 'g%', 'g/100ml'].includes(v)) return 'g_per_dl';
  if (v === 'ug/dl') return 'ug_per_dl';
  if (v === 'ng/dl') return 'ng_per_dl';
  if (v === 'pg/dl') return 'pg_per_dl';
  if (v === 'ng/ml') return 'ng_per_ml';
  if (v === 'pg/ml') return 'pg_per_ml';
  if (v === 'ug/ml') return 'ug_per_ml';
  if (v === 'mg/ml') return 'mg_per_ml';
  if (v === 'ug/l') return 'ug_per_l';
  if (v === 'ng/l') return 'ng_per_l';
  if (v === 'mg/l') return 'mg_per_l';
  if (v === 'g/l') return 'g_per_l';

  // Absolute mass
  if (v === 'pg') return 'mass_pg';
  if (v === 'ng') return 'mass_ng';

  // Cell/particle volume (1 µm³ == 1 fL)
  if (['fl', 'um3'].includes(v)) return 'vol_fl';
  if (v === 'ml') return 'vol_ml';
  if (v === 'l') return 'vol_l';

  // Enzyme / hormone activity
  if (/^i?u\/l$/.test(v)) return 'activity_per_l';
  if (/iu\/ml$/.test(v)) return 'activity_iu_per_ml';
  if (v === 'u/ml') return 'activity_per_ml';

  // Molar / equivalent concentration (mEq/L == mmol/L for monovalent ions)
  if (['meq/l', 'mmol/l'].includes(v)) return 'molar_per_l';
  if (v === 'umol/l') return 'umol_per_l';
  if (v === 'mol/l') return 'mol_per_l';

  // Count per microscopic field
  if (/\/(hpf|lpf)$/.test(v)) return 'per_hpf';

  // Count per volume (all magnitudes collapse to one token)
  if (/(million|thou|lakh|lac)/.test(v)) return 'count_per_vol';
  if (/10(2|3|6|9|12)\/(ul|l)$/.test(v)) return 'count_per_vol';
  if (/^[0-9]+\/(ul|l)$/.test(v)) return 'count_per_vol';
  if (/\/(ul|cumm|cmm|mm3)$/.test(v)) return 'count_per_vol';
  if (/^k\/ul$/.test(v)) return 'count_per_vol';
  if (/cells/.test(v)) return 'count_per_vol';

  return 'unknown';
}

/**
 * Two units are compatible if they share a dimension, or if either is unknown.
 */
export function unitsCompatible(unitA: string | null | undefined, unitB: string | null | undefined): boolean {
  const da = unitDimension(unitA);
  const db = unitDimension(unitB);
  return da === 'unknown' || db === 'unknown' || da === db;
}
