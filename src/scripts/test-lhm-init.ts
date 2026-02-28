/**
 * Test script for LHM initialization
 * Tests the skeleton LHM template generation and profile creation
 */

import { LHM_SKELETON_TEMPLATE } from '../constants/lhm-templates';

console.log('=== Testing LHM Skeleton Template ===\n');

// Test data
const testProfile = {
  name: 'John Doe',
  age: '45',
  gender: 'Male',
  lastUpdated: '2025-02-28',
};

// Generate skeleton LHM
const markdown = LHM_SKELETON_TEMPLATE
  .replace(/{{name}}/g, testProfile.name)
  .replace(/{{age}}/g, testProfile.age)
  .replace(/{{gender}}/g, testProfile.gender)
  .replace(/{{lastUpdated}}/g, testProfile.lastUpdated);

console.log('Generated LHM Skeleton:\n');
console.log(markdown);
console.log('\n=== Validation Checks ===\n');

// Validate structure
const requiredSections = [
  '# Health Report —',
  '## Patient Profile',
  '## Current Health Snapshot',
  '## Historical Trends',
  '## Key Observations & Concerns',
  '## Report Log',
];

let allSectionsPresent = true;
for (const section of requiredSections) {
  const present = markdown.includes(section);
  console.log(`✓ ${section}: ${present ? 'PRESENT' : 'MISSING'}`);
  if (!present) allSectionsPresent = false;
}

// Check metadata
const hasMetadata = markdown.includes('**Last Updated:**') &&
                    markdown.includes('**Reports on File:**') &&
                    markdown.includes('**Last Checkup:**') &&
                    markdown.includes('**Next Checkup Recommended:**');

console.log(`✓ Metadata fields: ${hasMetadata ? 'PRESENT' : 'MISSING'}`);

// Check patient profile fields
const hasProfileFields = markdown.includes('**Age:**') &&
                         markdown.includes('**Gender:**') &&
                         markdown.includes('**Blood Group:**') &&
                         markdown.includes('**Known Conditions:**') &&
                         markdown.includes('**Medications:**') &&
                         markdown.includes('**Allergies:**');

console.log(`✓ Patient profile fields: ${hasProfileFields ? 'PRESENT' : 'MISSING'}`);

// Token count estimate
const tokensApprox = Math.round(markdown.length / 4);
console.log(`\n✓ Approximate token count: ${tokensApprox}`);
console.log(`✓ Character count: ${markdown.length}`);

// Final result
console.log('\n=== Test Result ===\n');
if (allSectionsPresent && hasMetadata && hasProfileFields) {
  console.log('✅ LHM skeleton template is valid and follows lhm.md structure');
} else {
  console.log('❌ LHM skeleton template has issues');
}
