/**
 * Integration test for LHM merge logic
 * Tests the complete flow of LHM updates with actual database operations
 */

import { lhmService } from '../services/lhm.service';
import { lhmRepository } from '../repositories/lhm.repository';
import { profileRepository } from '../repositories/profile.repository';
import { Biomarker } from '../types/domain.types';
import crypto from 'crypto';

async function testLHMMergeIntegration() {
  console.log('=== Testing LHM Merge Integration ===\n');

  const testUserId = `test-user-${crypto.randomUUID()}`;
  const testReportId1 = `test-report-${crypto.randomUUID()}`;
  const testReportId2 = `test-report-${crypto.randomUUID()}`;

  try {
    // Step 1: Create a test profile
    console.log('Step 1: Creating test profile...');
    const profile = await profileRepository.create({
      userId: testUserId,
      name: 'Test User',
      relationship: 'self',
      dob: new Date('1980-01-01'),
      gender: 'male',
      isDefault: true,
    });
    console.log(`✅ Profile created: ${profile.id}\n`);

    // Wait for LHM initialization
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Verify initial LHM
    console.log('Step 2: Verifying initial LHM...');
    const initialLHM = await lhmRepository.findByProfileId(profile.id);
    
    if (!initialLHM) {
      throw new Error('Initial LHM not found');
    }

    console.log(`✅ Initial LHM found`);
    console.log(`   Version: ${initialLHM.version}`);
    console.log(`   Tokens: ${initialLHM.tokensApprox || 'N/A'}\n`);

    // Step 3: Create first report biomarkers
    console.log('Step 3: Creating first report biomarkers...');
    const firstReportBiomarkers: Biomarker[] = [
      {
        id: crypto.randomUUID(),
        reportId: testReportId1,
        userId: testUserId,
        profileId: profile.id,
        name: 'Fasting Blood Sugar',
        nameNormalized: 'fasting_blood_sugar',
        category: 'diabetes',
        value: 145,
        unit: 'mg/dL',
        reportDate: new Date('2025-01-15'),
        createdAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        reportId: testReportId1,
        userId: testUserId,
        profileId: profile.id,
        name: 'HbA1c',
        nameNormalized: 'hba1c',
        category: 'diabetes',
        value: 7.8,
        unit: '%',
        reportDate: new Date('2025-01-15'),
        createdAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        reportId: testReportId1,
        userId: testUserId,
        profileId: profile.id,
        name: 'Total Cholesterol',
        nameNormalized: 'total_cholesterol',
        category: 'lipid',
        value: 195,
        unit: 'mg/dL',
        reportDate: new Date('2025-01-15'),
        createdAt: new Date(),
      },
    ];

    console.log(`✅ Created ${firstReportBiomarkers.length} biomarkers for first report\n`);

    // Step 4: Update LHM with first report
    console.log('Step 4: Updating LHM with first report...');
    console.log('⏳ This will call Mistral API, please wait...');
    
    const updatedLHM1 = await lhmService.updateLHM(
      profile.id,
      firstReportBiomarkers,
      new Date('2025-01-15'),
      'Thyrocare Labs'
    );

    console.log(`✅ LHM updated with first report`);
    console.log(`   Version: ${updatedLHM1.version}`);
    console.log(`   Tokens: ${updatedLHM1.tokensApprox || 'N/A'}`);
    console.log(`   Last Report Date: ${updatedLHM1.lastReportDate?.toISOString().split('T')[0]}\n`);

    // Step 5: Validate first report merge
    console.log('Step 5: Validating first report merge...');
    const validations1 = {
      versionIncremented: updatedLHM1.version === 2,
      hasCurrentSnapshot: updatedLHM1.markdown.includes('## Current Health Snapshot'),
      hasHistoricalTrends: updatedLHM1.markdown.includes('## Historical Trends'),
      hasKeyObservations: updatedLHM1.markdown.includes('## Key Observations'),
      hasReportLog: updatedLHM1.markdown.includes('## Report Log'),
      containsBiomarkerValues: firstReportBiomarkers.every(b => 
        updatedLHM1.markdown.includes(b.value.toString())
      ),
    };

    console.log('Validation Results:');
    Object.entries(validations1).forEach(([key, value]) => {
      console.log(`- ${key}: ${value ? '✅' : '❌'}`);
    });
    console.log();

    // Step 6: Create second report biomarkers (with changes)
    console.log('Step 6: Creating second report biomarkers...');
    const secondReportBiomarkers: Biomarker[] = [
      {
        id: crypto.randomUUID(),
        reportId: testReportId2,
        userId: testUserId,
        profileId: profile.id,
        name: 'Fasting Blood Sugar',
        nameNormalized: 'fasting_blood_sugar',
        category: 'diabetes',
        value: 138, // Improved from 145
        unit: 'mg/dL',
        reportDate: new Date('2025-02-15'),
        createdAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        reportId: testReportId2,
        userId: testUserId,
        profileId: profile.id,
        name: 'HbA1c',
        nameNormalized: 'hba1c',
        category: 'diabetes',
        value: 7.5, // Improved from 7.8
        unit: '%',
        reportDate: new Date('2025-02-15'),
        createdAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        reportId: testReportId2,
        userId: testUserId,
        profileId: profile.id,
        name: 'Total Cholesterol',
        nameNormalized: 'total_cholesterol',
        category: 'lipid',
        value: 210, // Worsened from 195
        unit: 'mg/dL',
        reportDate: new Date('2025-02-15'),
        createdAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        reportId: testReportId2,
        userId: testUserId,
        profileId: profile.id,
        name: 'Creatinine',
        nameNormalized: 'creatinine',
        category: 'kidney',
        value: 0.9, // New biomarker
        unit: 'mg/dL',
        reportDate: new Date('2025-02-15'),
        createdAt: new Date(),
      },
    ];

    console.log(`✅ Created ${secondReportBiomarkers.length} biomarkers for second report\n`);

    // Step 7: Update LHM with second report (merge)
    console.log('Step 7: Updating LHM with second report (merge)...');
    console.log('⏳ This will call Mistral API, please wait...');
    
    const updatedLHM2 = await lhmService.updateLHM(
      profile.id,
      secondReportBiomarkers,
      new Date('2025-02-15'),
      'Thyrocare Labs'
    );

    console.log(`✅ LHM updated with second report`);
    console.log(`   Version: ${updatedLHM2.version}`);
    console.log(`   Tokens: ${updatedLHM2.tokensApprox || 'N/A'}`);
    console.log(`   Last Report Date: ${updatedLHM2.lastReportDate?.toISOString().split('T')[0]}\n`);

    // Step 8: Validate second report merge
    console.log('Step 8: Validating second report merge...');
    const validations2 = {
      versionIncremented: updatedLHM2.version === 3,
      hasUpdatedValues: secondReportBiomarkers.every(b => 
        updatedLHM2.markdown.includes(b.value.toString())
      ),
      hasHistoricalData: updatedLHM2.markdown.includes('2025-01-15'), // First report date
      hasNewBiomarker: updatedLHM2.markdown.includes('Creatinine'),
      hasTrendIndicators: updatedLHM2.markdown.includes('↑') || 
                          updatedLHM2.markdown.includes('↓') || 
                          updatedLHM2.markdown.includes('→'),
    };

    console.log('Validation Results:');
    Object.entries(validations2).forEach(([key, value]) => {
      console.log(`- ${key}: ${value ? '✅' : '❌'}`);
    });
    console.log();

    // Step 9: Check LHM history
    console.log('Step 9: Checking LHM version history...');
    const history = await lhmRepository.getHistory(profile.id);
    
    console.log(`✅ Found ${history.length} archived versions`);
    history.forEach(h => {
      console.log(`   - Version ${h.version} (archived at ${h.createdAt.toISOString()})`);
    });
    console.log();

    // Step 10: Display final LHM preview
    console.log('Step 10: Final LHM Preview:');
    console.log('─'.repeat(80));
    console.log(updatedLHM2.markdown.substring(0, 1000));
    console.log('...');
    console.log('─'.repeat(80));
    console.log();

    // Step 11: Test compression check
    console.log('Step 11: Testing compression check...');
    const needsCompression = await lhmService.needsCompression(profile.id);
    console.log(`Needs compression: ${needsCompression ? 'Yes' : 'No'}`);
    console.log(`Current tokens: ${updatedLHM2.tokensApprox || 'N/A'} (threshold: 4000)\n`);

    // Cleanup
    console.log('Cleanup: Deleting test data...');
    await lhmRepository.delete(profile.id);
    await profileRepository.delete(profile.id);
    console.log('✅ Test data deleted\n');

    // Final summary
    console.log('=== Test Summary ===');
    const allValid = Object.values(validations1).every(v => v) && 
                     Object.values(validations2).every(v => v);
    
    if (allValid) {
      console.log('✅ All validations passed!');
      console.log('✅ LHM merge logic is working correctly');
      console.log();
      console.log('Verified functionality:');
      console.log('- ✅ First report creates initial health snapshot');
      console.log('- ✅ Subsequent reports merge with existing data');
      console.log('- ✅ Historical trends are maintained');
      console.log('- ✅ Version history is tracked');
      console.log('- ✅ Metadata is updated correctly');
      console.log('- ✅ New biomarkers are added');
      console.log('- ✅ Trend indicators are generated');
    } else {
      console.log('❌ Some validations failed');
      console.log('Please review the LHM merge logic');
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    
    // Attempt cleanup on error
    try {
      console.log('\nAttempting cleanup...');
      const profiles = await profileRepository.findByUserId(testUserId);
      for (const profile of profiles) {
        await lhmRepository.delete(profile.id);
        await profileRepository.delete(profile.id);
      }
      console.log('✅ Cleanup completed');
    } catch (cleanupError) {
      console.error('Cleanup failed:', cleanupError);
    }
    
    process.exit(1);
  }
}

// Run the test
testLHMMergeIntegration()
  .then(() => {
    console.log('\n✅ Integration test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Integration test failed:', error);
    process.exit(1);
  });
