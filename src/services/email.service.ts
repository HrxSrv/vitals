import { readFile } from 'fs/promises';
import path from 'path';
import { Resend } from 'resend';
import { logger } from '../utils/logger';
import { ExternalServiceError } from '../utils/httpError';
import { withRetry } from '../utils/retry';

export interface MonthlyDigestData {
  userName: string;
  profiles: {
    name: string;
    relationship: string;
    summary: string;
    daysSinceLastReport: number;
    hasConcerns: boolean;
  }[];
  generatedSummary: string;
}

export interface ReportReadyEmailData {
  reportId: string;
  reportDate?: Date;
  reportUrl: string;
  userName: string;
  biomarkerCount: number;
}

interface MailtrapAddress {
  email: string;
  name?: string;
}

interface MailtrapSendPayload {
  from: MailtrapAddress;
  to: MailtrapAddress[];
  subject: string;
  html?: string;
  text?: string;
  reply_to?: MailtrapAddress;
  category?: string;
}

interface MailtrapConfig {
  apiToken: string;
  endpoint: string;
  fromEmail: string;
}

/**
 * Email Service
 * Handles email sending via provider-specific APIs
 */
export class EmailService {
  private client: Resend | null;
  private reportReadyTemplateCache: string | null;
  private readonly FROM_EMAIL: string;
  private readonly FROM_NAME: string = 'Vithos';

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@healthtrack.app';
    this.client = apiKey ? new Resend(apiKey) : null;
    this.reportReadyTemplateCache = null;
  }

  /**
   * Send monthly health digest email
   * @param to - Recipient email address
   * @param data - Digest data
   */
  async sendMonthlyDigest(to: string, data: MonthlyDigestData): Promise<void> {
    try {
      const client = this.getClient();

      logger.info('Sending monthly digest email', {
        to,
        profileCount: data.profiles.length,
      });

      const html = this.generateMonthlyDigestHtml(data);
      const text = this.generateMonthlyDigestText(data);

      await withRetry(
        async () => {
          const result = await client.emails.send({
            from: `${this.FROM_NAME} <${this.FROM_EMAIL}>`,
            to,
            subject: 'Your Monthly Health Summary',
            html,
            text,
          });

          if (!result.data) {
            throw new ExternalServiceError('Resend', 'Failed to send email: No response data');
          }

          logger.info('Monthly digest email sent successfully', {
            to,
            emailId: result.data.id,
          });
        },
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          backoffMultiplier: 2,
          shouldRetry: (error: any) => {
            const statusCode = error?.response?.status;
            return (
              statusCode === 429 || // Rate limit
              statusCode === 500 || // Server error
              statusCode === 502 || // Bad gateway
              statusCode === 503 || // Service unavailable
              statusCode === 504 // Gateway timeout
            );
          },
        }
      );
    } catch (error: any) {
      logger.error('Failed to send monthly digest email', {
        to,
        error: error.message,
      });

      if (error instanceof ExternalServiceError) {
        throw error;
      }

      throw new ExternalServiceError('Resend', error.message || 'Failed to send email');
    }
  }

  async sendReportReady(to: string, data: ReportReadyEmailData): Promise<void> {
    try {
      const config = this.getMailtrapConfig();

      logger.info('Sending report ready email', {
        to,
        reportId: data.reportId,
      });

      const html = await this.generateReportReadyHtml(data);
      const text = this.generateReportReadyText(data);

      const result = await this.sendMailtrapEmail(config, {
        from: {
          name: this.FROM_NAME,
          email: config.fromEmail,
        },
        to: [{ email: to }],
        subject: 'Your report is ready',
        html,
        text,
        category: 'report-ready',
      });

      logger.info('Report ready email sent successfully', {
        to,
        reportId: data.reportId,
        response: result,
      });
    } catch (error: any) {
      logger.error('Failed to send report ready email', {
        to,
        reportId: data.reportId,
        error: error.message,
      });

      if (error instanceof ExternalServiceError) {
        throw error;
      }

      throw new ExternalServiceError('Mailtrap', error.message || 'Failed to send email');
    }
  }

  /**
   * Generate HTML content for monthly digest email
   */
  private generateMonthlyDigestHtml(data: MonthlyDigestData): string {
    const profilesHtml = data.profiles
      .map(
        (profile) => `
      <div style="margin-bottom: 24px; padding: 16px; background-color: ${
        profile.hasConcerns ? '#fef2f2' : '#f9fafb'
      }; border-radius: 8px; border-left: 4px solid ${
        profile.hasConcerns ? '#ef4444' : '#10b981'
      };">
        <h3 style="margin: 0 0 8px 0; color: #111827; font-size: 18px;">
          ${profile.name} ${profile.hasConcerns ? '⚠️' : '✓'}
        </h3>
        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
          ${profile.relationship.charAt(0).toUpperCase() + profile.relationship.slice(1)}
        </p>
        <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;">
          ${profile.summary}
        </p>
        ${
          profile.daysSinceLastReport > 90
            ? `<p style="margin: 0; color: #f59e0b; font-size: 14px;">
            ⏰ Last report was ${profile.daysSinceLastReport} days ago. Consider scheduling a checkup.
          </p>`
            : `<p style="margin: 0; color: #6b7280; font-size: 14px;">
            Last report: ${profile.daysSinceLastReport} days ago
          </p>`
        }
      </div>
    `
      )
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Monthly Health Summary</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="margin: 0 0 8px 0; color: #111827; font-size: 28px;">
        Your Monthly Health Summary
      </h1>
      <p style="margin: 0; color: #6b7280; font-size: 16px;">
        ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </p>
    </div>

    <!-- Greeting -->
    <div style="background-color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;">
        Hi ${data.userName},
      </p>
      <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">
        ${data.generatedSummary}
      </p>
    </div>

    <!-- Profiles -->
    <div style="background-color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px;">
        Family Health Overview
      </h2>
      ${profilesHtml}
    </div>

    <!-- Footer -->
    <div style="text-align: center; color: #9ca3af; font-size: 14px;">
      <p style="margin: 0 0 8px 0;">
        This is an automated monthly digest from HealthTrack.
      </p>
      <p style="margin: 0;">
        Always consult with healthcare professionals for medical advice.
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate plain text content for monthly digest email
   */
  private generateMonthlyDigestText(data: MonthlyDigestData): string {
    const profilesText = data.profiles
      .map(
        (profile) => `
${profile.name} (${profile.relationship})
${profile.hasConcerns ? '⚠️ Needs Attention' : '✓ Looking Good'}
${profile.summary}
${
  profile.daysSinceLastReport > 90
    ? `⏰ Last report was ${profile.daysSinceLastReport} days ago. Consider scheduling a checkup.`
    : `Last report: ${profile.daysSinceLastReport} days ago`
}
    `
      )
      .join('\n---\n');

    return `
Your Monthly Health Summary
${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}

Hi ${data.userName},

${data.generatedSummary}

Family Health Overview
======================

${profilesText}

---

This is an automated monthly digest from HealthTrack.
Always consult with healthcare professionals for medical advice.
    `.trim();
  }

  private async generateReportReadyHtml(data: ReportReadyEmailData): Promise<string> {
    const template = await this.loadReportReadyTemplate();

    return this.renderTemplate(template, {
      userName: this.escapeHtml(data.userName),
      reportDate: this.escapeHtml(this.formatReportDate(data.reportDate)),
      reportUrl: this.escapeHtml(data.reportUrl),
      biomarkerCount: String(data.biomarkerCount),
    });
  }

  private generateReportReadyText(data: ReportReadyEmailData): string {
    const reportDate = this.formatReportDate(data.reportDate);

    return `
Your report is ready

Hi ${data.userName},

We finished processing ${reportDate}. You can now review your biomarkers and extracted report details in Vithos.

Open your report:
${data.reportUrl}
    `.trim();
  }

  private getClient(): Resend {
    if (!this.client) {
      throw new ExternalServiceError('Resend', 'RESEND_API_KEY environment variable is required');
    }

    return this.client;
  }

  private getMailtrapConfig(): MailtrapConfig {
    const apiToken = process.env.MAILTRAP_API_KEY;

    if (!apiToken) {
      throw new ExternalServiceError(
        'Mailtrap',
        'MAILTRAP_API_KEY environment variable is required for report-ready emails'
      );
    }

    const useSandbox = process.env.MAILTRAP_USE_SANDBOX === 'true';

    if (useSandbox) {
      const inboxId = process.env.MAILTRAP_INBOX_ID;

      if (!inboxId) {
        throw new ExternalServiceError(
          'Mailtrap',
          'MAILTRAP_INBOX_ID is required when MAILTRAP_USE_SANDBOX=true'
        );
      }

      return {
        apiToken,
        endpoint: `https://sandbox.api.mailtrap.io/api/send/${inboxId}`,
        fromEmail: process.env.FROM_EMAIL || 'sandbox@example.com',
      };
    }

    return {
      apiToken,
      endpoint: 'https://send.api.mailtrap.io/api/send',
      fromEmail: this.FROM_EMAIL,
    };
  }

  private async sendMailtrapEmail(
    config: MailtrapConfig,
    payload: MailtrapSendPayload
  ): Promise<unknown> {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Token': config.apiToken,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseJson: any = null;

    if (responseText) {
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        responseJson = null;
      }
    }

    if (!response.ok) {
      const message =
        responseJson?.message ||
        responseJson?.errors?.[0]?.message ||
        responseText ||
        `HTTP ${response.status}`;

      throw new ExternalServiceError(
        'Mailtrap',
        `Failed to send email (${response.status}): ${message}`
      );
    }

    return responseJson ?? responseText;
  }

  private async loadReportReadyTemplate(): Promise<string> {
    if (this.reportReadyTemplateCache) {
      return this.reportReadyTemplateCache;
    }

    const templatePath = path.resolve(__dirname, '../../mail_templates/report-ready.html');

    try {
      this.reportReadyTemplateCache = await readFile(templatePath, 'utf8');
      return this.reportReadyTemplateCache;
    } catch (error: any) {
      throw new ExternalServiceError(
        'Mail template',
        `Failed to load report-ready template: ${error.message}`
      );
    }
  }

  private renderTemplate(template: string, replacements: Record<string, string>): string {
    return Object.entries(replacements).reduce(
      (html, [key, value]) => html.replace(new RegExp(`{{${key}}}`, 'g'), value),
      template
    );
  }

  private formatReportDate(reportDate?: Date): string {
    return reportDate
      ? reportDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'your latest upload';
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Health check for email service
   */
  healthCheck(): boolean {
    try {
      return !!this.client || !!process.env.MAILTRAP_API_KEY;
    } catch (error) {
      logger.error('Email service health check failed', { error });
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
