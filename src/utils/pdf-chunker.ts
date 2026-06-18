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
 * Split a PDF buffer into overlapping chunks of `pagesPerChunk` pages.
 *
 * Overlap ensures that a lab-report table spanning a page boundary is fully
 * captured in at least one chunk — e.g. a header on page 3 and data rows on
 * page 4 both appear in the chunk [3-5] when overlap = 1.
 *
 * Duplicate biomarkers that appear in two overlapping chunks are removed by
 * the extraction-time dedup (same nameNormalized + same value).
 *
 * Returns the original buffer as a single chunk when total pages ≤ pagesPerChunk.
 */
export async function splitPdf(
  pdfBuffer: Buffer,
  pagesPerChunk: number = 3,
  pagesOverlap: number = 1,
): Promise<PdfChunk[]> {
  const srcDoc = await PDFDocument.load(pdfBuffer);
  const totalPages = srcDoc.getPageCount();

  logger.info('Splitting PDF', { totalPages, pagesPerChunk, pagesOverlap });

  // No splitting needed for short PDFs
  if (totalPages <= pagesPerChunk) {
    return [{
      index: 0,
      pages: Array.from({ length: totalPages }, (_, i) => i + 1),
      buffer: pdfBuffer,
    }];
  }

  const chunks: PdfChunk[] = [];
  // Step forward by (pagesPerChunk - overlap) so adjacent chunks share `overlap` pages.
  const step = Math.max(1, pagesPerChunk - pagesOverlap);

  for (let start = 0; start < totalPages; start += step) {
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

    // Stop once the last chunk reaches the final page
    if (end === totalPages) break;
  }

  logger.info('PDF split complete', {
    totalPages,
    chunks: chunks.length,
    overlap: pagesOverlap,
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
