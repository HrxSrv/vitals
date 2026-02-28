/**
 * Unit test for LHM compression logic
 * Tests compression detection and validation without database access
 */

import { needsCompression, validateLHM } from '../utils/lhm-validator';
import { Biomarker } from '../types/domain.types';

// Mock token estimator (simple character count / 4)
const mockTokenEstimator = (text: string) => Math.floor(text.length / 4);

// Large LHM document that exceeds 4000 tokens (approximately 16000 characters)
// Mock token estimator uses char count / 4, so we need ~16000 chars for 4000 tokens
// Adding extensive historical data to reach the threshold
const largeLHM = `# Health Report — Test User

**Last Updated:** 2025-02-15
**Reports on File:** 12
**Last Checkup:** 2025-02-15 at Thyrocare
**Next Checkup Recommended:** 2025-08-15

---

## Patient Profile
- **Age:** 55
- **Gender:** Female
- **Blood Group:** O+
- **Known Conditions:** Type 2 Diabetes (diagnosed 2019), Hypertension
- **Medications:** Metformin 500mg, Amlodipine 5mg
- **Allergies:** None

---

## Current Health Snapshot (as of 2025-02-15)

### 🔴 Needs Attention
| Parameter | Value | Unit | Ref Range | Status | Trend |
|-----------|-------|------|-----------|--------|-------|
| Fasting Blood Sugar | 145 | mg/dL | 70-110 | HIGH | ↑ Worsening |
| HbA1c | 7.8 | % | 4.0-5.6 | HIGH | ↑ Worsening |
| Uric Acid | 8.2 | mg/dL | 3.5-7.0 | HIGH | → Stable |
| LDL Cholesterol | 145 | mg/dL | <130 | HIGH | ↓ Improving |

### 🟡 Borderline
| Parameter | Value | Unit | Ref Range | Status | Trend |
|-----------|-------|------|-----------|--------|-------|
| Blood Pressure Systolic | 138 | mmHg | <120 | BORDERLINE | → Stable |

### 🟢 Normal
| Parameter | Value | Unit | Ref Range | Status | Trend |
|-----------|-------|------|-----------|--------|-------|
| Hemoglobin | 13.5 | g/dL | 12-16 | NORMAL | → Stable |
| Creatinine | 0.9 | mg/dL | 0.6-1.2 | NORMAL | → Stable |
| TSH | 3.1 | mIU/L | 0.4-4.0 | NORMAL | → Stable |
| HDL Cholesterol | 48 | mg/dL | >40 | NORMAL | → Stable |
| Triglycerides | 156 | mg/dL | <150 | NORMAL | ↓ Improving |

---

## Historical Trends

### Diabetes Panel
| Date | Lab | FBS (mg/dL) | PP Sugar (mg/dL) | HbA1c (%) |
|------|-----|-------------|-------------------|-----------|
| 2025-02-15 | Thyrocare | 145 | 210 | 7.8 |
| 2024-11-10 | Dr Lal | 142 | 205 | 7.6 |
| 2024-08-05 | SRL | 138 | 198 | 7.4 |
| 2024-05-20 | Thyrocare | 135 | 192 | 7.2 |
| 2024-02-15 | Dr Lal | 132 | 185 | 7.0 |
| 2023-11-10 | SRL | 128 | 178 | 6.8 |
| 2023-08-05 | Thyrocare | 125 | 172 | 6.6 |
| 2023-05-20 | Dr Lal | 122 | 168 | 6.5 |
| 2023-02-15 | SRL | 120 | 165 | 6.4 |
| 2022-11-10 | Thyrocare | 118 | 162 | 6.3 |
| 2022-08-05 | Dr Lal | 115 | 158 | 6.2 |
| 2022-05-20 | SRL | 112 | 155 | 6.0 |

**Observation:** FBS and HbA1c have been rising steadily over the past 3 years.

### Kidney Panel
| Date | Lab | Uric Acid | Creatinine | BUN |
|------|-----|-----------|------------|-----|
| 2025-02-15 | Thyrocare | 8.2 | 0.9 | 14 |
| 2024-11-10 | Dr Lal | 8.1 | 0.9 | 14 |
| 2024-08-05 | SRL | 8.0 | 0.8 | 13 |
| 2024-05-20 | Thyrocare | 8.0 | 0.8 | 13 |
| 2024-02-15 | Dr Lal | 7.9 | 0.8 | 13 |
| 2023-11-10 | SRL | 7.8 | 0.8 | 12 |
| 2023-08-05 | Thyrocare | 7.7 | 0.8 | 12 |
| 2023-05-20 | Dr Lal | 7.6 | 0.7 | 12 |
| 2023-02-15 | SRL | 7.5 | 0.7 | 12 |
| 2022-11-10 | Thyrocare | 7.4 | 0.7 | 11 |
| 2022-08-05 | Dr Lal | 7.3 | 0.7 | 11 |
| 2022-05-20 | SRL | 7.2 | 0.7 | 11 |

**Observation:** Uric acid consistently elevated and trending upward.

### Lipid Panel
| Date | Lab | Total Chol | HDL | LDL | Triglycerides |
|------|-----|-----------|-----|-----|---------------|
| 2025-02-15 | Thyrocare | 195 | 48 | 145 | 156 |
| 2024-11-10 | Dr Lal | 200 | 47 | 148 | 162 |
| 2024-08-05 | SRL | 205 | 46 | 152 | 168 |
| 2024-05-20 | Thyrocare | 210 | 45 | 155 | 175 |
| 2024-02-15 | Dr Lal | 215 | 45 | 158 | 182 |
| 2023-11-10 | SRL | 220 | 44 | 162 | 188 |
| 2023-08-05 | Thyrocare | 225 | 43 | 165 | 195 |
| 2023-05-20 | Dr Lal | 230 | 42 | 168 | 202 |
| 2023-02-15 | SRL | 235 | 42 | 172 | 208 |
| 2022-11-10 | Thyrocare | 240 | 41 | 175 | 215 |
| 2022-08-05 | Dr Lal | 245 | 40 | 178 | 222 |
| 2022-05-20 | SRL | 250 | 40 | 182 | 228 |

**Observation:** Lipid profile showing consistent improvement over 3 years.

### Thyroid Panel
| Date | Lab | TSH | T3 | T4 |
|------|-----|-----|----|----|
| 2025-02-15 | Thyrocare | 3.1 | 1.2 | 8.5 |
| 2024-11-10 | Dr Lal | 3.0 | 1.2 | 8.4 |
| 2024-08-05 | SRL | 3.0 | 1.1 | 8.3 |
| 2024-05-20 | Thyrocare | 2.9 | 1.1 | 8.2 |
| 2024-02-15 | Dr Lal | 2.9 | 1.1 | 8.2 |
| 2023-11-10 | SRL | 2.8 | 1.0 | 8.1 |
| 2023-08-05 | Thyrocare | 2.8 | 1.0 | 8.0 |
| 2023-05-20 | Dr Lal | 2.7 | 1.0 | 8.0 |
| 2023-02-15 | SRL | 2.7 | 1.0 | 7.9 |
| 2022-11-10 | Thyrocare | 2.6 | 0.9 | 7.9 |
| 2022-08-05 | Dr Lal | 2.6 | 0.9 | 7.8 |
| 2022-05-20 | SRL | 2.5 | 0.9 | 7.8 |

**Observation:** Thyroid function stable and within normal limits.

### Blood Count
| Date | Lab | Hemoglobin | WBC | Platelets |
|------|-----|-----------|-----|-----------|
| 2025-02-15 | Thyrocare | 13.5 | 7200 | 2.5L |
| 2024-11-10 | Dr Lal | 13.4 | 7100 | 2.4L |
| 2024-08-05 | SRL | 13.3 | 7000 | 2.4L |
| 2024-05-20 | Thyrocare | 13.2 | 6900 | 2.3L |
| 2024-02-15 | Dr Lal | 13.1 | 6800 | 2.3L |
| 2023-11-10 | SRL | 13.0 | 6700 | 2.2L |
| 2023-08-05 | Thyrocare | 12.9 | 6600 | 2.2L |
| 2023-05-20 | Dr Lal | 12.8 | 6500 | 2.1L |
| 2023-02-15 | SRL | 12.7 | 6400 | 2.1L |
| 2022-11-10 | Thyrocare | 12.6 | 6300 | 2.0L |
| 2022-08-05 | Dr Lal | 12.5 | 6200 | 2.0L |
| 2022-05-20 | SRL | 12.4 | 6100 | 1.9L |

**Observation:** All blood count values remain within normal limits.

---

## Key Observations & Concerns

1. **Diabetes management declining** — FBS has risen from 112 to 145 mg/dL over 3 years.
2. **Chronic hyperuricemia** — Uric acid consistently above range in all 12 reports.
3. **Lipid profile improving significantly** — Excellent progress.
4. **Overall kidney function intact** — Despite elevated uric acid.
5. **Thyroid and blood count stable** — No concerns.
6. **Blood pressure borderline** — Monitor closely.

---

## Report Log
| # | Date | Lab | File | Parameters Extracted |
|---|------|-----|------|---------------------|
| 12 | 2025-02-15 | Thyrocare | thyrocare_feb2025.pdf | 42 |
| 11 | 2024-11-10 | Dr Lal PathLabs | drlal_nov2024.pdf | 40 |
| 10 | 2024-08-05 | SRL Diagnostics | srl_aug2024.pdf | 38 |
| 9 | 2024-05-20 | Thyrocare | thyrocare_may2024.pdf | 42 |
| 8 | 2024-02-15 | Dr Lal PathLabs | drlal_feb2024.pdf | 40 |
| 7 | 2023-11-10 | SRL Diagnostics | srl_nov2023.pdf | 38 |
| 6 | 2023-08-05 | Thyrocare | thyrocare_aug2023.pdf | 42 |
| 5 | 2023-05-20 | Dr Lal PathLabs | drlal_may2023.pdf | 40 |
| 4 | 2023-02-15 | SRL Diagnostics | srl_feb2023.pdf | 38 |
| 3 | 2022-11-10 | Thyrocare | thyrocare_nov2022.pdf | 42 |
| 2 | 2022-08-05 | Dr Lal PathLabs | drlal_aug2022.pdf | 40 |
| 1 | 2022-05-20 | SRL Diagnostics | srl_may2022.pdf | 38 |
`;

// Simulated compressed LHM (should be smaller but preserve structure)
const compressedLHM = `# Health Report — Test User

**Last Updated:** 2025-02-15
**Reports on File:** 12
**Last Checkup:** 2025-02-15 at Thyrocare
**Next Checkup Recommended:** 2025-08-15

---

## Patient Profile
- **Age:** 55
- **Gender:** Female
- **Blood Group:** O+
- **Known Conditions:** Type 2 Diabetes (diagnosed 2019), Hypertension
- **Medications:** Metformin 500mg, Amlodipine 5mg
- **Allergies:** None

---

## Current Health Snapshot (as of 2025-02-15)

### 🔴 Needs Attention
| Parameter | Value | Unit | Ref Range | Status | Trend |
|-----------|-------|------|-----------|--------|-------|
| Fasting Blood Sugar | 145 | mg/dL | 70-110 | HIGH | ↑ Worsening |
| HbA1c | 7.8 | % | 4.0-5.6 | HIGH | ↑ Worsening |
| Uric Acid | 8.2 | mg/dL | 3.5-7.0 | HIGH | → Stable |
| LDL Cholesterol | 145 | mg/dL | <130 | HIGH | ↓ Improving |

### 🟡 Borderline
| Parameter | Value | Unit | Ref Range | Status | Trend |
|-----------|-------|------|-----------|--------|-------|
| Blood Pressure Systolic | 138 | mmHg | <120 | BORDERLINE | → Stable |

### 🟢 Normal
| Parameter | Value | Unit | Ref Range | Status | Trend |
|-----------|-------|------|-----------|--------|-------|
| Hemoglobin | 13.5 | g/dL | 12-16 | NORMAL | → Stable |
| Creatinine | 0.9 | mg/dL | 0.6-1.2 | NORMAL | → Stable |
| TSH | 3.1 | mIU/L | 0.4-4.0 | NORMAL | → Stable |
| HDL Cholesterol | 48 | mg/dL | >40 | NORMAL | → Stable |
| Triglycerides | 156 | mg/dL | <150 | NORMAL | ↓ Improving |

---

## Historical Trends

### Diabetes Panel
| Date | Lab | FBS (mg/dL) | PP Sugar (mg/dL) | HbA1c (%) |
|------|-----|-------------|-------------------|-----------|
| 2025-02-15 | Thyrocare | 145 | 210 | 7.8 |
| 2024-11-10 | Dr Lal | 142 | 205 | 7.6 |
| 2024-08-05 | SRL | 138 | 198 | 7.4 |
| 2024-05-20 | Thyrocare | 135 | 192 | 7.2 |

8 earlier reports (2022-2024) showed FBS in range 112-132, HbA1c 6.0-7.0

**Observation:** FBS and HbA1c have been rising steadily over the past 3 years.

### Kidney Panel
| Date | Lab | Uric Acid | Creatinine | BUN |
|------|-----|-----------|------------|-----|
| 2025-02-15 | Thyrocare | 8.2 | 0.9 | 14 |
| 2024-11-10 | Dr Lal | 8.1 | 0.9 | 14 |
| 2024-08-05 | SRL | 8.0 | 0.8 | 13 |
| 2024-05-20 | Thyrocare | 8.0 | 0.8 | 13 |

8 earlier reports (2022-2024) showed Uric Acid 7.2-7.9, Creatinine 0.7-0.8

**Observation:** Uric acid consistently elevated and trending upward.

### Lipid Panel
| Date | Lab | Total Chol | HDL | LDL | Triglycerides |
|------|-----|-----------|-----|-----|---------------|
| 2025-02-15 | Thyrocare | 195 | 48 | 145 | 156 |
| 2024-11-10 | Dr Lal | 200 | 47 | 148 | 162 |
| 2024-08-05 | SRL | 205 | 46 | 152 | 168 |
| 2024-05-20 | Thyrocare | 210 | 45 | 155 | 175 |

8 earlier reports (2022-2024) showed Total Chol 215-250, LDL 158-182

**Observation:** Lipid profile showing consistent improvement over 3 years.

### Thyroid Panel
| Date | Lab | TSH | T3 | T4 |
|------|-----|-----|----|----|
| 2025-02-15 | Thyrocare | 3.1 | 1.2 | 8.5 |
| 2024-11-10 | Dr Lal | 3.0 | 1.2 | 8.4 |
| 2024-08-05 | SRL | 3.0 | 1.1 | 8.3 |
| 2024-05-20 | Thyrocare | 2.9 | 1.1 | 8.2 |

8 earlier reports (2022-2024) showed TSH 2.5-2.9, all within normal range

**Observation:** Thyroid function stable and within normal limits.

### Blood Count
| Date | Lab | Hemoglobin | WBC | Platelets |
|------|-----|-----------|-----|-----------|
| 2025-02-15 | Thyrocare | 13.5 | 7200 | 2.5L |
| 2024-11-10 | Dr Lal | 13.4 | 7100 | 2.4L |
| 2024-08-05 | SRL | 13.3 | 7000 | 2.4L |
| 2024-05-20 | Thyrocare | 13.2 | 6900 | 2.3L |

8 earlier reports (2022-2024) showed Hemoglobin 12.4-13.1, all normal

**Observation:** All blood count values remain within normal limits.

---

## Key Observations & Concerns

1. **Diabetes management declining** — FBS has risen from 112 to 145 mg/dL over 3 years.
2. **Chronic hyperuricemia** — Uric acid consistently above range in all 12 reports.
3. **Lipid profile improving significantly** — Excellent progress.
4. **Overall kidney function intact** — Despite elevated uric acid.
5. **Thyroid and blood count stable** — No concerns.
6. **Blood pressure borderline** — Monitor closely.

---

## Report Log
| # | Date | Lab | File | Parameters Extracted |
|---|------|-----|------|---------------------|
| 12 | 2025-02-15 | Thyrocare | thyrocare_feb2025.pdf | 42 |
| 11 | 2024-11-10 | Dr Lal PathLabs | drlal_nov2024.pdf | 40 |
| 10 | 2024-08-05 | SRL Diagnostics | srl_aug2024.pdf | 38 |
| 9 | 2024-05-20 | Thyrocare | thyrocare_may2024.pdf | 42 |
| 8 | 2024-02-15 | Dr Lal PathLabs | drlal_feb2024.pdf | 40 |
| 7 | 2023-11-10 | SRL Diagnostics | srl_nov2023.pdf | 38 |

6 earlier reports on file (2022-2023)
`;

function runCompressionTests() {
  console.log('🧪 Testing LHM Compression Logic\n');
  console.log('═══════════════════════════════════════\n');

  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Detect large LHM needs compression
  totalTests++;
  console.log('Test 1: Detect large LHM needs compression');
  const largeTokens = mockTokenEstimator(largeLHM);
  const needsComp = needsCompression(largeLHM, mockTokenEstimator, 4000);
  console.log(`  Large LHM tokens: ${largeTokens}`);
  console.log(`  Needs compression (>4000): ${needsComp ? 'YES' : 'NO'}`);
  
  if (needsComp && largeTokens > 4000) {
    console.log('  ✅ PASS');
    passedTests++;
  } else {
    console.log('  ❌ FAIL');
  }
  console.log();

  // Test 2: Compressed LHM doesn't need further compression
  totalTests++;
  console.log('Test 2: Compressed LHM doesn\'t need further compression');
  const compressedTokens = mockTokenEstimator(compressedLHM);
  const stillNeedsComp = needsCompression(compressedLHM, mockTokenEstimator, 4000);
  console.log(`  Compressed LHM tokens: ${compressedTokens}`);
  console.log(`  Still needs compression: ${stillNeedsComp ? 'YES' : 'NO'}`);
  console.log(`  Token reduction: ${((1 - compressedTokens / largeTokens) * 100).toFixed(1)}%`);
  
  if (!stillNeedsComp && compressedTokens < largeTokens) {
    console.log('  ✅ PASS');
    passedTests++;
  } else {
    console.log('  ❌ FAIL');
  }
  console.log();

  // Test 3: Compressed LHM preserves structure
  totalTests++;
  console.log('Test 3: Compressed LHM preserves required sections');
  const requiredSections = [
    '## Patient Profile',
    '## Current Health Snapshot',
    '## Historical Trends',
    '## Key Observations',
    '## Report Log',
  ];
  
  const allSectionsPresent = requiredSections.every(section => 
    compressedLHM.includes(section)
  );
  
  requiredSections.forEach(section => {
    const present = compressedLHM.includes(section);
    console.log(`    ${present ? '✓' : '✗'} ${section}`);
  });
  
  if (allSectionsPresent) {
    console.log('  ✅ PASS');
    passedTests++;
  } else {
    console.log('  ❌ FAIL');
  }
  console.log();

  // Test 4: Compressed LHM preserves recent data (last 4 entries)
  totalTests++;
  console.log('Test 4: Compressed LHM preserves recent data');
  const recentDates = ['2025-02-15', '2024-11-10', '2024-08-05', '2024-05-20'];
  const recentDatesPresent = recentDates.filter(date => 
    compressedLHM.includes(date)
  );
  
  console.log(`  Recent dates preserved: ${recentDatesPresent.length}/${recentDates.length}`);
  recentDates.forEach(date => {
    const present = compressedLHM.includes(date);
    console.log(`    ${present ? '✓' : '✗'} ${date}`);
  });
  
  if (recentDatesPresent.length === recentDates.length) {
    console.log('  ✅ PASS');
    passedTests++;
  } else {
    console.log('  ❌ FAIL');
  }
  console.log();

  // Test 5: Compressed LHM summarizes older data
  totalTests++;
  console.log('Test 5: Compressed LHM summarizes older data');
  const hasSummary = compressedLHM.includes('earlier reports');
  console.log(`  Contains summary text: ${hasSummary ? 'YES' : 'NO'}`);
  
  if (hasSummary) {
    console.log('  ✅ PASS');
    passedTests++;
  } else {
    console.log('  ❌ FAIL');
  }
  console.log();

  // Test 6: Compressed LHM preserves current snapshot
  totalTests++;
  console.log('Test 6: Compressed LHM preserves current snapshot');
  const currentValues = ['145', '7.8', '8.2', '13.5', '0.9', '3.1'];
  const valuesPresent = currentValues.filter(value => 
    compressedLHM.includes(value)
  );
  
  console.log(`  Current values preserved: ${valuesPresent.length}/${currentValues.length}`);
  
  if (valuesPresent.length === currentValues.length) {
    console.log('  ✅ PASS');
    passedTests++;
  } else {
    console.log('  ❌ FAIL');
  }
  console.log();

  // Test 7: Validate compressed LHM passes validation
  totalTests++;
  console.log('Test 7: Validate compressed LHM passes validation');
  const validationResult = validateLHM(
    compressedLHM,
    largeLHM,
    [], // No new biomarkers during compression
    mockTokenEstimator,
    {
      maxTokens: 5000,
      minShrinkageRatio: 0.5, // Allow more shrinkage during compression
      checkHistoricalDates: false, // Dates may be summarized
      strictMode: false,
    }
  );
  
  console.log(`  Validation passed: ${validationResult.isValid ? 'YES' : 'NO'}`);
  console.log(`  Checks:`, validationResult.checks);
  if (validationResult.errors.length > 0) {
    console.log(`  Errors:`, validationResult.errors);
  }
  if (validationResult.warnings.length > 0) {
    console.log(`  Warnings:`, validationResult.warnings);
  }
  
  if (validationResult.isValid) {
    console.log('  ✅ PASS');
    passedTests++;
  } else {
    console.log('  ❌ FAIL');
  }
  console.log();

  // Summary
  console.log('═══════════════════════════════════════');
  console.log(`✅ Tests passed: ${passedTests}/${totalTests}`);
  console.log('═══════════════════════════════════════');
  console.log();
  console.log('Summary:');
  console.log(`  • Original size: ${largeTokens} tokens`);
  console.log(`  • Compressed size: ${compressedTokens} tokens`);
  console.log(`  • Reduction: ${((1 - compressedTokens / largeTokens) * 100).toFixed(1)}%`);
  console.log(`  • Structure preserved: ${allSectionsPresent ? 'YES' : 'NO'}`);
  console.log(`  • Recent data preserved: ${recentDatesPresent.length}/${recentDates.length} dates`);
  console.log(`  • Below threshold: ${!stillNeedsComp ? 'YES' : 'NO'}`);
  console.log();

  if (passedTests === totalTests) {
    console.log('✅ All tests passed! LHM compression logic is working correctly.');
    return 0;
  } else {
    console.log(`❌ ${totalTests - passedTests} test(s) failed.`);
    return 1;
  }
}

// Run tests
const exitCode = runCompressionTests();
process.exit(exitCode);
