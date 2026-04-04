import { logger } from './logger';

/**
 * Multiplier patterns found in lab reference ranges.
 * Maps a unit‐prefix/modifier to the factor that converts it to the base unit.
 *
 * Example: "thousand/μL" → base unit is "/μL", multiplier is 1000.
 * If the value is in "/μL" (348000) and the ref range is in "thousand/μL" (150–400),
 * we multiply the ref range by 1000 → 150000–400000.
 */
const UNIT_MULTIPLIERS: Array<{ pattern: RegExp; multiplier: number }> = [
  // "thousand", "×10³", "10^3", "10*3", "K" prefix
  { pattern: /thousand|×\s*10\s*[³3]|10\s*[\^*]\s*3|\bk\//i, multiplier: 1e3 },
  // "million", "×10⁶", "10^6", "M" prefix
  { pattern: /million|×\s*10\s*[⁶6]|10\s*[\^*]\s*6/i, multiplier: 1e6 },
  // "lakh" / "lakhs" (Indian lab reports: 1 lakh = 100,000)
  { pattern: /lakhs?/i, multiplier: 1e5 },
  // "×10²", "10^2", "hundred"
  { pattern: /hundred|×\s*10\s*[²2]|10\s*[\^*]\s*2/i, multiplier: 1e2 },
  // "×10⁹", "10^9" (e.g., WBC in 10⁹/L)
  { pattern: /×\s*10\s*[⁹9]|10\s*[\^*]\s*9/i, multiplier: 1e9 },
  // "×10¹²", "10^12" (e.g., RBC in 10¹²/L)
  { pattern: /×\s*10\s*[¹1][²2]|10\s*[\^*]\s*12/i, multiplier: 1e12 },
];

/**
 * Extract the multiplier embedded in a unit string.
 * Returns 1 if no multiplier is found (base unit).
 */
function extractMultiplier(unit: string): number {
  for (const { pattern, multiplier } of UNIT_MULTIPLIERS) {
    if (pattern.test(unit)) return multiplier;
  }
  return 1;
}

export interface UnitAlignmentResult {
  value: number;
  refRangeLow?: number;
  refRangeHigh?: number;
  unit: string;
  corrected: boolean;
}

/**
 * Align the value and reference range to the same unit scale.
 *
 * The LLM extracts the value and ref range as raw numbers from the report,
 * but they may be in different scales (e.g., value=348000 /μL, range=150–400 thousand/μL).
 *
 * Strategy: if `refRangeUnit` differs from `valueUnit` by a known multiplier,
 * scale the reference range to match the value's unit.
 */
export function alignUnits(
  value: number,
  valueUnit: string,
  refRangeLow: number | undefined,
  refRangeHigh: number | undefined,
  refRangeUnit?: string,
): UnitAlignmentResult {
  if (refRangeLow === undefined && refRangeHigh === undefined) {
    return { value, refRangeLow, refRangeHigh, unit: valueUnit, corrected: false };
  }

  // If no separate ref unit provided, assume same as value unit
  if (!refRangeUnit || refRangeUnit === valueUnit) {
    return { value, refRangeLow, refRangeHigh, unit: valueUnit, corrected: false };
  }

  const valueMultiplier = extractMultiplier(valueUnit);
  const refMultiplier = extractMultiplier(refRangeUnit);

  if (valueMultiplier === refMultiplier) {
    return { value, refRangeLow, refRangeHigh, unit: valueUnit, corrected: false };
  }

  // Scale ref range to match value's unit
  // If value is in /μL (multiplier=1) and ref is in thousand/μL (multiplier=1000),
  // ref values need to be multiplied by (refMultiplier / valueMultiplier)
  const scaleFactor = refMultiplier / valueMultiplier;

  const alignedLow = refRangeLow !== undefined ? refRangeLow * scaleFactor : undefined;
  const alignedHigh = refRangeHigh !== undefined ? refRangeHigh * scaleFactor : undefined;

  logger.info('Unit scale mismatch corrected', {
    valueUnit,
    refRangeUnit,
    scaleFactor,
    original: { refRangeLow, refRangeHigh },
    corrected: { refRangeLow: alignedLow, refRangeHigh: alignedHigh },
  });

  return {
    value,
    refRangeLow: alignedLow,
    refRangeHigh: alignedHigh,
    unit: valueUnit,
    corrected: true,
  };
}

/**
 * Safety-net heuristic: detect when value and ref range are likely in different scales
 * even when we don't have a separate refRangeUnit.
 *
 * If the value is >100× outside the reference range, try common multipliers (1000, 100000).
 * If one of them brings the value inside the range, apply the correction.
 *
 * Returns corrected refRangeLow/refRangeHigh, or the originals if no fix was found.
 */
export function detectAndFixScaleMismatch(
  value: number,
  refRangeLow: number | undefined,
  refRangeHigh: number | undefined,
): { refRangeLow?: number; refRangeHigh?: number; corrected: boolean } {
  if (refRangeLow === undefined && refRangeHigh === undefined) {
    return { refRangeLow, refRangeHigh, corrected: false };
  }

  // Check if value is wildly outside the reference range
  const isWayAbove = refRangeHigh !== undefined && value > refRangeHigh * 100;
  const isWayBelow = refRangeLow !== undefined && refRangeLow > 0 && value < refRangeLow / 100;

  if (!isWayAbove && !isWayBelow) {
    return { refRangeLow, refRangeHigh, corrected: false };
  }

  // Try common multipliers
  const COMMON_MULTIPLIERS = [1e3, 1e5, 1e6, 1e2, 1e9];

  for (const multiplier of COMMON_MULTIPLIERS) {
    const scaledLow = refRangeLow !== undefined ? refRangeLow * multiplier : undefined;
    const scaledHigh = refRangeHigh !== undefined ? refRangeHigh * multiplier : undefined;

    const inRange =
      (scaledLow === undefined || value >= scaledLow * 0.5) &&
      (scaledHigh === undefined || value <= scaledHigh * 2);

    if (inRange) {
      logger.warn('Scale mismatch auto-corrected by safety net', {
        value,
        original: { refRangeLow, refRangeHigh },
        multiplier,
        corrected: { refRangeLow: scaledLow, refRangeHigh: scaledHigh },
      });

      return { refRangeLow: scaledLow, refRangeHigh: scaledHigh, corrected: true };
    }
  }

  // No multiplier worked — flag but don't alter
  logger.warn('Possible scale mismatch but no correction found', {
    value,
    refRangeLow,
    refRangeHigh,
  });

  return { refRangeLow, refRangeHigh, corrected: false };
}
