/**
 * Test script for text chunker utility
 */

import { chunkText, chunkTextSimple, defaultTokenEstimator } from '../utils/text-chunker';

console.log('=== Testing Text Chunker Utility ===\n');

// Test 1: Empty text
console.log('Test 1: Empty text');
const emptyChunks = chunkText('');
console.log('Result:', emptyChunks.length === 0 ? '✓ PASS' : '✗ FAIL');
console.log('Expected: 0 chunks, Got:', emptyChunks.length);
console.log();

// Test 2: Short text (single chunk)
console.log('Test 2: Short text (single chunk)');
const shortText = 'This is a short text that fits in one chunk.';
const shortChunks = chunkText(shortText, { maxTokens: 500 });
console.log('Result:', shortChunks.length === 1 ? '✓ PASS' : '✗ FAIL');
console.log('Expected: 1 chunk, Got:', shortChunks.length);
console.log('Chunk text:', shortChunks[0]?.text);
console.log('Token count:', shortChunks[0]?.tokenCount);
console.log();

// Test 3: Long text (multiple chunks)
console.log('Test 3: Long text (multiple chunks)');
const longText = 'A'.repeat(1000) + '\n\n' + 'B'.repeat(1000) + '\n\n' + 'C'.repeat(1000);
const longChunks = chunkText(longText, { maxTokens: 200 });
console.log('Result:', longChunks.length > 1 ? '✓ PASS' : '✗ FAIL');
console.log('Expected: >1 chunks, Got:', longChunks.length);
longChunks.forEach((chunk, i) => {
  console.log(`  Chunk ${i + 1}: ${chunk.tokenCount} tokens, ${chunk.text.length} chars`);
  if (chunk.tokenCount > 200) {
    console.log(`  ✗ FAIL: Chunk exceeds max tokens (${chunk.tokenCount} > 200)`);
  }
});
console.log();

// Test 4: Token estimator
console.log('Test 4: Default token estimator');
const testText = 'This is a test'; // 14 characters
const tokens = defaultTokenEstimator(testText);
const expected = Math.ceil(14 / 4); // Should be 4
console.log('Result:', tokens === expected ? '✓ PASS' : '✗ FAIL');
console.log('Expected:', expected, 'tokens, Got:', tokens);
console.log();

// Test 5: Paragraph boundaries
console.log('Test 5: Paragraph boundaries');
const paragraphText = `First paragraph with some content.

Second paragraph with more content.

Third paragraph with even more content.`;
const paragraphChunks = chunkText(paragraphText, { maxTokens: 20 });
console.log('Chunks created:', paragraphChunks.length);
paragraphChunks.forEach((chunk, i) => {
  console.log(`  Chunk ${i + 1}: ${chunk.tokenCount} tokens`);
  console.log(`    Preview: ${chunk.text.substring(0, 50)}...`);
});
console.log();

// Test 6: Real-world OCR markdown
console.log('Test 6: Real-world OCR markdown');
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

Patient shows normal values across all parameters.`;

const ocrChunks = chunkText(ocrMarkdown, { maxTokens: 500 });
console.log('Chunks created:', ocrChunks.length);
let allWithinLimit = true;
ocrChunks.forEach((chunk, i) => {
  console.log(`  Chunk ${i + 1}: ${chunk.tokenCount} tokens, ${chunk.text.length} chars`);
  if (chunk.tokenCount > 500) {
    console.log(`  ✗ FAIL: Chunk exceeds max tokens`);
    allWithinLimit = false;
  }
});
console.log('Result:', allWithinLimit ? '✓ PASS' : '✗ FAIL');
console.log();

// Test 7: Simple interface
console.log('Test 7: Simple interface (chunkTextSimple)');
const simpleChunks = chunkTextSimple('Test text for chunking.', 500);
console.log('Result:', Array.isArray(simpleChunks) && typeof simpleChunks[0] === 'string' ? '✓ PASS' : '✗ FAIL');
console.log('Expected: array of strings, Got:', typeof simpleChunks[0]);
console.log('Chunks:', simpleChunks);
console.log();

// Test 8: Chunk metadata
console.log('Test 8: Chunk metadata');
const metadataText = 'First chunk.\n\nSecond chunk.';
const metadataChunks = chunkText(metadataText, { maxTokens: 5 });
let metadataValid = true;
metadataChunks.forEach((chunk, i) => {
  console.log(`  Chunk ${i + 1}:`);
  console.log(`    startIndex: ${chunk.startIndex}`);
  console.log(`    endIndex: ${chunk.endIndex}`);
  console.log(`    tokenCount: ${chunk.tokenCount}`);
  if (chunk.startIndex < 0 || chunk.endIndex <= chunk.startIndex) {
    console.log(`    ✗ FAIL: Invalid indices`);
    metadataValid = false;
  }
});
console.log('Result:', metadataValid ? '✓ PASS' : '✗ FAIL');
console.log();

console.log('=== Test Summary ===');
console.log('All basic tests completed. Review results above.');
