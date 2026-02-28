import { BIOMARKER_ALIASES } from '../constants/biomarkers';
import { mistralChatService } from '../services/mistral-chat.service';
import { logger } from './logger';

/**
 * Normalize a biomarker name to its canonical form
 * Uses rule-based matching first, then falls back to LLM for unknown names
 */
export class BiomarkerNormalizer {
  /**
   * Normalize a biomarker name using rule-based matching
   * @param name - Raw biomarker name from lab report
   * @returns Normalized biomarker name or null if not found
   */
  private normalizeWithRules(name: string): string | null {
    // Clean and normalize the input
    const cleaned = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[()]/g, '') // Remove parentheses
      .replace(/[-_]/g, ' '); // Replace dashes and underscores with spaces

    // Direct lookup
    if (BIOMARKER_ALIASES[cleaned]) {
      return BIOMARKER_ALIASES[cleaned];
    }

    // Try without special characters
    const withoutSpecial = cleaned.replace(/[^a-z0-9\s]/g, '');
    if (BIOMARKER_ALIASES[withoutSpecial]) {
      return BIOMARKER_ALIASES[withoutSpecial];
    }

    // Try partial matches (for cases like "Glucose (Fasting)" -> "glucose fasting")
    for (const [alias, normalized] of Object.entries(BIOMARKER_ALIASES)) {
      if (cleaned.includes(alias) || alias.includes(cleaned)) {
        return normalized;
      }
    }

    return null;
  }

  /**
   * Normalize a biomarker name using LLM fallback
   * @param name - Raw biomarker name from lab report
   * @param knownBiomarkers - List of known normalized biomarker names from database
   * @returns Normalized biomarker name or the original name if LLM can't match
   */
  private async normalizeWithLLM(
    name: string,
    knownBiomarkers: string[]
  ): Promise<string> {
    try {
      logger.info('Using LLM fallback for biomarker normalization', { name });

      const prompt = `You are a medical lab report analyzer. Given a biomarker name from a lab report, match it to the closest canonical biomarker name from the provided list.

Known biomarker names:
${knownBiomarkers.join(', ')}

Rules:
1. Return ONLY the exact matching canonical name from the list above
2. If no good match exists, return the input name in snake_case format
3. Consider common medical abbreviations and synonyms
4. Do not add explanations or additional text

Biomarker name to normalize: "${name}"

Normalized name:`;

      const response = await mistralChatService.complete(
        [
          {
            role: 'user',
            content: prompt,
          },
        ],
        {
          temperature: 0.1, // Low temperature for consistent matching
          maxTokens: 50,
        }
      );

      const normalized = response.trim().toLowerCase().replace(/\s+/g, '_');

      logger.info('LLM normalization result', {
        original: name,
        normalized,
      });

      return normalized;
    } catch (error) {
      logger.error('LLM normalization failed, using original name', {
        name,
        error,
      });

      // Fallback: convert to snake_case
      return name.toLowerCase().trim().replace(/\s+/g, '_');
    }
  }

  /**
   * Normalize a biomarker name to its canonical form
   * @param name - Raw biomarker name from lab report
   * @param knownBiomarkers - Optional list of known normalized biomarker names from database
   * @returns Normalized biomarker name
   */
  async normalize(
    name: string,
    knownBiomarkers?: string[]
  ): Promise<string> {
    // Try rule-based matching first
    const ruleBasedResult = this.normalizeWithRules(name);

    if (ruleBasedResult) {
      logger.debug('Biomarker normalized with rules', {
        original: name,
        normalized: ruleBasedResult,
      });
      return ruleBasedResult;
    }

    // If no rule match and we have known biomarkers, try LLM
    if (knownBiomarkers && knownBiomarkers.length > 0) {
      return this.normalizeWithLLM(name, knownBiomarkers);
    }

    // Final fallback: convert to snake_case
    const fallback = name.toLowerCase().trim().replace(/\s+/g, '_');

    logger.warn('Biomarker normalization fallback to snake_case', {
      original: name,
      normalized: fallback,
    });

    return fallback;
  }

  /**
   * Normalize multiple biomarker names in batch
   * @param names - Array of raw biomarker names
   * @param knownBiomarkers - Optional list of known normalized biomarker names
   * @returns Array of normalized biomarker names
   */
  async normalizeBatch(
    names: string[],
    knownBiomarkers?: string[]
  ): Promise<string[]> {
    return Promise.all(
      names.map((name) => this.normalize(name, knownBiomarkers))
    );
  }
}

// Export singleton instance
export const biomarkerNormalizer = new BiomarkerNormalizer();
