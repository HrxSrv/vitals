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
  {
    id: '3',
    userId: 'user-1',
    name: 'Robert Doe',
    relationship: 'father',
    isDefault: false,
    createdAt: new Date(),
  },
  {
    id: '4',
    userId: 'user-1',
    name: 'Jane Smith',
    relationship: 'spouse',
    isDefault: false,
    createdAt: new Date(),
  },
];

function testCase(description: string, question: string, expectedRelationship: string | null) {
  const result = detectProfileFromQuestion(question, mockProfiles, mockProfiles[0]);
  const passed = result?.relationship === expectedRelationship;
  console.log(`${passed ? '✓' : '✗'} ${description}`);
  if (!passed) {
    console.log(`  Expected: ${expectedRelationship}, Got: ${result?.relationship || 'null'}`);
  }
}

console.log('Testing Profile Detection Utility\n');

console.log('Keyword Matching:');
testCase('Detect mother from "mom"', "What is my mom's blood sugar level?", 'mother');
testCase('Detect mother from "mother"', "How is my mother's cholesterol?", 'mother');
testCase('Detect father from "dad"', "Show me dad's latest report", 'father');
testCase('Detect self from "my"', "What are my recent test results?", 'self');
testCase('Detect spouse from "wife"', "How is my wife's health?", 'spouse');

console.log('\nName Matching:');
testCase('Detect by exact name', "What is Mary Doe's blood pressure?", 'mother');
testCase('Detect by first name', "Show me Robert's cholesterol levels", 'father');

console.log('\nWord Boundary Matching:');
const momentumResult = detectProfileFromQuestion(
  "What about momentum in health trends?",
  mockProfiles,
  mockProfiles[0]
);
console.log(`${momentumResult?.relationship === 'self' ? '✓' : '✗'} Should not match "mom" in "momentum"`);

testCase('Match whole words only', "My mom is doing well", 'mother');

console.log('\nAmbiguous Cases:');
const noMatchResult = detectProfileFromQuestion(
  "What are the latest health trends?",
  mockProfiles,
  mockProfiles[0]
);
console.log(`${noMatchResult?.relationship === 'self' ? '✓' : '✗'} Return default when no match`);

const nullResult = detectProfileFromQuestion(
  "What are the latest health trends?",
  mockProfiles
);
console.log(`${nullResult === null ? '✓' : '✗'} Return null when no match and no default`);

testCase('Prioritize first keyword', "Compare my mom's and dad's cholesterol", 'mother');

console.log('\nCase Insensitivity:');
testCase('Match uppercase keyword', "What is MOM's blood sugar?", 'mother');
testCase('Match uppercase name', "Show me MARY DOE's results", 'mother');

console.log('\nEdge Cases:');
const emptyResult = detectProfileFromQuestion('', mockProfiles, mockProfiles[0]);
console.log(`${emptyResult?.id === '1' ? '✓' : '✗'} Handle empty question`);

const emptyProfilesResult = detectProfileFromQuestion('What is my health status?', []);
console.log(`${emptyProfilesResult === null ? '✓' : '✗'} Handle empty profiles array`);

const grandmaResult = detectProfileFromQuestion(
  "What about grandma's health?",
  mockProfiles,
  mockProfiles[0]
);
console.log(`${grandmaResult?.relationship === 'self' ? '✓' : '✗'} Fall back to default for missing relationship`);

console.log('\n✅ Profile detection utility test completed');
