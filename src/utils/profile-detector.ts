import { Profile } from '../types/domain.types';

interface ProfileKeywords {
  relationship: string;
  keywords: string[];
}

// Ordered by specificity - more specific relationships first
// This ensures "my mom" matches "mother" before "self"
const PROFILE_KEYWORDS: ProfileKeywords[] = [
  { relationship: 'grandmother', keywords: ['grandma', 'grandmother', 'nana', 'granny', 'gran'] },
  { relationship: 'grandfather', keywords: ['grandpa', 'grandfather', 'granddad', 'gramps'] },
  { relationship: 'mother', keywords: ['mom', 'mother', 'mama', 'mum', 'mummy', 'mommy'] },
  { relationship: 'father', keywords: ['dad', 'father', 'papa', 'daddy', 'pop'] },
  { relationship: 'spouse', keywords: ['wife', 'husband', 'spouse', 'partner'] },
  { relationship: 'self', keywords: ['me', 'my', 'i', 'myself'] },
];

/**
 * Detects which profile a question is referring to based on keyword matching
 * 
 * Detection strategy (in order of priority):
 * 1. Full name match (e.g., "Mary Doe")
 * 2. Unique name part match (e.g., "Mary" if no other profile has "Mary")
 * 3. Relationship keyword match (e.g., "mom", "dad", "my")
 * 4. Default profile fallback
 * 
 * @param question The user's question
 * @param profiles List of user's profiles
 * @param defaultProfile Optional default profile to use if no match found
 * @returns The detected profile or default profile
 */
export function detectProfileFromQuestion(
  question: string,
  profiles: Profile[],
  defaultProfile?: Profile
): Profile | null {
  const lowerQuestion = question.toLowerCase();
  
  // First pass: Try to match full profile names (most specific)
  for (const profile of profiles) {
    const nameRegex = new RegExp(`\\b${escapeRegex(profile.name)}\\b`, 'i');
    if (nameRegex.test(question)) {
      return profile;
    }
  }
  
  // Second pass: Try to match individual name parts (first name, last name)
  // Only match if the name part is unique across profiles
  for (const profile of profiles) {
    const nameParts = profile.name.split(/\s+/);
    for (const part of nameParts) {
      if (part.length > 2) { // Avoid matching very short names
        // Check if this name part is unique to this profile
        const isUnique = !profiles.some(
          p => p.id !== profile.id && p.name.toLowerCase().includes(part.toLowerCase())
        );
        
        if (isUnique) {
          const partRegex = new RegExp(`\\b${escapeRegex(part)}\\b`, 'i');
          if (partRegex.test(question)) {
            return profile;
          }
        }
      }
    }
  }
  
  // Third pass: Try to match keywords to relationships
  for (const { relationship, keywords } of PROFILE_KEYWORDS) {
    for (const keyword of keywords) {
      // Use word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i');
      if (regex.test(lowerQuestion)) {
        // Find profile with matching relationship
        const matchedProfile = profiles.find(p => p.relationship === relationship);
        if (matchedProfile) {
          return matchedProfile;
        }
      }
    }
  }
  
  // Return default profile if no match found
  return defaultProfile || null;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
