import { getChatProvider } from './ai-provider';
import { biomarkerRepository } from '../repositories/biomarker.repository';
import { biomarkerNormalizer } from '../utils/biomarker-normalizer';
import { alignUnits, detectAndFixScaleMismatch } from '../utils/unit-normalizer';
import { logger } from '../utils/logger';
import { Biomarker, BiomarkerDefinition, BiomarkerWithDefinition, GenderType } from '../types/domain.types';

/**
 * Pick the correct reference range bounds from a definition given the patient's gender.
 * Gender-specific ranges (canonical) take precedence over the gender-neutral fallback.
 */
export function pickRangeForGender(
  definition: Pick<BiomarkerDefinition, 'refRangeLow' | 'refRangeHigh' | 'refRangeLowM' | 'refRangeHighM' | 'refRangeLowF' | 'refRangeHighF'>,
  gender?: GenderType,
): { refRangeLow?: number; refRangeHigh?: number } {
  if (gender === 'male' && (definition.refRangeLowM != null || definition.refRangeHighM != null)) {
    return { refRangeLow: definition.refRangeLowM, refRangeHigh: definition.refRangeHighM };
  }
  if (gender === 'female' && (definition.refRangeLowF != null || definition.refRangeHighF != null)) {
    return { refRangeLow: definition.refRangeLowF, refRangeHigh: definition.refRangeHighF };
  }
  return { refRangeLow: definition.refRangeLow, refRangeHigh: definition.refRangeHigh };
}

export interface ExtractedBiomarker {
  name: string;
  nameNormalized: string;
  value: number;
  unit: string;
  category?: string;
  refRangeLow?: number;
  refRangeHigh?: number;
  refRangeUnit?: string;
}

export interface BiomarkerExtractionResult {
  biomarkers: ExtractedBiomarker[];
  reportDate?: Date;
}

/** Patient/report metadata extracted from OCR text in a lightweight first pass. */
export interface PatientContext {
  /** Patient sex as printed on the report — used to choose the correct gender-specific reference range column. */
  gender?: 'male' | 'female';
  /** Patient age at time of test, in whole years. */
  ageAtTest?: number;
  /** Name of the lab/diagnostic centre (for logging and provenance). */
  labName?: string;
  /** Date the sample was collected, if printed separately from the report date. */
  collectionDate?: Date;
  /** Full name of the patient as printed on the report — used for cross-report identity validation. */
  patientName?: string;
  /** Patient date of birth as printed on the report — primary anchor for identity validation. */
  patientDob?: Date;
}

export class BiomarkerService {
  /**
   * Extract biomarkers from OCR markdown text using LLM
   * @param ocrMarkdown - Raw OCR markdown output from report
   * @returns Extracted biomarkers and report date
   */
  /**
   * Lightweight first-pass extraction: pull patient metadata from the OCR text
   * without running the full (expensive) biomarker extraction prompt.
   */
  async extractPatientContext(ocrMarkdown: string): Promise<PatientContext> {
    logger.info('Extracting patient context from OCR markdown');

    const prompt = `From the following medical lab report text, extract only the patient metadata listed below.
Return ONLY valid JSON matching this exact structure (use null for any field you cannot find):
{
  "patientName": "full name as printed on the report" or null,
  "patientDob": "YYYY-MM-DD" or null,
  "gender": "male" | "female" | null,
  "ageAtTest": integer or null,
  "labName": "string or null",
  "collectionDate": "YYYY-MM-DD" or null
}

Lab Report Text:
${ocrMarkdown}`;

    try {
      const result = await getChatProvider().extractStructured<{
        patientName?: string | null;
        patientDob?: string | null;
        gender?: 'male' | 'female' | null;
        ageAtTest?: number | null;
        labName?: string | null;
        collectionDate?: string | null;
      }>(prompt, ocrMarkdown, '{ patientName?: string, patientDob?: string, gender?: string, ageAtTest?: number, labName?: string, collectionDate?: string }');

      return {
        patientName: result.patientName ?? undefined,
        patientDob: result.patientDob ? new Date(result.patientDob) : undefined,
        gender: result.gender ?? undefined,
        ageAtTest: result.ageAtTest ?? undefined,
        labName: result.labName ?? undefined,
        collectionDate: result.collectionDate ? new Date(result.collectionDate) : undefined,
      };
    } catch (error) {
      // Non-fatal: missing context just means we extract without it
      logger.warn('Patient context extraction failed, proceeding without it', { error });
      return {};
    }
  }

  async extractFromOCR(ocrMarkdown: string, patientContext?: PatientContext): Promise<BiomarkerExtractionResult> {
    logger.info('Extracting biomarkers from OCR markdown', {
      hasPatientContext: !!patientContext,
      labName: patientContext?.labName,
    });

    const contextBlock = patientContext && (patientContext.gender || patientContext.ageAtTest != null)
      ? `\nPatient context (use when the report prints gender-specific or age-specific reference range columns — pick the column that matches):
- Sex: ${patientContext.gender ?? 'unknown'}
- Age at time of test: ${patientContext.ageAtTest != null ? `${patientContext.ageAtTest} years` : 'unknown'}
- Lab: ${patientContext.labName ?? 'unknown'}\n`
      : '';

    const prompt = `You are a medical lab report analyzer. Extract all biomarker values from the following lab report text.
${contextBlock}

Instructions:
1. Extract ONLY biomarker names, values, units, and reference ranges
2. Include the report date if present
3. Return data as JSON with this exact structure:
{
  "reportDate": "YYYY-MM-DD" or null,
  "biomarkers": [
    {
      "name": "biomarker name exactly as written in the report",
      "nameNormalized": "canonical snake_case identifier (see rules below)",
      "value": numeric value only,
      "unit": "unit of measurement",
      "category": "diabetes|kidney|liver|lipid|thyroid|blood_count|vitamins|hormones|other",
      "refRangeLow": numeric lower bound of reference range or null,
      "refRangeHigh": numeric upper bound of reference range or null,
      "refRangeUnit": "unit of the reference range exactly as written, or null if same as value unit"
    }
  ]
}

Rules:
- Extract ALL biomarkers found in the report
- "name" must preserve the full biomarker name exactly as written in the report
- "nameNormalized" must be a consistent snake_case canonical identifier. The SAME test must ALWAYS get the same nameNormalized regardless of how the lab writes it (e.g., "SGPT", "ALT", "Alanine Aminotransferase" → all get nameNormalized "alt")
- DIFFERENT tests must get DIFFERENT nameNormalized values:
  - Different sample types are different tests: "Serum Albumin" → "albumin", "Urine Albumin" → "urine_albumin"
  - Different subtypes are different tests: "Total Bilirubin" → "total_bilirubin", "Direct Bilirubin" → "direct_bilirubin", "Indirect Bilirubin" → "indirect_bilirubin"
- SKIP qualitative/non-numeric results entirely (e.g., "Present", "Absent", "Positive", "Negative", "+", "++", "Trace") — do NOT convert them to numbers
- SKIP physical/macroscopic observations that are not measured analytes: colour, appearance, turbidity, odour, volume, reaction, deposit, transparency, consistency — these describe the sample, not a biochemical quantity
- Convert numeric values to numbers (remove commas, handle ranges by taking the actual patient value)
- "unit" must be the unit of the patient value exactly as shown (mg/dL, g/dL, %, /μL, etc.)
- Extract reference ranges as raw numbers exactly as printed — do NOT convert or scale them
- "refRangeUnit" must be the unit shown next to the reference range, exactly as written (e.g., "thousand/μL", "×10³/L", "lakhs/μL"). Set to null if the reference range unit is the same as the value unit
- If a biomarker appears multiple times with DIFFERENT measurement methods (e.g. "RBC(Electrical Impedance)" and "RBC(RBC Histogram)"), extract EACH as a separate entry using the full original name — do NOT skip method variants
- If a biomarker row is REPEATED with EXACTLY the same value (a lab summary section restating a result), extract it only once
- Return ONLY valid JSON, no additional text

Preferred canonical names (use these when applicable, invent new snake_case names for tests not listed):
fasting_blood_sugar, hba1c, creatinine, blood_urea_nitrogen, egfr, uric_acid,
alt, ast, alkaline_phosphatase, total_bilirubin, direct_bilirubin, indirect_bilirubin,
albumin, urine_albumin, total_protein, ggt,
total_cholesterol, ldl_cholesterol, hdl_cholesterol, vldl_cholesterol, triglycerides,
tsh, t3, t4, free_t3, free_t4,
hemoglobin, hematocrit, white_blood_cells, rbc, platelets, mcv, mch, mchc,
rdw, rdw_cv, rdw_sd, mpv,
esr, crp,
sodium, potassium, chloride, calcium, magnesium,
vitamin_d, vitamin_b12, folate

Lab Report Text:
${ocrMarkdown}`;

    try {
      const result = await getChatProvider().extractStructured<{
        reportDate?: string;
        biomarkers: ExtractedBiomarker[];
      }>(
        prompt,
        ocrMarkdown,
        '{ reportDate?: string, biomarkers: Array<{ name: string, nameNormalized: string, value: number, unit: string, category?: string, refRangeLow?: number, refRangeHigh?: number, refRangeUnit?: string }> }',
      );

      logger.info('Biomarker extraction successful', {
        count: result.biomarkers?.length || 0,
        reportDate: result.reportDate,
      });

      return {
        biomarkers: result.biomarkers || [],
        reportDate: result.reportDate ? new Date(result.reportDate) : undefined,
      };
    } catch (error) {
      logger.error('Failed to extract biomarkers from OCR', { error });
      throw new Error('Failed to extract biomarkers from report');
    }
  }

  /**
   * Normalize and store biomarkers in the database
   * @param extractedBiomarkers - Biomarkers extracted from OCR
   * @param reportId - Report ID
   * @param userId - User ID
   * @param profileId - Profile ID
   * @param reportDate - Report date (from extraction or user input)
   * @returns Stored biomarkers
   */
  async normalizeAndStore(
    extractedBiomarkers: ExtractedBiomarker[],
    reportId: string,
    userId: string,
    profileId: string,
    reportDate?: Date
  ): Promise<Biomarker[]> {
    logger.info('Normalizing and storing biomarkers', {
      count: extractedBiomarkers.length,
      reportId,
      profileId,
    });

    // Use LLM-provided nameNormalized when available; fall back to normalizer for safety
    const normalizedBiomarkers = extractedBiomarkers.map((biomarker) => {
      const nameNormalized = biomarker.nameNormalized
        ? biomarkerNormalizer.sanitize(biomarker.nameNormalized)
        : biomarkerNormalizer.normalize(biomarker.name);
      const category = biomarker.category;

      // Layer 1: Align ref range units to value units using the LLM-provided refRangeUnit
      let { refRangeLow, refRangeHigh } = alignUnits(
        biomarker.value,
        biomarker.unit,
        biomarker.refRangeLow,
        biomarker.refRangeHigh,
        biomarker.refRangeUnit,
      );

      // Layer 2: Safety net — if value is still wildly outside ref range,
      // try common multipliers to auto-correct
      const safetyCheck = detectAndFixScaleMismatch(biomarker.value, refRangeLow, refRangeHigh);
      if (safetyCheck.corrected) {
        refRangeLow = safetyCheck.refRangeLow;
        refRangeHigh = safetyCheck.refRangeHigh;
      }

      return {
        reportId,
        userId,
        profileId,
        name: biomarker.name,
        nameNormalized,
        category,
        value: biomarker.value,
        unit: biomarker.unit ?? '',
        reportDate,
        refRangeLow,
        refRangeHigh,
      };
    });

    // Deduplicate within this report: remove only when BOTH nameNormalized AND value are
    // identical (a lab summary section repeating values already listed in detail rows).
    // Different values under the same normalized name (e.g. RBC by impedance vs histogram)
    // are distinct method-variant measurements and must be kept.
    const seenKeys = new Set<string>();
    const uniqueBiomarkers = normalizedBiomarkers.filter((b) => {
      // Round to 4 dp so 4.5000 and 4.5 don't produce false positives.
      const key = `${b.nameNormalized}::${Number(b.value).toFixed(4)}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    // Auto-upsert definitions for any biomarker not already in the definitions table.
    // This means we never need a predefined list — definitions grow from real report data.
    await Promise.all(
      uniqueBiomarkers.map(async (b) => {
        const existing = await biomarkerRepository.getDefinition(b.nameNormalized);
        if (!existing) {
          // Build a display name from the raw name (title-case, clean up underscores)
          const displayName = b.name
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());

          await biomarkerRepository.upsertDefinition({
            nameNormalized: b.nameNormalized,
            displayName,
            category: b.category ?? 'other',
            unit: b.unit ?? '',
            refRangeLow: b.refRangeLow,
            refRangeHigh: b.refRangeHigh,
          });

          logger.info('Auto-created biomarker definition', {
            nameNormalized: b.nameNormalized,
            displayName,
          });
        } else if (
          existing.rangeSource !== 'canonical' &&
          existing.refRangeLow == null &&
          existing.refRangeHigh == null &&
          (b.refRangeLow != null || b.refRangeHigh != null)
        ) {
          // Backfill ref ranges into an extracted definition that has none yet.
          // Never update canonical definitions — their ranges come from medical literature.
          await biomarkerRepository.upsertDefinition({
            nameNormalized: b.nameNormalized,
            displayName: existing.displayName,
            category: existing.category ?? b.category ?? 'other',
            unit: existing.unit ?? b.unit ?? '',
            refRangeLow: b.refRangeLow,
            refRangeHigh: b.refRangeHigh,
          });
        }
      })
    );

    // Store in database
    const storedBiomarkers = await biomarkerRepository.createBatch(uniqueBiomarkers);

    logger.info('Biomarkers stored successfully', {
      count: storedBiomarkers.length,
    });

    return storedBiomarkers;
  }

  /**
   * Extract biomarkers from OCR and store them in database
   * @param ocrMarkdown - Raw OCR markdown output
   * @param reportId - Report ID
   * @param userId - User ID
   * @param profileId - Profile ID
   * @param userProvidedDate - Optional user-provided report date
   * @returns Stored biomarkers and extracted report date
   */
  async extractAndStore(
    ocrMarkdown: string,
    reportId: string,
    userId: string,
    profileId: string,
    userProvidedDate?: Date,
    /** Caller-supplied patient context (profile gender/age + first-pass extraction). */
    patientContext?: PatientContext,
  ): Promise<{ biomarkers: Biomarker[]; reportDate?: Date }> {
    logger.info('Extracting and storing biomarkers', {
      reportId,
      profileId,
      hasUserDate: !!userProvidedDate,
      hasPatientContext: !!patientContext,
    });

    // Pass 1 (if not supplied by caller): extract patient context for prompt enrichment.
    // This is a cheap LLM call that extracts gender/age/lab so the main extraction
    // can pick the correct gender-specific reference range column.
    const context = patientContext ?? await this.extractPatientContext(ocrMarkdown);

    // Pass 2: full biomarker extraction with patient context injected
    const extraction = await this.extractFromOCR(ocrMarkdown, context);

    // Priority: user-provided date > extracted date > current date (upload date)
    const reportDate = userProvidedDate || extraction.reportDate || new Date();

    logger.info('Report date determined', {
      reportId,
      source: userProvidedDate
        ? 'user-provided'
        : extraction.reportDate
          ? 'extracted'
          : 'upload-date',
      date: reportDate.toISOString().split('T')[0],
    });

    // Normalize and store biomarkers
    const biomarkers = await this.normalizeAndStore(
      extraction.biomarkers,
      reportId,
      userId,
      profileId,
      reportDate
    );

    return {
      biomarkers,
      reportDate,
    };
  }

  /**
   * Get all biomarkers for a profile
   */
  async getBiomarkersByProfile(profileId: string): Promise<Biomarker[]> {
    return biomarkerRepository.findByProfile(profileId);
  }

  /**
   * Get biomarkers for a profile with definitions
   */
  async getBiomarkersWithDefinitions(profileId: string): Promise<BiomarkerWithDefinition[]> {
    return biomarkerRepository.findByProfileWithDefinitions(profileId);
  }

  /**
   * Get latest biomarkers for a profile (one per biomarker type)
   */
  async getLatestBiomarkers(profileId: string): Promise<BiomarkerWithDefinition[]> {
    return biomarkerRepository.findLatestByProfile(profileId);
  }

  /**
   * Get historical values for a specific biomarker
   */
  async getBiomarkerHistory(
    profileId: string,
    nameNormalized: string
  ): Promise<BiomarkerWithDefinition[]> {
    return biomarkerRepository.findHistoricalValues(profileId, nameNormalized);
  }

  /**
   * Get biomarkers for a specific report
   */
  async getBiomarkersByReport(reportId: string): Promise<Biomarker[]> {
    return biomarkerRepository.findByReport(reportId);
  }

  /**
   * Get biomarkers for a specific report with definitions
   */
  async getBiomarkersByReportWithDefinitions(reportId: string): Promise<BiomarkerWithDefinition[]> {
    return biomarkerRepository.findByReportWithDefinitions(reportId);
  }

  /**
   * Delete biomarkers for a report
   */
  async deleteBiomarkersByReport(reportId: string): Promise<void> {
    return biomarkerRepository.deleteByReport(reportId);
  }

  /**
   * Calculate biomarker status (normal, high, low, borderline)
   */
  calculateStatus(
    value: number,
    definition?: {
      refRangeLow?: number;
      refRangeHigh?: number;
      refRangeLowM?: number;
      refRangeHighM?: number;
      refRangeLowF?: number;
      refRangeHighF?: number;
      criticalLow?: number;
      criticalHigh?: number;
    },
    gender?: GenderType,
  ): 'normal' | 'high' | 'low' | 'borderline' {
    if (!definition) {
      return 'normal';
    }

    // Resolve gender-specific range when available; fall back to gender-neutral.
    const { refRangeLow, refRangeHigh } = gender
      ? pickRangeForGender(definition as BiomarkerDefinition, gender)
      : { refRangeLow: definition.refRangeLow, refRangeHigh: definition.refRangeHigh };

    const { criticalLow, criticalHigh } = definition;

    // Check critical ranges first
    if (criticalLow != null && value < criticalLow) {
      return 'low';
    }
    if (criticalHigh != null && value > criticalHigh) {
      return 'high';
    }

    // Check reference ranges
    if (refRangeLow != null && value < refRangeLow) {
      // Check if it's borderline (within 10% of range)
      const threshold = refRangeLow * 0.9;
      return value >= threshold ? 'borderline' : 'low';
    }

    if (refRangeHigh != null && value > refRangeHigh) {
      // Check if it's borderline (within 10% of range)
      const threshold = refRangeHigh * 1.1;
      return value <= threshold ? 'borderline' : 'high';
    }

    return 'normal';
  }

  /**
   * Calculate trend direction based on historical values
   * @param values - Array of biomarker values ordered by date (oldest to newest)
   * @param definition - Biomarker definition with reference ranges
   * @returns Trend direction: improving, worsening, stable, or new
   */
  calculateTrend(
    values: Array<{ value: number; reportDate?: Date }>,
    definition?: {
      refRangeLow?: number;
      refRangeHigh?: number;
      refRangeLowM?: number;
      refRangeHighM?: number;
      refRangeLowF?: number;
      refRangeHighF?: number;
      criticalLow?: number;
      criticalHigh?: number;
    },
    gender?: GenderType,
  ): 'improving' | 'worsening' | 'stable' | 'new' {
    // Need at least 2 values to calculate trend
    if (values.length < 2) {
      return 'new';
    }

    // Get the last two values
    const previous = values[values.length - 2];
    const current = values[values.length - 1];

    const previousStatus = this.calculateStatus(previous.value, definition, gender);
    const currentStatus  = this.calculateStatus(current.value,  definition, gender);

    // If no reference ranges, use simple value comparison
    if (!definition || (!definition.refRangeLow && !definition.refRangeHigh)) {
      const percentChange = ((current.value - previous.value) / previous.value) * 100;

      // Consider stable if change is less than 5%
      if (Math.abs(percentChange) < 5) {
        return 'stable';
      }

      // For most biomarkers, lower is better (e.g., cholesterol, glucose)
      // This is a simplification - ideally we'd have metadata about this
      return current.value < previous.value ? 'improving' : 'worsening';
    }

    // Status-based trend analysis
    const statusPriority = { normal: 0, borderline: 1, low: 2, high: 2 };
    const previousPriority = statusPriority[previousStatus];
    const currentPriority = statusPriority[currentStatus];

    // Moving toward normal is improving
    if (currentPriority < previousPriority) {
      return 'improving';
    }

    // Moving away from normal is worsening
    if (currentPriority > previousPriority) {
      return 'worsening';
    }

    // Same status - check if values are moving in right direction
    if (currentStatus === 'normal') {
      return 'stable';
    }

    // For high values, decreasing is improving
    if (currentStatus === 'high' || currentStatus === 'borderline') {
      if (current.value < previous.value) {
        return 'improving';
      } else if (current.value > previous.value) {
        return 'worsening';
      }
    }

    // For low values, increasing is improving
    if (currentStatus === 'low') {
      if (current.value > previous.value) {
        return 'improving';
      } else if (current.value < previous.value) {
        return 'worsening';
      }
    }

    return 'stable';
  }

  /**
   * Get biomarker trend data for visualization
   * @param profileId - Profile ID
   * @param nameNormalized - Normalized biomarker name
   * @returns Array of biomarker values with status and trend information
   */
  async getBiomarkerTrend(
    profileId: string,
    nameNormalized: string,
    gender?: GenderType,
  ): Promise<
    Array<{
      value: number;
      unit: string;
      reportDate?: Date;
      status: 'normal' | 'high' | 'low' | 'borderline';
      refRangeLow?: number;
      refRangeHigh?: number;
      trend?: 'improving' | 'worsening' | 'stable' | 'new';
    }>
  > {
    logger.info('Getting biomarker trend', { profileId, nameNormalized });

    // Get historical values with definitions
    const history = await biomarkerRepository.findHistoricalValues(profileId, nameNormalized);

    if (history.length === 0) {
      logger.info('No historical data found for biomarker', {
        profileId,
        nameNormalized,
      });
      return [];
    }

    // Build per-reading effective ranges: per-lab range (from this report) takes
    // precedence over the definition table, which may reflect a different lab's values.
    // When no per-lab range exists, fall back to gender-specific definition range.
    const trendData = history.map((biomarker) => {
      const defRange = biomarker.definition
        ? pickRangeForGender(biomarker.definition, gender)
        : {};
      const effectiveRange = {
        refRangeLow:  biomarker.refRangeLow  ?? defRange.refRangeLow,
        refRangeHigh: biomarker.refRangeHigh ?? defRange.refRangeHigh,
        criticalLow:  biomarker.definition?.criticalLow,
        criticalHigh: biomarker.definition?.criticalHigh,
      };
      const status = this.calculateStatus(biomarker.value, effectiveRange);

      return {
        value: biomarker.value,
        unit: biomarker.unit,
        reportDate: biomarker.reportDate,
        status,
        // Return the ranges used for this reading so the client can draw the reference band
        refRangeLow:  effectiveRange.refRangeLow,
        refRangeHigh: effectiveRange.refRangeHigh,
      };
    });

    // Trend direction is always evaluated against the LATEST reading's effective ranges
    // so all points are compared on the same basis.
    const latest = history[history.length - 1];
    const latestDefRange = latest.definition ? pickRangeForGender(latest.definition, gender) : {};
    const latestEffectiveRange = {
      refRangeLow:  latest.refRangeLow  ?? latestDefRange.refRangeLow,
      refRangeHigh: latest.refRangeHigh ?? latestDefRange.refRangeHigh,
      criticalLow:  latest.definition?.criticalLow,
      criticalHigh: latest.definition?.criticalHigh,
    };

    const trendDataWithTrend = trendData.map((point, index) => {
      if (index === 0) {
        return { ...point, trend: 'new' as const };
      }

      const valuesUpToNow = history.slice(0, index + 1);
      const trend = this.calculateTrend(valuesUpToNow, latestEffectiveRange, gender);

      return { ...point, trend };
    });

    logger.info('Biomarker trend calculated', {
      profileId,
      nameNormalized,
      dataPoints: trendDataWithTrend.length,
    });

    return trendDataWithTrend;
  }
}

// Export singleton instance
export const biomarkerService = new BiomarkerService();
