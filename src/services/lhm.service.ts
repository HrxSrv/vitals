import { lhmRepository } from '../repositories/lhm.repository';
import { biomarkerRepository } from '../repositories/biomarker.repository';
import { mistralChatService } from './mistral-chat.service';
import { logger } from '../utils/logger';
import { HttpError } from '../utils/httpError';
import { LHMDocument, Biomarker, BiomarkerWithDefinition } from '../types/domain.types';
import {
  LHM_FIRST_REPORT_PROMPT,
  LHM_MERGE_PROMPT,
} from '../constants/lhm-templates';
import { validateLHM, needsCompression as checkNeedsCompression } from '../utils/lhm-validator';

/**
 * LHM Service
 * Handles Living Health Markdown document operations
 * Manages LHM initialization, merging, and validation
 * 
 * ## LHM Merge Logic Overview
 * 
 * The LHM merge process follows these steps:
 * 
 * 1. **First Report (Initial Population)**
 *    - Fills in the "Current Health Snapshot" with all biomarkers
 *    - Categorizes each biomarker as 🔴 Needs Attention, 🟡 Borderline, or 🟢 Normal
 *    - Sets all trends to "→ New" since this is the first data point
 *    - Creates the first row in each relevant "Historical Trends" panel
 *    - Generates "Key Observations & Concerns" based on the data
 *    - Infers "Known Conditions" from biomarker values
 *    - Updates the "Report Log" with the first report
 *    - Updates metadata (last updated, report count, etc.)
 * 
 * 2. **Subsequent Reports (Merge)**
 *    - Updates "Current Health Snapshot" with latest values
 *    - Recategorizes biomarkers based on new values
 *    - Updates trend indicators by comparing with previous values:
 *      * ↑ Worsening (moving further from normal)
 *      * ↓ Improving (moving toward normal)
 *      * → Stable (minimal change, < 5% difference)
 *      * → New (parameter not seen before)
 *    - Appends new rows to "Historical Trends" tables (preserves old data)
 *    - Regenerates "Key Observations" based on all available data
 *    - Highlights significant changes from previous report
 *    - Updates "Report Log" with new report
 *    - Updates metadata
 * 
 * 3. **Validation**
 *    - Ensures all required sections are present
 *    - Verifies new biomarker data appears in the document
 *    - Checks that document hasn't shrunk significantly (data loss check)
 *    - Validates token count is within reasonable limits
 * 
 * 4. **Compression (when needed)**
 *    - Triggered when LHM exceeds 4000 tokens
 *    - Keeps current snapshot and recent data in full
 *    - Summarizes older historical entries
 *    - Maintains exact markdown structure
 * 
 * ## Implementation Details
 * 
 * The merge logic is primarily implemented through LLM prompts:
 * - `LHM_FIRST_REPORT_PROMPT`: Used for initial population
 * - `LHM_MERGE_PROMPT`: Used for subsequent merges
 * 
 * These prompts instruct the LLM to:
 * - Maintain exact markdown structure
 * - Never delete historical data
 * - Update specific sections based on new data
 * - Generate human-readable observations
 * - Apply proper status indicators and trends
 * 
 * The service enriches biomarkers with reference ranges from the database
 * before passing them to the LLM, ensuring accurate status categorization.
 */
export class LHMService {
  /**
   * Update LHM with new biomarker data from a report
   * This is the main merge operation called after report processing
   * 
   * @param profileId - Profile ID
   * @param newBiomarkers - Newly extracted biomarkers from report
   * @param reportDate - Date of the report
   * @param labName - Name of the lab (optional)
   */
  async updateLHM(
    profileId: string,
    newBiomarkers: Biomarker[],
    reportDate: Date,
    labName?: string
  ): Promise<LHMDocument> {
    try {
      logger.info('Starting LHM update', {
        profileId,
        biomarkerCount: newBiomarkers.length,
        reportDate: reportDate.toISOString(),
      });

      // Get current LHM
      const currentLHM = await lhmRepository.findByProfileId(profileId);
      
      if (!currentLHM) {
        throw new HttpError(404, 'LHM not found for profile', 'NOT_FOUND');
      }

      // Get biomarker definitions for reference ranges
      const biomarkersWithDefinitions = await this.enrichBiomarkersWithDefinitions(newBiomarkers);

      // Determine if this is the first report or a merge
      const isFirstReport = currentLHM.version === 1 && 
        currentLHM.markdown.includes('No reports uploaded yet');

      // Generate updated LHM using LLM
      const updatedMarkdown = await this.generateUpdatedLHM(
        currentLHM.markdown,
        biomarkersWithDefinitions,
        reportDate,
        labName,
        isFirstReport
      );

      // Validate the updated LHM
      const isValid = this.validateLHM(
        updatedMarkdown,
        currentLHM.markdown,
        newBiomarkers
      );

      if (!isValid) {
        logger.error('LHM validation failed', { profileId });
        throw new HttpError(500, 'Generated LHM failed validation', 'VALIDATION_ERROR');
      }

      // Estimate token count
      const tokensApprox = mistralChatService.estimateTokens(updatedMarkdown);

      // Update LHM in database
      const updatedLHM = await lhmRepository.update(profileId, {
        markdown: updatedMarkdown,
        lastReportDate: reportDate,
        tokensApprox,
      });

      logger.info('LHM updated successfully', {
        profileId,
        version: updatedLHM.version,
        tokensApprox,
      });

      return updatedLHM;
    } catch (error) {
      logger.error('Failed to update LHM', {
        profileId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Generate updated LHM markdown using LLM
   * Uses different prompts for first report vs subsequent merges
   */
  private async generateUpdatedLHM(
    currentMarkdown: string,
    biomarkers: BiomarkerWithDefinition[],
    reportDate: Date,
    labName: string | undefined,
    isFirstReport: boolean
  ): Promise<string> {
    logger.info('Generating updated LHM', {
      isFirstReport,
      biomarkerCount: biomarkers.length,
    });

    // Format biomarkers as JSON for the prompt
    const biomarkersJson = this.formatBiomarkersForPrompt(biomarkers, labName);

    // Select appropriate prompt
    const promptTemplate = isFirstReport ? LHM_FIRST_REPORT_PROMPT : LHM_MERGE_PROMPT;

    // Replace placeholders in prompt
    const prompt = promptTemplate
      .replace('{{currentLHM}}', currentMarkdown)
      .replace('{{reportDate}}', reportDate.toISOString().split('T')[0])
      .replace('{{biomarkers}}', biomarkersJson);

    // Generate updated markdown using LLM
    const systemMessage = {
      role: 'system' as const,
      content: 'You are a health data analyst maintaining Living Health Markdown documents. Follow instructions precisely and maintain exact markdown structure.',
    };

    const userMessage = {
      role: 'user' as const,
      content: prompt,
    };

    const updatedMarkdown = await mistralChatService.complete(
      [systemMessage, userMessage],
      {
        temperature: 0.3, // Low temperature for consistent formatting
        maxTokens: 6000, // Allow for large LHM documents
      }
    );

    return updatedMarkdown.trim();
  }

  /**
   * Format biomarkers as JSON string for LLM prompt
   * Includes all relevant information: name, value, unit, status, reference ranges
   */
  private formatBiomarkersForPrompt(
    biomarkers: BiomarkerWithDefinition[],
    labName?: string
  ): string {
    const formattedBiomarkers = biomarkers.map((biomarker) => {
      const definition = biomarker.definition;
      
      return {
        name: biomarker.name,
        nameNormalized: biomarker.nameNormalized,
        displayName: definition?.displayName || biomarker.name,
        value: biomarker.value,
        unit: biomarker.unit,
        category: biomarker.category || definition?.category || 'other',
        refRangeLow: definition?.refRangeLow,
        refRangeHigh: definition?.refRangeHigh,
        refRange: definition?.refRangeLow && definition?.refRangeHigh
          ? `${definition.refRangeLow}-${definition.refRangeHigh}`
          : 'Not available',
      };
    });

    const data = {
      labName: labName || 'Lab',
      biomarkers: formattedBiomarkers,
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Enrich biomarkers with their definitions (reference ranges, etc.)
   */
  private async enrichBiomarkersWithDefinitions(
    biomarkers: Biomarker[]
  ): Promise<BiomarkerWithDefinition[]> {
    const enriched = await Promise.all(
      biomarkers.map(async (biomarker) => {
        const definition = await biomarkerRepository.getDefinition(
          biomarker.nameNormalized
        );
        return {
          ...biomarker,
          definition: definition || undefined,
        };
      })
    );

    return enriched;
  }

  /**
   * Validate LHM structure and content using the validator utility
   * Ensures all required sections are present and no data loss occurred
   */
  private validateLHM(
    newMarkdown: string,
    oldMarkdown: string,
    newBiomarkers: Biomarker[]
  ): boolean {
    const result = validateLHM(
      newMarkdown,
      oldMarkdown,
      newBiomarkers,
      (text) => mistralChatService.estimateTokens(text),
      {
        maxTokens: 8000,
        minShrinkageRatio: 0.7,
        checkHistoricalDates: true,
        strictMode: false,
      }
    );

    if (!result.isValid) {
      logger.error('LHM validation failed', {
        errors: result.errors,
        warnings: result.warnings,
        checks: result.checks,
      });
    } else if (result.warnings.length > 0) {
      logger.warn('LHM validation passed with warnings', {
        warnings: result.warnings,
      });
    }

    return result.isValid;
  }

  /**
   * Get LHM for a profile
   */
  async getLHM(profileId: string): Promise<LHMDocument> {
    const lhm = await lhmRepository.findByProfileId(profileId);
    
    if (!lhm) {
      throw new HttpError(404, 'LHM not found for profile', 'NOT_FOUND');
    }

    return lhm;
  }

  /**
   * Get LHM version history
   */
  async getLHMHistory(profileId: string, limit?: number) {
    return lhmRepository.getHistory(profileId, limit);
  }

  /**
   * Get specific LHM version
   */
  async getLHMVersion(profileId: string, version: number) {
    const history = await lhmRepository.getVersion(profileId, version);
    
    if (!history) {
      throw new HttpError(404, 'LHM version not found', 'NOT_FOUND');
    }

    return history;
  }

  /**
   * Check if LHM needs compression
   * Returns true if LHM exceeds 4000 tokens
   */
  async needsCompression(profileId: string): Promise<boolean> {
    const lhm = await this.getLHM(profileId);
    return checkNeedsCompression(
      lhm.markdown,
      (text) => mistralChatService.estimateTokens(text),
      4000
    );
  }

  /**
   * Compress LHM by summarizing older historical entries
   * Keeps the most recent 4 entries per trend panel
   */
  async compressLHM(profileId: string): Promise<LHMDocument> {
    logger.info('Starting LHM compression', { profileId });

    const currentLHM = await this.getLHM(profileId);

    const compressionPrompt = `You are a health data analyst. The following Living Health Markdown document has grown too large and needs compression.

Current LHM:
\`\`\`markdown
${currentLHM.markdown}
\`\`\`

Your task is to compress this document while preserving ALL of these:
1. Current Health Snapshot - keep in full (all current values)
2. Last 4 entries per Historical Trends panel - keep these in full
3. Older entries in Historical Trends - summarize as a single line like "3 earlier reports (2022-2023) showed FBS in range 105-118"
4. Key Observations - keep in full
5. Report Log - keep last 6 reports, summarize older as "X earlier reports on file"
6. Patient Profile - keep in full

CRITICAL RULES:
- Maintain the EXACT markdown structure
- Do NOT remove any sections
- Do NOT lose any current/recent data
- Only compress older historical data
- Keep the same section headers and formatting

Return ONLY the compressed markdown document, no explanations.`;

    const systemMessage = {
      role: 'system' as const,
      content: 'You are a health data analyst maintaining Living Health Markdown documents. Follow compression instructions precisely.',
    };

    const userMessage = {
      role: 'user' as const,
      content: compressionPrompt,
    };

    const compressedMarkdown = await mistralChatService.complete(
      [systemMessage, userMessage],
      {
        temperature: 0.2,
        maxTokens: 5000,
      }
    );

    // Validate compressed version
    const result = validateLHM(
      compressedMarkdown.trim(),
      currentLHM.markdown,
      [], // No new biomarkers in compression
      (text) => mistralChatService.estimateTokens(text),
      {
        maxTokens: 5000,
        minShrinkageRatio: 0.5, // Allow more shrinkage during compression
        checkHistoricalDates: false, // Dates may be summarized during compression
        strictMode: false,
      }
    );

    if (!result.isValid) {
      logger.error('Compressed LHM validation failed', {
        profileId,
        errors: result.errors,
        warnings: result.warnings,
      });
      throw new HttpError(500, 'Compressed LHM failed validation', 'VALIDATION_ERROR');
    }

    // Update LHM with compressed version
    const tokensApprox = mistralChatService.estimateTokens(compressedMarkdown);
    
    const updatedLHM = await lhmRepository.update(profileId, {
      markdown: compressedMarkdown.trim(),
      tokensApprox,
    });

    logger.info('LHM compression completed', {
      profileId,
      oldTokens: currentLHM.tokensApprox,
      newTokens: tokensApprox,
    });

    return updatedLHM;
  }
}

// Export singleton instance
export const lhmService = new LHMService();
