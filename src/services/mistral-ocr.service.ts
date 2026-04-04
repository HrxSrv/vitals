import { Mistral } from '@mistralai/mistralai';
import { withRetry } from '../utils/retry';
import { logger } from '../utils/logger';
import { ExternalServiceError } from '../utils/httpError';
import { env } from '../env';

export class MistralOCRService {
  private client: Mistral;

  constructor() {
    if (!env.MISTRAL_API_KEY) {
      throw new Error('MISTRAL_API_KEY environment variable is required');
    }

    this.client = new Mistral({
      apiKey: env.MISTRAL_API_KEY,
    });
  }

  /**
   * Extract text from PDF using Mistral OCR API
   * @param documentUrl - Public URL to the PDF document
   * @param filename - Original filename for logging
   * @returns Extracted markdown text
   */
  async extractTextFromPDF(documentUrl: string, filename: string): Promise<string> {
    try {
      logger.info('Starting OCR extraction', { filename, documentUrl });

      const result = await withRetry(
        async () => {
          // Call Mistral OCR API
          const ocrResponse = await this.client.ocr.process({
            model: 'mistral-ocr-latest',
            document: {
              type: 'document_url',
              documentUrl: documentUrl,
            },
            includeImageBase64: false, // We don't need the images back
          });

          // Extract text from all pages
          const pages = ocrResponse.pages || [];

          if (pages.length === 0) {
            throw new ExternalServiceError('Mistral OCR', 'No pages extracted from PDF');
          }

          // Combine all page texts with page separators
          const extractedText = pages
            .map((page: any, index: number) => {
              const pageText = page.markdown || page.text || '';
              return `## Page ${index + 1}\n\n${pageText}`;
            })
            .join('\n\n---\n\n');

          if (!extractedText || extractedText.trim().length === 0) {
            throw new ExternalServiceError('Mistral OCR', 'No text extracted from PDF');
          }

          return extractedText;
        },
        {
          maxAttempts: 3,
          initialDelayMs: 2000,
          backoffMultiplier: 2,
          shouldRetry: (error: any) => {
            // Retry on rate limit or temporary errors
            const statusCode = error?.response?.status || error?.statusCode;
            const shouldRetry =
              statusCode === 429 || // Rate limit
              statusCode === 500 || // Server error
              statusCode === 502 || // Bad gateway
              statusCode === 503 || // Service unavailable
              statusCode === 504; // Gateway timeout

            if (shouldRetry) {
              logger.warn('Retrying OCR request', {
                filename,
                statusCode,
                error: error.message,
              });
            }

            return shouldRetry;
          },
        }
      );

      logger.info('OCR extraction completed', {
        filename,
        textLength: result.length,
      });

      return result;
    } catch (error: any) {
      logger.error('OCR extraction failed', {
        filename,
        error: error.message,
        stack: error.stack,
      });

      if (error instanceof ExternalServiceError) {
        throw error;
      }

      throw new ExternalServiceError(
        'Mistral OCR',
        error.message || 'Failed to extract text from PDF'
      );
    }
  }

  /**
   * Health check for Mistral OCR service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple test with minimal token usage
      await this.client.chat.complete({
        model: 'mistral-small-latest',
        messages: [
          {
            role: 'user',
            content: 'test',
          },
        ],
        maxTokens: 5,
      });
      return true;
    } catch (error) {
      logger.error('Mistral OCR health check failed', { error });
      return false;
    }
  }
}

// Export singleton instance
export const mistralOCRService = new MistralOCRService();
