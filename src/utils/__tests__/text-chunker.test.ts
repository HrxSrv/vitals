import { chunkText, chunkTextSimple, defaultTokenEstimator } from '../text-chunker';

describe('text-chunker', () => {
  describe('defaultTokenEstimator', () => {
    it('should estimate tokens based on character count', () => {
      const text = 'This is a test'; // 14 characters
      const tokens = defaultTokenEstimator(text);
      expect(tokens).toBe(4); // 14 / 4 = 3.5, rounded up to 4
    });

    it('should handle empty strings', () => {
      expect(defaultTokenEstimator('')).toBe(0);
    });
  });

  describe('chunkText', () => {
    it('should return empty array for empty text', () => {
      const chunks = chunkText('');
      expect(chunks).toEqual([]);
    });

    it('should return single chunk for short text', () => {
      const text = 'This is a short text that fits in one chunk.';
      const chunks = chunkText(text, { maxTokens: 500 });
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe(text);
      expect(chunks[0].startIndex).toBe(0);
      expect(chunks[0].tokenCount).toBeLessThanOrEqual(500);
    });

    it('should split long text into multiple chunks', () => {
      // Create text that's definitely longer than 500 tokens (2000+ characters)
      const paragraph1 = 'A'.repeat(1000);
      const paragraph2 = 'B'.repeat(1000);
      const paragraph3 = 'C'.repeat(1000);
      const text = `${paragraph1}\n\n${paragraph2}\n\n${paragraph3}`;
      
      const chunks = chunkText(text, { maxTokens: 200 });
      
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.tokenCount).toBeLessThanOrEqual(200);
      });
    });

    it('should preserve paragraph boundaries', () => {
      const text = `First paragraph with some content.

Second paragraph with more content.

Third paragraph with even more content.`;
      
      const chunks = chunkText(text, { maxTokens: 20 });
      
      // Each chunk should contain complete paragraphs
      chunks.forEach(chunk => {
        expect(chunk.text.trim().length).toBeGreaterThan(0);
      });
    });

    it('should handle custom token estimator', () => {
      const text = 'Test text';
      const customEstimator = jest.fn(() => 10);
      
      const chunks = chunkText(text, {
        maxTokens: 500,
        tokenEstimator: customEstimator,
      });
      
      expect(customEstimator).toHaveBeenCalled();
      expect(chunks[0].tokenCount).toBe(10);
    });

    it('should split at sentence boundaries for long paragraphs', () => {
      const longParagraph = 'A'.repeat(3000) + '. ' + 'B'.repeat(3000) + '.';
      
      const chunks = chunkText(longParagraph, { maxTokens: 500 });
      
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should include overlap between chunks when specified', () => {
      const text = `First paragraph.

Second paragraph.

Third paragraph.

Fourth paragraph.`;
      
      const chunks = chunkText(text, {
        maxTokens: 10,
        overlapTokens: 2,
      });
      
      // With overlap, chunks should have some shared content
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should handle markdown formatting', () => {
      const markdown = `# Header

## Subheader

- List item 1
- List item 2

**Bold text** and *italic text*.

| Table | Header |
|-------|--------|
| Cell  | Data   |`;
      
      const chunks = chunkText(markdown, { maxTokens: 500 });
      
      expect(chunks.length).toBeGreaterThanOrEqual(1);
      expect(chunks[0].text).toContain('Header');
    });

    it('should respect maxTokens limit', () => {
      const text = 'Word '.repeat(1000); // Create long text
      const maxTokens = 100;
      
      const chunks = chunkText(text, { maxTokens });
      
      chunks.forEach(chunk => {
        expect(chunk.tokenCount).toBeLessThanOrEqual(maxTokens);
      });
    });

    it('should provide correct metadata for chunks', () => {
      const text = 'First chunk.\n\nSecond chunk.';
      
      const chunks = chunkText(text, { maxTokens: 5 });
      
      chunks.forEach(chunk => {
        expect(chunk).toHaveProperty('text');
        expect(chunk).toHaveProperty('startIndex');
        expect(chunk).toHaveProperty('endIndex');
        expect(chunk).toHaveProperty('tokenCount');
        expect(chunk.startIndex).toBeGreaterThanOrEqual(0);
        expect(chunk.endIndex).toBeGreaterThan(chunk.startIndex);
      });
    });
  });

  describe('chunkTextSimple', () => {
    it('should return array of text strings', () => {
      const text = 'Test text for chunking.';
      const chunks = chunkTextSimple(text, 500);
      
      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks[0]).toBe(text);
      expect(typeof chunks[0]).toBe('string');
    });

    it('should use default maxTokens of 500', () => {
      const text = 'A'.repeat(3000); // Long text
      const chunks = chunkTextSimple(text);
      
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should handle empty text', () => {
      const chunks = chunkTextSimple('');
      expect(chunks).toEqual([]);
    });
  });

  describe('real-world OCR markdown', () => {
    it('should chunk typical medical report markdown', () => {
      const ocrMarkdown = `# Medical Report

**Patient Name:** John Doe
**Date:** 2024-01-15

## Blood Test Results

### Complete Blood Count

| Parameter | Value | Unit | Reference Range |
|-----------|-------|------|-----------------|
| Hemoglobin | 14.5 | g/dL | 13.5-17.5 |
| WBC | 7.2 | 10^3/μL | 4.0-11.0 |
| Platelets | 250 | 10^3/μL | 150-400 |

### Lipid Panel

| Parameter | Value | Unit | Reference Range |
|-----------|-------|------|-----------------|
| Total Cholesterol | 195 | mg/dL | <200 |
| LDL | 120 | mg/dL | <130 |
| HDL | 55 | mg/dL | >40 |
| Triglycerides | 100 | mg/dL | <150 |

## Notes

Patient shows normal values across all parameters. Continue current lifestyle and medication regimen.`;

      const chunks = chunkText(ocrMarkdown, { maxTokens: 500 });
      
      expect(chunks.length).toBeGreaterThanOrEqual(1);
      
      // Verify all chunks are within token limit
      chunks.forEach(chunk => {
        expect(chunk.tokenCount).toBeLessThanOrEqual(500);
        expect(chunk.text.length).toBeGreaterThan(0);
      });
      
      // Verify content is preserved
      const reconstructed = chunks.map(c => c.text).join('\n\n');
      expect(reconstructed).toContain('Medical Report');
      expect(reconstructed).toContain('Blood Test Results');
    });
  });
});
