/**
 * Initialize LHM for a specific profile
 */

import '../env';
import { lhmRepository } from '../repositories/lhm.repository';
import profileRepository from '../repositories/profile.repository';

const profileId = process.argv[2];

if (!profileId) {
  console.error('Usage: tsx src/scripts/init-lhm-for-profile.ts <profile-id>');
  process.exit(1);
}

async function initLHM() {
  console.log(`Initializing LHM for profile: ${profileId}`);
  
  try {
    // Check if LHM already exists
    const existing = await lhmRepository.findByProfileId(profileId);
    
    if (existing) {
      console.log('✅ LHM already exists for this profile');
      console.log(`   Version: ${existing.version}`);
      console.log(`   Last updated: ${existing.lastUpdatedAt}`);
      return;
    }
    
    // Get profile to find userId
    const profile = await profileRepository.findById(profileId);
    if (!profile) {
      console.error('❌ Profile not found');
      process.exit(1);
    }
    
    // Create initial LHM
    const lhm = await lhmRepository.create({
      profileId,
      userId: profile.userId,
      markdown: '# Living Health Markdown\n\nNo reports uploaded yet.',
      tokensApprox: 10,
    });
    
    console.log('✅ LHM initialized successfully');
    console.log(`   Profile ID: ${lhm.profileId}`);
    console.log(`   Version: ${lhm.version}`);
  } catch (error) {
    console.error('❌ Failed to initialize LHM:', error);
    process.exit(1);
  }
}

initLHM();
