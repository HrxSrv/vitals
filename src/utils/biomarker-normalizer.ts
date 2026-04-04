import { BIOMARKER_ALIASES } from '../constants/biomarkers';
import { logger } from './logger';

/**
 * Normalize a biomarker name to a consistent snake_case canonical form.
 * Uses alias lookup for well-known names, then falls back to snake_case
 * preserving any method qualifiers in parentheses.
 */
export class BiomarkerNormalizer {
  private normalizeWithRules(name: string): string | null {
    const base = name.toLowerCase().trim().replace(/\s+/g, ' ');

    // 1. Try with parentheses preserved (e.g. "rbc(electrical impedance)")
    if (BIOMARKER_ALIASES[base]) return BIOMARKER_ALIASES[base];

    // 2. Try with dashes/underscores replaced but parentheses kept
    const withSpaces = base.replace(/[-_]/g, ' ');
    if (BIOMARKER_ALIASES[withSpaces]) return BIOMARKER_ALIASES[withSpaces];

    // 3. Try stripping parentheses (e.g. "glucose (fasting)" → "glucose fasting")
    const withoutParens = withSpaces.replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
    if (BIOMARKER_ALIASES[withoutParens]) return BIOMARKER_ALIASES[withoutParens];

    // 4. Try without all special characters
    const withoutSpecial = withoutParens.replace(/[^a-z0-9\s]/g, '');
    if (BIOMARKER_ALIASES[withoutSpecial]) return BIOMARKER_ALIASES[withoutSpecial];

    // 5. Partial match — only when there's no parenthetical qualifier.
    // A name like "RBC(Electrical Impedance)" is a distinct measurement and
    // must NOT be collapsed to the generic "rbc" alias.
    const hasQualifier = /\(/.test(base);
    if (!hasQualifier) {
      let bestMatch: string | null = null;
      let bestLength = 0;
      for (const [alias, normalized] of Object.entries(BIOMARKER_ALIASES)) {
        if (withoutParens.includes(alias) || alias.includes(withoutParens)) {
          if (alias.length > bestLength) {
            bestMatch = normalized;
            bestLength = alias.length;
          }
        }
      }
      if (bestMatch) return bestMatch;
    }

    return null;
  }

  /**
   * Normalize a biomarker name to its canonical snake_case form.
   * Alias lookup runs first; unknown names are converted to snake_case
   * preserving any method qualifier (e.g. "RBC(Electrical Impedance)" → "rbc_electrical_impedance").
   */
  normalize(name: string): string {
    const ruleResult = this.normalizeWithRules(name);
    if (ruleResult) {
      logger.debug('Biomarker normalized with rules', { original: name, normalized: ruleResult });
      return ruleResult;
    }

    // snake_case fallback — preserves qualifier content
    const fallback = name
      .toLowerCase()
      .trim()
      .replace(/[()]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    logger.debug('Biomarker normalized to snake_case', { original: name, normalized: fallback });
    return fallback;
  }

  normalizeBatch(names: string[]): string[] {
    return names.map((n) => this.normalize(n));
  }
}

export const biomarkerNormalizer = new BiomarkerNormalizer();
