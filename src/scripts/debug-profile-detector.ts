import { detectProfileFromQuestion } from '../utils/profile-detector';
import { Profile } from '../types/domain.types';

const mockProfiles: Profile[] = [
  {
    id: '1',
    userId: 'user-1',
    name: 'John Doe',
    relationship: 'self',
    isDefault: true,
    createdAt: new Date(),
  },
  {
    id: '2',
    userId: 'user-1',
    name: 'Mary Doe',
    relationship: 'mother',
    isDefault: false,
    createdAt: new Date(),
  },
];

const question = "What is Mary Doe's blood pressure?";
console.log('Question:', question);
console.log('Profiles:', mockProfiles.map(p => ({ name: p.name, relationship: p.relationship })));

const result = detectProfileFromQuestion(question, mockProfiles, mockProfiles[0]);
console.log('Result:', result ? { name: result.name, relationship: result.relationship } : 'null');

// Manual test
const nameRegex = new RegExp(`\\bMary Doe\\b`, 'i');
console.log('\nManual regex test for "Mary Doe":', nameRegex.test(question));

const maryRegex = new RegExp(`\\bMary\\b`, 'i');
console.log('Manual regex test for "Mary":', maryRegex.test(question));
