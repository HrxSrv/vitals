import { mistralChatService } from './mistral-chat.service';
import { biomarkerRepository } from '../repositories/biomarker.repository';
import { biomarkerNormalizer } from '../utils/biomarker-normalizer';
import { logger } from '../utils/logger';
import { Biomarker, BiomarkerWithDefinition } from '../types/domain.types';

export interface ExtractedBiomarker {
  name: string;
  value: number;
  unit: string;
  category?: string;
}

export interface BiomarkerExtractionResult {
  biomarkers: ExtractedBiomarker[];
  reportDate?: Date;
}

export class BiomarkerService {
  /**
   * Extract biomarkers from OCR markdown text using LLM
   * @param ocrMarkdown - Raw OCR markdown output from report
   * @returns Extracted biomarkers and report date
   */
  async extractFromOCR(
    ocrMarkdown: string
  ): Promise<BiomarkerExtractionResult> {
    logger.info('Extracting biomarkers from OCR markdown');

    const prompt = `You are a medical lab report analyzer. Extract all biomarker values from the following lab report text.

Instructions:
1. Extract ONLY biomarker names, values, and units
2. Include the report date if present
3. Return data as JSON with this exact structure:
{
  "reportDate": "YYYY-MM-DD" or null,
  "biomarkers": [
    {
      "name": "biomarker name as written in report",
      "value": numeric value only,
      "unit": "unit of measurement",
      "category": "diabetes|kidney|liver|lipid|thyroid|blood_count|vitamins|hormones|other" (optional, best guess)
    }
  ]
}

Rules:
- Extract ALL biomarkers found in the report
- Use exact biomarker names as they appear in the report
- Convert values to numbers (remove commas, handle ranges by taking the actual value)
- Include units exactly as shown (mg/dL, g/dL, %, etc.)
- If a biomarker has multiple values, create separate entries
- Ignore reference ranges - only extract actual patient values
- Return ONLY valid JSON, no additional text

Lab Report Text:
${ocrMarkdown}`;

    try {
      const result = await mistralChatService.extractStructured<{
        reportDate?: string;
        biomarkers: ExtractedBiomarker[];
      }>(
        prompt,
        ocrMarkdown,
        '{ reportDate?: string, biomarkers: Array<{ name: string, value: number, unit: string, category?: string }> }'
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

    // Get all known biomarker definitions for LLM fallback
    const definitions = await biomarkerRepository.getAllDefinitions();
    const knownBiomarkers = definitions.map((d) => d.nameNormalized);

    // Normalize biomarker names
    const normalizedBiomarkers = await Promise.all(
      extractedBiomarkers.map(async (biomarker) => {
        const nameNormalized = await biomarkerNormalizer.normalize(
          biomarker.name,
          knownBiomarkers
        );

        // Try to get definition for category if not provided
        let category = biomarker.category;
        if (!category) {
          const definition = await biomarkerRepository.getDefinition(
            nameNormalized
          );
          category = definition?.category;
        }

        return {
          reportId,
          userId,
          profileId,
          name: biomarker.name,
          nameNormalized,
          category,
          value: biomarker.value,
          unit: biomarker.unit,
          reportDate,
        };
      })
    );

    // Store in database
    const storedBiomarkers = await biomarkerRepository.createBatch(
      normalizedBiomarkers
    );

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
    userProvidedDate?: Date
  ): Promise<{ biomarkers: Biomarker[]; reportDate?: Date }> {
    logger.info('Extracting and storing biomarkers', {
      reportId,
      profileId,
      hasUserDate: !!userProvidedDate,
    });

    // Extract biomarkers from OCR
    const extraction = await this.extractFromOCR(ocrMarkdown);

    // Use user-provided date if available, otherwise use extracted date
    const reportDate = userProvidedDate || extraction.reportDate;

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
  async getBiomarkersWithDefinitions(
    profileId: string
  ): Promise<BiomarkerWithDefinition[]> {
    return biomarkerRepository.findByProfileWithDefinitions(profileId);
  }

  /**
   * Get latest biomarkers for a profile (one per biomarker type)
   */
  async getLatestBiomarkers(
    profileId: string
  ): Promise<BiomarkerWithDefinition[]> {
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
      criticalLow?: number;
      criticalHigh?: number;
    }
  ): 'normal' | 'high' | 'low' | 'borderline' {
    if (!definition) {
      return 'normal';
    }

    const { refRangeLow, refRangeHigh, criticalLow, criticalHigh } = definition;

    // Check critical ranges first
    if (criticalLow !== undefined && value < criticalLow) {
      return 'low';
    }
    if (criticalHigh !== undefined && value > criticalHigh) {
      return 'high';
    }

    // Check reference ranges
    if (refRangeLow !== undefined && value < refRangeLow) {
      // Check if it's borderline (within 10% of range)
      const threshold = refRangeLow * 0.9;
      return value >= threshold ? 'borderline' : 'low';
    }

    if (refRangeHigh !== undefined && value > refRangeHigh) {
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
      criticalLow?: number;
      criticalHigh?: number;
    }
  ): 'improving' | 'worsening' | 'stable' | 'new' {
    // Need at least 2 values to calculate trend
    if (values.length < 2) {
      return 'new';
    }

    // Get the last two values
    const previous = values[values.length - 2];
    const current = values[values.length - 1];

    // Calculate statuses
    const previousStatus = this.calculateStatus(previous.value, definition);
    const currentStatus = this.calculateStatus(current.value, definition);

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
    nameNormalized: string
  ): Promise<Array<{
    value: number;
    unit: string;
    reportDate?: Date;
    status: 'normal' | 'high' | 'low' | 'borderline';
    refRangeLow?: number;
    refRangeHigh?: number;
    trend?: 'improving' | 'worsening' | 'stable' | 'new';
  }>> {
    logger.info('Getting biomarker trend', { profileId, nameNormalized });

    // Get historical values with definitions
    const history = await biomarkerRepository.findHistoricalValues(
      profileId,
      nameNormalized
    );

    if (history.length === 0) {
      logger.info('No historical data found for biomarker', {
        profileId,
        nameNormalized,
      });
      return [];
    }

    // Calculate status for each value
    const trendData = history.map((biomarker) => {
      const status = this.calculateStatus(biomarker.value, biomarker.definition);

      return {
        value: biomarker.value,
        unit: biomarker.unit,
        reportDate: biomarker.reportDate,
        status,
        refRangeLow: biomarker.definition?.refRangeLow,
        refRangeHigh: biomarker.definition?.refRangeHigh,
      };
    });

    // Calculate trend for each point (except the first one)
    const trendDataWithTrend = trendData.map((point, index) => {
      if (index === 0) {
        return { ...point, trend: 'new' as const };
      }

      // Get all values up to this point
      const valuesUpToNow = history.slice(0, index + 1);
      const trend = this.calculateTrend(valuesUpToNow, history[0].definition);

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
