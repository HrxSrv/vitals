import { logger } from './logger';
import { Biomarker } from '../types/domain.types';

/**
 * LHM Validator
 * 
 * Validates Living Health Markdown documents to ensure:
 * - All required sections are present
 * - No data loss occurred during merge
 * - New data is properly included
 * - Token count is within limits
 * 
 * Based on validation requirements from lhm.md section 9
 */

export interface LHMValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  checks: {
    hasRequiredSections: boolean;
    hasNewData: boolean;
    noDataLoss: boolean;
    withinTokenLimit: boolean;
    noSignificantShrinkage: boolean;
  };
}

export interface LHMValidationOptions {
  /**
   * Maximum allowed tokens before triggering compression
   * Default: 8000 (warning at 4000)
   */
  maxTokens?: number;

  /**
   * Minimum allowed shrinkage ratio (new/old)
   * Default: 0.7 (30% shrinkage allowed)
   */
  minShrinkageRatio?: number;

  /**
   * Whether to check for historical dates preservation
   * Default: true
   */
  checkHistoricalDates?: boolean;

  /**
   * Whether to fail validation on warnings
   * Default: false
   */
  strictMode?: boolean;
}

/**
 * Required sections that must be present in every LHM document
 */
const REQUIRED_SECTIONS = [
  '## Patient Profile',
  '## Current Health Snapshot',
  '## Historical Trends',
  '## Key Observations',
  '## Report Log',
] as const;

/**
 * Validate LHM document structure and content
 * 
 * @param newMarkdown - The newly generated LHM markdown
 * @param oldMarkdown - The previous LHM markdown (for comparison)
 * @param newBiomarkers - Newly added biomarkers that should appear in the document
 * @param tokenEstimator - Function to estimate token count
 * @param options - Validation options
 * @returns Validation result with detailed checks
 */
export function validateLHM(
  newMarkdown: string,
  oldMarkdown: string,
  newBiomarkers: Biomarker[],
  tokenEstimator: (text: string) => number,
  options: LHMValidationOptions = {}
): LHMValidationResult {
  const {
    maxTokens = 8000,
    minShrinkageRatio = 0.7,
    checkHistoricalDates = true,
    strictMode = false,
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];
  const checks = {
    hasRequiredSections: false,
    hasNewData: false,
    noDataLoss: false,
    withinTokenLimit: false,
    noSignificantShrinkage: false,
  };

  try {
    // Check 1: Structure validation - all required sections present
    checks.hasRequiredSections = validateStructure(newMarkdown, errors);

    // Check 2: New data inclusion - verify new biomarkers appear in document
    checks.hasNewData = validateNewData(newMarkdown, newBiomarkers, errors);

    // Check 3: Data loss check - verify old dates still present
    if (checkHistoricalDates) {
      checks.noDataLoss = validateNoDataLoss(newMarkdown, oldMarkdown, errors);
    } else {
      checks.noDataLoss = true; // Skip check
    }

    // Check 4: Token count validation
    checks.withinTokenLimit = validateTokenCount(
      newMarkdown,
      tokenEstimator,
      maxTokens,
      errors,
      warnings
    );

    // Check 5: Shrinkage check - ensure document hasn't lost significant content
    checks.noSignificantShrinkage = validateShrinkage(
      newMarkdown,
      oldMarkdown,
      tokenEstimator,
      minShrinkageRatio,
      errors
    );

    // Determine overall validity
    const allChecksPass = Object.values(checks).every((check) => check === true);
    const hasErrors = errors.length > 0;
    const hasWarnings = warnings.length > 0;

    const isValid = allChecksPass && !hasErrors && (!strictMode || !hasWarnings);

    if (!isValid) {
      logger.warn('LHM validation failed', {
        checks,
        errors,
        warnings,
      });
    } else {
      logger.info('LHM validation passed', {
        checks,
        warnings: warnings.length > 0 ? warnings : undefined,
      });
    }

    return {
      isValid,
      errors,
      warnings,
      checks,
    };
  } catch (error) {
    logger.error('LHM validation error', { error });
    return {
      isValid: false,
      errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings,
      checks,
    };
  }
}

/**
 * Validate that all required sections are present in the markdown
 */
function validateStructure(markdown: string, errors: string[]): boolean {
  const missingSections = REQUIRED_SECTIONS.filter(
    (section) => !markdown.includes(section)
  );

  if (missingSections.length > 0) {
    errors.push(
      `Missing required sections: ${missingSections.join(', ')}`
    );
    return false;
  }

  return true;
}

/**
 * Validate that new biomarker data appears in the document
 */
function validateNewData(
  markdown: string,
  newBiomarkers: Biomarker[],
  errors: string[]
): boolean {
  if (newBiomarkers.length === 0) {
    // No new biomarkers to validate (e.g., during compression)
    return true;
  }

  const missingBiomarkers: string[] = [];

  for (const biomarker of newBiomarkers) {
    const valueStr = biomarker.value.toString();
    const nameStr = biomarker.name;

    // Check if either the value or the biomarker name appears in the document
    // This is a lenient check since the LLM might format values differently
    if (!markdown.includes(valueStr) && !markdown.includes(nameStr)) {
      missingBiomarkers.push(`${nameStr}: ${valueStr}`);
    }
  }

  if (missingBiomarkers.length > 0) {
    errors.push(
      `New biomarker data not found in document: ${missingBiomarkers.join(', ')}`
    );
    return false;
  }

  return true;
}

/**
 * Validate that historical dates from old document are still present
 * This ensures no data loss during merge operations
 */
function validateNoDataLoss(
  newMarkdown: string,
  oldMarkdown: string,
  errors: string[]
): boolean {
  // Extract dates from Historical Trends tables
  const oldDates = extractDatesFromTrends(oldMarkdown);
  const newDates = extractDatesFromTrends(newMarkdown);

  // Check if all old dates are still present in new document
  const missingDates = oldDates.filter((date) => !newDates.includes(date));

  if (missingDates.length > 0) {
    errors.push(
      `Historical dates missing from new document: ${missingDates.join(', ')}`
    );
    return false;
  }

  return true;
}

/**
 * Validate token count is within acceptable limits
 */
function validateTokenCount(
  markdown: string,
  tokenEstimator: (text: string) => number,
  maxTokens: number,
  errors: string[],
  warnings: string[]
): boolean {
  const tokens = tokenEstimator(markdown);

  // Hard limit check
  if (tokens > maxTokens) {
    errors.push(
      `Document exceeds maximum token limit: ${tokens} > ${maxTokens}`
    );
    return false;
  }

  // Warning threshold (50% of max)
  const warningThreshold = maxTokens / 2;
  if (tokens > warningThreshold) {
    warnings.push(
      `Document approaching token limit: ${tokens} tokens (threshold: ${warningThreshold})`
    );
  }

  return true;
}

/**
 * Validate that document hasn't shrunk significantly
 * Significant shrinkage indicates potential data loss
 */
function validateShrinkage(
  newMarkdown: string,
  oldMarkdown: string,
  tokenEstimator: (text: string) => number,
  minShrinkageRatio: number,
  errors: string[]
): boolean {
  const oldTokens = tokenEstimator(oldMarkdown);
  const newTokens = tokenEstimator(newMarkdown);

  // Skip check if old document is empty or skeleton
  if (oldTokens < 100 || oldMarkdown.includes('No reports uploaded yet')) {
    return true;
  }

  const shrinkageRatio = newTokens / oldTokens;

  if (shrinkageRatio < minShrinkageRatio) {
    errors.push(
      `Document shrunk significantly: ${oldTokens} → ${newTokens} tokens (${(shrinkageRatio * 100).toFixed(1)}% of original)`
    );
    return false;
  }

  return true;
}

/**
 * Extract dates from Historical Trends tables
 * Looks for date patterns in markdown tables (YYYY-MM-DD format)
 */
function extractDatesFromTrends(markdown: string): string[] {
  const dates: string[] = [];

  // Find the Historical Trends section
  const trendsMatch = markdown.match(/## Historical Trends([\s\S]*?)(?=##|$)/);
  if (!trendsMatch) {
    return dates;
  }

  const trendsSection = trendsMatch[1];

  // Match date patterns: YYYY-MM-DD
  // This regex looks for dates in table rows (after pipe characters)
  const datePattern = /\|\s*(\d{4}-\d{2}-\d{2})\s*\|/g;
  let match;

  while ((match = datePattern.exec(trendsSection)) !== null) {
    const date = match[1];
    if (!dates.includes(date)) {
      dates.push(date);
    }
  }

  return dates.sort();
}

/**
 * Quick validation for basic structure only
 * Useful for fast checks without full validation
 */
export function validateLHMStructure(markdown: string): boolean {
  return REQUIRED_SECTIONS.every((section) => markdown.includes(section));
}

/**
 * Check if LHM needs compression based on token count
 */
export function needsCompression(
  markdown: string,
  tokenEstimator: (text: string) => number,
  threshold: number = 4000
): boolean {
  const tokens = tokenEstimator(markdown);
  return tokens > threshold;
}

/**
 * Extract metadata from LHM document
 * Useful for quick checks and monitoring
 */
export interface LHMMetadata {
  lastUpdated?: string;
  reportsOnFile?: number;
  lastCheckup?: string;
  estimatedTokens?: number;
}

export function extractLHMMetadata(
  markdown: string,
  tokenEstimator?: (text: string) => number
): LHMMetadata {
  const metadata: LHMMetadata = {};

  // Extract Last Updated
  const lastUpdatedMatch = markdown.match(/\*\*Last Updated:\*\*\s*(.+)/);
  if (lastUpdatedMatch) {
    metadata.lastUpdated = lastUpdatedMatch[1].trim();
  }

  // Extract Reports on File
  const reportsMatch = markdown.match(/\*\*Reports on File:\*\*\s*(\d+)/);
  if (reportsMatch) {
    metadata.reportsOnFile = parseInt(reportsMatch[1], 10);
  }

  // Extract Last Checkup
  const checkupMatch = markdown.match(/\*\*Last Checkup:\*\*\s*(.+)/);
  if (checkupMatch) {
    metadata.lastCheckup = checkupMatch[1].trim();
  }

  // Estimate tokens if estimator provided
  if (tokenEstimator) {
    metadata.estimatedTokens = tokenEstimator(markdown);
  }

  return metadata;
}
