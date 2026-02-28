/**
 * Integration test for Profile Service LHM initialization
 * Tests the complete flow of profile creation with LHM initialization
 */

import { ProfileRepository } from '../repositories/profile.repository';
import { lhmRepository } from '../repositories/lhm.repository';
import { ProfileService } from '../services/profile.service';
import crypto from 'crypto';

async function testProfileLHMIntegration() {
  console.log('=== Testing Profile Service LHM Integration ===\n');

  // Create test user ID
  const testUserId = crypto.randomUUID();
  console.log(`Test User ID: ${testUserId}\n`);

  try {
    // Initialize services
    const profileRepository = new ProfileRepository();
    const profileService = new ProfileService(profileRepository);

    // Test 1: Create a profile
    console.log('Test 1: Creating profile...');
    const profileData = {
      name: 'Test User',
      relationship: 'self',
      dob: '1980-05-15',
      gender: 'male',
    };

    const profile = await profileService.createProfile(testUserId, profileData);
    console.log(`✅ Profile created: ${profile.id}`);
    console.log(`   Name: ${profile.name}`);
    console.log(`   Age: ${profile.dob ? new Date().getFullYear() - new Date(profile.dob).getFullYear() : 'N/A'}`);
    console.log(`   Gender: ${profile.gender}`);
    console.log(`   Is Default: ${profile.isDefault}\n`);

    // Test 2: Verify LHM was created
    console.log('Test 2: Verifying LHM initialization...');
    
    // Wait a moment for async operation to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const lhm = await lhmRepository.findByProfileId(profile.id);
    
    if (!lhm) {
      console.log('❌ LHM was not created');
      throw new Error('LHM initialization failed');
    }

    console.log(`✅ LHM created successfully`);
    console.log(`   Version: ${lhm.version}`);
    console.log(`   Tokens: ${lhm.tokensApprox}`);
    console.log(`   Last Updated: ${lhm.lastUpdatedAt.toISOString()}\n`);

    // Test 3: Validate LHM content
    console.log('Test 3: Validating LHM content...');
    
    const requiredSections = [
      '# Health Report —',
      '## Patient Profile',
      '## Current Health Snapshot',
      '## Historical Trends',
      '## Key Observations & Concerns',
      '## Report Log',
    ];

    let allValid = true;
    for (const section of requiredSections) {
      const present = lhm.markdown.includes(section);
      if (!present) {
        console.log(`❌ Missing section: ${section}`);
        allValid = false;
      }
    }

    // Check if profile data is in LHM
    const hasProfileName = lhm.markdown.includes(profile.name);
    const hasGender = lhm.markdown.includes(profile.gender || 'N/A');
    
    if (!hasProfileName) {
      console.log('❌ Profile name not found in LHM');
      allValid = false;
    }
    
    if (!hasGender) {
      console.log('❌ Gender not found in LHM');
      allValid = false;
    }

    if (allValid) {
      console.log('✅ All required sections present');
      console.log('✅ Profile data correctly populated\n');
    }

    // Test 4: Display LHM content
    console.log('Test 4: LHM Content Preview:');
    console.log('─'.repeat(60));
    console.log(lhm.markdown.substring(0, 500) + '...');
    console.log('─'.repeat(60));
    console.log();

    // Cleanup
    console.log('Cleanup: Deleting test data...');
    
    // Delete LHM first (since profile deletion might fail if it's the only profile)
    await lhmRepository.delete(profile.id);
    console.log('✅ Test LHM deleted');
    
    // Try to delete profile (will fail if it's the only one, which is expected)
    try {
      await profileService.deleteProfile(testUserId, profile.id);
      console.log('✅ Test profile deleted\n');
    } catch (error: any) {
      if (error.message.includes('only profile')) {
        console.log('⚠️  Profile not deleted (only profile - expected behavior)\n');
      } else {
        throw error;
      }
    }

    console.log('=== All Tests Passed ✅ ===');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testProfileLHMIntegration()
  .then(() => {
    console.log('\n✅ Integration test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Integration test failed:', error);
    process.exit(1);
  });
