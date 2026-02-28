import { mistralChatService } from './mistral-chat.service';
import { lhmService } from './lhm.service';
import profileRepository from '../repositories/profile.repository';
import { emailService, MonthlyDigestData } from './email.service';
import { logger } from '../utils/logger';
import { Profile } from '../types/domain.types';

/**
 * Digest Service
 * Generates and sends monthly health digest emails
 */
export class DigestService {
  /**
   * Generate and send monthly digest for a user
   * @param userId - User ID
   * @param userEmail - User email address
   * @param userName - User name (optional)
   */
  async generateAndSendDigest(
    userId: string,
    userEmail: string,
    userName?: string
  ): Promise<void> {
    try {
      logger.info('Generating monthly digest', { userId, userEmail });

      // Get all profiles for the user
      const profiles = await profileRepository.findByUserId(userId);

      if (profiles.length === 0) {
        logger.warn('No profiles found for user, skipping digest', { userId });
        return;
      }

      // Generate digest data for each profile
      const profileDigests = await Promise.all(
        profiles.map((profile) => this.generateProfileDigest(profile))
      );

      // Generate family-wide summary using LLM
      const generatedSummary = await this.generateFamilySummary(
        profileDigests
      );

      // Prepare email data
      const digestData: MonthlyDigestData = {
        userName: userName || 'there',
        profiles: profileDigests,
        generatedSummary,
      };

      // Send email
      await emailService.sendMonthlyDigest(userEmail, digestData);

      logger.info('Monthly digest sent successfully', { userId, userEmail });
    } catch (error) {
      logger.error('Failed to generate and send digest', {
        userId,
        userEmail,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Generate digest data for a single profile
   */
  private async generateProfileDigest(profile: Profile): Promise<{
    name: string;
    relationship: string;
    summary: string;
    daysSinceLastReport: number;
    hasConcerns: boolean;
  }> {
    try {
      // Get LHM for the profile
      const lhm = await lhmService.getLHM(profile.id);

      // Calculate days since last report
      const daysSinceLastReport = lhm.lastReportDate
        ? Math.floor(
            (Date.now() - lhm.lastReportDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 999;

      // Generate summary from LHM using LLM
      const summary = await this.generateProfileSummary(lhm.markdown);

      // Detect if there are concerns (simple heuristic: check for red flags in LHM)
      const hasConcerns = this.detectConcerns(lhm.markdown);

      return {
        name: profile.name,
        relationship: profile.relationship,
        summary,
        daysSinceLastReport,
        hasConcerns,
      };
    } catch (error) {
      logger.error('Failed to generate profile digest', {
        profileId: profile.id,
        error: error instanceof Error ? error.message : error,
      });

      // Return fallback data
      return {
        name: profile.name,
        relationship: profile.relationship,
        summary: 'Unable to generate summary at this time.',
        daysSinceLastReport: 999,
        hasConcerns: false,
      };
    }
  }

  /**
   * Generate a concise summary from LHM using LLM
   */
  private async generateProfileSummary(lhmMarkdown: string): Promise<string> {
    const prompt = `You are a health data analyst. Generate a concise 2-3 sentence summary of the following health data for a monthly email digest.

Focus on:
- Current health status (normal, concerning, improving)
- Any notable trends or changes
- Key metrics that stand out

Living Health Markdown:
\`\`\`markdown
${lhmMarkdown}
\`\`\`

Generate a brief, friendly summary suitable for an email. Be empathetic and clear.`;

    const systemMessage = {
      role: 'system' as const,
      content:
        'You are a health data analyst creating concise summaries for email digests.',
    };

    const userMessage = {
      role: 'user' as const,
      content: prompt,
    };

    const summary = await mistralChatService.complete(
      [systemMessage, userMessage],
      {
        temperature: 0.7,
        maxTokens: 200,
      }
    );

    return summary.trim();
  }

  /**
   * Detect if there are health concerns in the LHM
   * Simple heuristic: check for red flag indicators
   */
  private detectConcerns(lhmMarkdown: string): boolean {
    const concernIndicators = [
      '🔴',
      'Needs Attention',
      'High',
      'Low',
      'Critical',
      'Abnormal',
      'Worsening',
      '↑ Worsening',
    ];

    return concernIndicators.some((indicator) =>
      lhmMarkdown.includes(indicator)
    );
  }

  /**
   * Generate family-wide summary using LLM
   * Prioritizes profiles with concerning values
   */
  private async generateFamilySummary(
    profileDigests: Array<{
      name: string;
      relationship: string;
      summary: string;
      daysSinceLastReport: number;
      hasConcerns: boolean;
    }>
  ): Promise<string> {
    const profileSummaries = profileDigests
      .map(
        (p) =>
          `- ${p.name} (${p.relationship}): ${p.summary} ${
            p.hasConcerns ? '[⚠️ Has concerns]' : '[✓ Looking good]'
          }`
      )
      .join('\n');

    const prompt = `You are a health data analyst. Generate a warm, friendly opening paragraph for a monthly health digest email.

Profile summaries:
${profileSummaries}

Generate a 2-3 sentence opening that:
- Welcomes the user
- Provides a high-level overview of the family's health status
- Highlights any profiles that need attention (if any)
- Encourages proactive health management

Be empathetic, supportive, and clear. This is the opening of an email digest.`;

    const systemMessage = {
      role: 'system' as const,
      content:
        'You are a health data analyst creating friendly email digest openings.',
    };

    const userMessage = {
      role: 'user' as const,
      content: prompt,
    };

    const summary = await mistralChatService.complete(
      [systemMessage, userMessage],
      {
        temperature: 0.7,
        maxTokens: 250,
      }
    );

    return summary.trim();
  }
}

// Export singleton instance
export const digestService = new DigestService();
