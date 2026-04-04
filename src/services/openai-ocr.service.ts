import OpenAI from 'openai';
import { withRetry } from '../utils/retry';
import { logger } from '../utils/logger';
import { ExternalServiceError } from '../utils/httpError';

export class OpenAIOCRService {
  private client: OpenAI;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY environment variable is required');
    this.client = new OpenAI({ apiKey });
    this.model = process.env.OPENAI_VISION_MODEL ?? process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o';
  }

  /**
   * Extract text from a PDF using GPT-4o's native PDF understanding.
   * The PDF is sent as a base64-encoded file — no page rendering required.
   */
  async extractTextFromPDF(documentUrl: string, filename: string): Promise<string> {
    logger.info('Starting OpenAI OCR', { filename, model: this.model });

    try {
      // Fetch PDF bytes
      const res = await fetch(documentUrl);
      if (!res.ok) {
        throw new ExternalServiceError('OpenAI OCR', `Failed to fetch PDF: ${res.status}`);
      }
      const pdfBuffer = Buffer.from(await res.arrayBuffer());
      const base64Pdf = pdfBuffer.toString('base64');

      logger.info('PDF fetched, sending to GPT-4o', {
        filename,
        sizeKb: Math.round(pdfBuffer.length / 1024),
      });

      const text = await withRetry(
        async () => {
          const response = await this.client.chat.completions.create({
            model: this.model,
            max_tokens: 8192,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'This is a medical lab report PDF. Extract ALL text exactly as it appears across every page, preserving the structure, table layout, biomarker names (including any method qualifiers in parentheses like "RBC(Electrical Impedance)", "MCV(RBC Histogram)"), values, units, and reference ranges. Output as markdown with page separators.',
                  },
                  {
                    type: 'file',
                    file: {
                      filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
                      file_data: `data:application/pdf;base64,${base64Pdf}`,
                    },
                  },
                ],
              },
            ],
          });

          const content = response.choices[0]?.message?.content;
          if (!content) throw new ExternalServiceError('OpenAI OCR', 'No content returned');
          return content;
        },
        {
          maxAttempts: 3,
          initialDelayMs: 2000,
          backoffMultiplier: 2,
          shouldRetry: (err: any) =>
            [429, 500, 502, 503, 504].includes(err?.status ?? err?.response?.status),
        }
      );

      logger.info('OpenAI OCR completed', { filename, textLength: text.length });
      return text;
    } catch (error: any) {
      logger.error('OpenAI OCR failed', { filename, error: error.message });
      if (error instanceof ExternalServiceError) throw error;
      throw new ExternalServiceError(
        'OpenAI OCR',
        error.message ?? 'Failed to extract text from PDF'
      );
    }
  }
}

export const openAIOCRService = new OpenAIOCRService();
