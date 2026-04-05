import OpenAI from 'openai';
import { withRetry } from '../utils/retry';
import { splitPdf, processInBatches, PdfChunk } from '../utils/pdf-chunker';
import { logger } from '../utils/logger';
import { ExternalServiceError } from '../utils/httpError';

/** Max pages to send in a single API call */
const PAGES_PER_CHUNK = parseInt(process.env.OCR_PAGES_PER_CHUNK ?? '3', 10);
/** Max concurrent API calls */
const OCR_CONCURRENCY = parseInt(process.env.OCR_CONCURRENCY ?? '3', 10);
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
   *
   * For short PDFs (≤ PAGES_PER_CHUNK), sends the whole file in one call.
   * For longer PDFs, splits into chunks of PAGES_PER_CHUNK pages and
   * processes them in parallel batches of OCR_CONCURRENCY.
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

      logger.info('PDF fetched', {
        filename,
        sizeKb: Math.round(pdfBuffer.length / 1024),
      });

      // Split into chunks (returns single chunk for short PDFs)
      const chunks = await splitPdf(pdfBuffer, PAGES_PER_CHUNK);

      if (chunks.length === 1) {
        // Short PDF — single call, no overhead
        const text = await this.processChunk(chunks[0], filename);
        logger.info('OpenAI OCR completed (single chunk)', { filename, textLength: text.length });
        return text;
      }

      // Long PDF — parallel batched processing
      logger.info('Processing PDF in chunks', {
        filename,
        chunks: chunks.length,
        concurrency: OCR_CONCURRENCY,
      });

      const chunkResults = await processInBatches(
        chunks,
        (chunk) => this.processChunk(chunk, filename),
        OCR_CONCURRENCY,
      );

      // Merge results with page separators
      const merged = chunkResults.join('\n\n---\n\n');

      logger.info('OpenAI OCR completed (chunked)', {
        filename,
        chunks: chunks.length,
        textLength: merged.length,
      });

      return merged;
    } catch (error: any) {
      logger.error('OpenAI OCR failed', { filename, error: error.message });
      if (error instanceof ExternalServiceError) throw error;
      throw new ExternalServiceError(
        'OpenAI OCR',
        error.message ?? 'Failed to extract text from PDF',
      );
    }
  }

  /**
   * Process a single PDF chunk through GPT-4o.
   */
  private async processChunk(chunk: PdfChunk, filename: string): Promise<string> {
    const base64Pdf = chunk.buffer.toString('base64');
    const pageLabel = chunk.pages.length === 1
      ? `page ${chunk.pages[0]}`
      : `pages ${chunk.pages[0]}–${chunk.pages[chunk.pages.length - 1]}`;

    logger.info('Processing chunk', {
      filename,
      chunk: chunk.index,
      pages: pageLabel,
      sizeKb: Math.round(chunk.buffer.length / 1024),
    });

    return withRetry(
      async () => {
        const response = await this.client.chat.completions.create({
          model: this.model,
          max_completion_tokens: 8192,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `This is ${pageLabel} of a medical lab report PDF. Extract ALL text exactly as it appears, preserving the structure, table layout, biomarker names (including any method qualifiers in parentheses like "RBC(Electrical Impedance)", "MCV(RBC Histogram)"), values, units, and reference ranges. Output as markdown.`,
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
        if (!content) throw new ExternalServiceError('OpenAI OCR', `No content returned for ${pageLabel}`);

        logger.info('Chunk processed', {
          filename,
          chunk: chunk.index,
          pages: pageLabel,
          textLength: content.length,
        });

        return content;
      },
      {
        maxAttempts: 3,
        initialDelayMs: 2000,
        backoffMultiplier: 2,
        shouldRetry: (err: any) =>
          [429, 500, 502, 503, 504].includes(err?.status ?? err?.response?.status),
      },
    );
  }
}

export const openAIOCRService = new OpenAIOCRService();
