/**
 * Test script for LHM compression
 * Verifies that compression works correctly when LHM exceeds token limits
 */

// Load environment variables FIRST using require (before ES6 imports)
require('dotenv').config();

import { lhmService } from '../services/lhm.service';
import { lhmRepository } from '../repositories/lhm.repository';
import { profileRepository } from '../repositories/profile.repository';
import { logger } from '../utils/logger';
import { needsCompression } from '../utils/lhm-validator';
import { mistralChatService } from '../services/mistral-chat.service';

// Large LHM document that exceeds 4000 tokens
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

**Observation:** FBS and HbA1c have been rising steadily over the past 3 years. Current values indicate poor glucose control. Medication adjustment recommended.

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

**Observation:** Uric acid consistently elevated and trending upward. Creatinine and BUN remain normal, indicating kidney function is intact despite elevated uric acid.

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

**Observation:** Lipid profile showing consistent improvement over 3 years. LDL and triglycerides trending down significantly. Continue current approach.

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

**Observation:** Thyroid function stable and within normal limits across all measurements.

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

**Observation:** All blood count values remain within normal limits with slight upward trend in hemoglobin.

---

## Key Observations & Concerns

1. **Diabetes management declining** — FBS has risen from 112 to 145 mg/dL over 3 years. HbA1c crossed 7.5, indicating poor 3-month glucose control. Medication review strongly recommended.

2. **Chronic hyperuricemia** — Uric acid has been consistently above range in all 12 reports (7.2-8.2). Risk factor for gout and kidney stones. Dietary modifications (reduce purine-rich foods) and increased hydration recommended.

3. **Lipid profile improving significantly** — Excellent progress. Total cholesterol down from 250 to 195, LDL from 182 to 145, triglycerides from 228 to 156. Continue current approach.

4. **Overall kidney function intact** — Despite elevated uric acid, creatinine and BUN are well within range, indicating good kidney function.

5. **Thyroid and blood count stable** — No concerns in these areas.

6. **Blood pressure borderline** — Systolic BP at 138 mmHg. Monitor closely and consider lifestyle modifications.

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

async function testCompression() {
  console.log('🧪 Testing LHM Compression\n');
  console.log('═══════════════════════════════════════\n');

  try {
    // Test 1: Check if large LHM needs compression
    console.log('Test 1: Check if large LHM needs compression');
    const tokenEstimator = (text: string) => mistralChatService.estimateTokens(text);
    const largeTokens = tokenEstimator(largeLHM);
    const needsComp = needsCompression(largeLHM, tokenEstimator, 4000);
    
    console.log(`  Large LHM tokens: ${largeTokens}`);
    console.log(`  Needs compression (>4000): ${needsComp ? 'YES ✓' : 'NO ✗'}`);
    
    if (!needsComp) {
      console.log('  ⚠️  Warning: Test LHM may not be large enough. Expected >4000 tokens.');
    }
    console.log();

    // Test 2: Create test profile and LHM
    console.log('Test 2: Create test profile with large LHM');
    
    const testProfile = await profileRepository.create({
      userId: 'test-user-compression',
      name: 'Compression Test User',
      relationship: 'self',
      isDefault: true,
    });
    
    console.log(`  ✓ Profile created: ${testProfile.id}`);

    // Initialize LHM with large document
    await lhmRepository.create({
      profileId: testProfile.id,
      userId: testProfile.userId,
      markdown: largeLHM,
      version: 1,
      lastReportDate: new Date('2025-02-15'),
      tokensApprox: largeTokens,
    });
    
    console.log(`  ✓ Large LHM created (${largeTokens} tokens)`);
    console.log();

    // Test 3: Check if service detects need for compression
    console.log('Test 3: Check if service detects need for compression');
    const serviceNeedsComp = await lhmService.needsCompression(testProfile.id);
    console.log(`  Service detects need: ${serviceNeedsComp ? 'YES ✓' : 'NO ✗'}`);
    console.log();

    // Test 4: Perform compression
    console.log('Test 4: Perform compression');
    console.log('  Compressing LHM (this may take 10-20 seconds)...');
    
    const startTime = Date.now();
    const compressedLHM = await lhmService.compressLHM(testProfile.id);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`  ✓ Compression completed in ${duration}s`);
    console.log(`  Original tokens: ${largeTokens}`);
    console.log(`  Compressed tokens: ${compressedLHM.tokensApprox}`);
    console.log(`  Reduction: ${((1 - (compressedLHM.tokensApprox || 0) / largeTokens) * 100).toFixed(1)}%`);
    console.log();

    // Test 5: Verify structure preservation
    console.log('Test 5: Verify structure preservation');
    const requiredSections = [
      '## Patient Profile',
      '## Current Health Snapshot',
      '## Historical Trends',
      '## Key Observations',
      '## Report Log',
    ];
    
    const allSectionsPresent = requiredSections.every(section => 
      compressedLHM.markdown.includes(section)
    );
    
    console.log(`  All required sections present: ${allSectionsPresent ? 'YES ✓' : 'NO ✗'}`);
    
    requiredSections.forEach(section => {
      const present = compressedLHM.markdown.includes(section);
      console.log(`    ${present ? '✓' : '✗'} ${section}`);
    });
    console.log();

    // Test 6: Verify recent data preservation
    console.log('Test 6: Verify recent data preservation');
    const recentDates = ['2025-02-15', '2024-11-10', '2024-08-05', '2024-05-20'];
    const recentDatesPresent = recentDates.filter(date => 
      compressedLHM.markdown.includes(date)
    );
    
    console.log(`  Recent dates preserved: ${recentDatesPresent.length}/${recentDates.length}`);
    recentDates.forEach(date => {
      const present = compressedLHM.markdown.includes(date);
      console.log(`    ${present ? '✓' : '✗'} ${date}`);
    });
    console.log();

    // Test 7: Verify current snapshot intact
    console.log('Test 7: Verify current snapshot intact');
    const currentValues = ['145', '7.8', '8.2', '13.5', '0.9', '3.1'];
    const valuesPresent = currentValues.filter(value => 
      compressedLHM.markdown.includes(value)
    );
    
    console.log(`  Current values preserved: ${valuesPresent.length}/${currentValues.length}`);
    console.log();

    // Test 8: Verify compression doesn't trigger again
    console.log('Test 8: Verify compressed LHM doesn\'t need further compression');
    const stillNeedsComp = await lhmService.needsCompression(testProfile.id);
    console.log(`  Still needs compression: ${stillNeedsComp ? 'YES ✗' : 'NO ✓'}`);
    console.log();

    // Test 9: Display compressed markdown sample
    console.log('Test 9: Display compressed markdown sample');
    console.log('  First 500 characters of compressed LHM:');
    console.log('  ─────────────────────────────────────');
    console.log('  ' + compressedLHM.markdown.substring(0, 500).replace(/\n/g, '\n  '));
    console.log('  ...');
    console.log();

    // Cleanup
    console.log('Cleanup: Deleting test profile');
    await profileRepository.delete(testProfile.id);
    console.log('  ✓ Test profile deleted');
    console.log();

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('✅ All compression tests completed!');
    console.log('═══════════════════════════════════════');
    console.log();
    console.log('Summary:');
    console.log(`  • Original size: ${largeTokens} tokens`);
    console.log(`  • Compressed size: ${compressedLHM.tokensApprox} tokens`);
    console.log(`  • Reduction: ${((1 - (compressedLHM.tokensApprox || 0) / largeTokens) * 100).toFixed(1)}%`);
    console.log(`  • Structure preserved: ${allSectionsPresent ? 'YES' : 'NO'}`);
    console.log(`  • Recent data preserved: ${recentDatesPresent.length}/${recentDates.length} dates`);
    console.log(`  • Below threshold: ${!stillNeedsComp ? 'YES' : 'NO'}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    logger.error('Compression test failed', { error });
    throw error;
  }
}

// Run tests
testCompression()
  .then(() => {
    console.log('\n✅ Test script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });
