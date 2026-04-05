import { PDFDocument } from 'pdf-lib';
import { logger } from './logger';

export interface PdfChunk {
  /** 0-based chunk index */
  index: number;
  /** 1-based page numbers included in this chunk */
  pages: number[];
  /** The chunk as a PDF buffer */
  buffer: Buffer;
}

/**
 * Split a PDF buffer into chunks of `pagesPerChunk` pages.
 * Returns the original buffer as a single chunk if total pages <= pagesPerChunk.
 */
export async function splitPdf(
  pdfBuffer: Buffer,
  pagesPerChunk: number = 3,
): Promise<PdfChunk[]> {
  const srcDoc = await PDFDocument.load(pdfBuffer);
  const totalPages = srcDoc.getPageCount();

  logger.info('Splitting PDF', { totalPages, pagesPerChunk });

  // No splitting needed for short PDFs
  if (totalPages <= pagesPerChunk) {
    return [{
      index: 0,
      pages: Array.from({ length: totalPages }, (_, i) => i + 1),
      buffer: pdfBuffer,
    }];
  }

  const chunks: PdfChunk[] = [];

  for (let start = 0; start < totalPages; start += pagesPerChunk) {
    const end = Math.min(start + pagesPerChunk, totalPages);
    const pageIndices = Array.from({ length: end - start }, (_, i) => start + i);

    const chunkDoc = await PDFDocument.create();
    const copiedPages = await chunkDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => chunkDoc.addPage(page));

    const chunkBytes = await chunkDoc.save();

    chunks.push({
      index: chunks.length,
      pages: pageIndices.map((i) => i + 1),
      buffer: Buffer.from(chunkBytes),
    });
  }

  logger.info('PDF split complete', {
    totalPages,
    chunks: chunks.length,
    chunkSizes: chunks.map((c) => `${c.pages.length}p/${Math.round(c.buffer.length / 1024)}KB`),
  });

  return chunks;
}

/**
 * Process items in parallel batches.
 * Runs up to `concurrency` items at a time, waits for the batch to finish,
 * then starts the next batch.
 */
export async function processInBatches<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number = 3,
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }

  return results;
}
