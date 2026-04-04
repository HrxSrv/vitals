import { BIOMARKER_OVERRIDES } from '../constants/biomarkers';
import { logger } from './logger';

/**
 * Thin normalizer used as a fallback when the LLM doesn't provide nameNormalized.
 * Primary normalization is now done by the LLM during extraction.
 *
 * This normalizer handles two cases:
 * 1. sanitize() — cleans up an LLM-provided nameNormalized to valid snake_case
 * 2. normalize() — fallback for when nameNormalized is missing; applies a small
 *    override table then converts to snake_case
 */
export class BiomarkerNormalizer {
  /**
   * Sanitize an LLM-provided nameNormalized to ensure valid snake_case.
   * Applies overrides for known LLM inconsistencies.
   */
  sanitize(nameNormalized: string): string {
    const cleaned = nameNormalized
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    // Apply overrides for known LLM inconsistencies
    const overridden = BIOMARKER_OVERRIDES[cleaned];
    if (overridden) {
      logger.debug('Biomarker override applied', { original: cleaned, overridden });
      return overridden;
    }

    return cleaned;
  }

  /**
   * Fallback normalize when the LLM doesn't return nameNormalized.
   * Converts raw biomarker name to snake_case.
   */
  normalize(name: string): string {
    const base = name.toLowerCase().trim().replace(/\s+/g, ' ');

    // Check overrides first
    const overridden = BIOMARKER_OVERRIDES[base];
    if (overridden) {
      logger.debug('Biomarker normalized via override', { original: name, normalized: overridden });
      return overridden;
    }

    // snake_case conversion
    const fallback = base
      .replace(/[()]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/[-]+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    logger.debug('Biomarker normalized to snake_case', { original: name, normalized: fallback });
    return fallback;
  }
}

export const biomarkerNormalizer = new BiomarkerNormalizer();
