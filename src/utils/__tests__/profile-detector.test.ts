import { detectProfileFromQuestion } from '../profile-detector';
import { Profile } from '../../types/domain.types';

describe('detectProfileFromQuestion', () => {
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

  describe('keyword matching', () => {
    it('should detect mother profile from "mom" keyword', () => {
      const result = detectProfileFromQuestion(
        "What is my mom's blood sugar level?",
        mockProfiles
      );
      expect(result?.relationship).toBe('mother');
      expect(result?.id).toBe('2');
    });

    it('should detect mother profile from "mother" keyword', () => {
      const result = detectProfileFromQuestion(
        "How is my mother's cholesterol?",
        mockProfiles
      );
      expect(result?.relationship).toBe('mother');
    });

    it('should detect father profile from "dad" keyword', () => {
      const result = detectProfileFromQuestion(
        "Show me dad's latest report",
        mockProfiles
      );
      expect(result?.relationship).toBe('father');
      expect(result?.id).toBe('3');
    });

    it('should detect self profile from "my" keyword', () => {
      const result = detectProfileFromQuestion(
        "What are my recent test results?",
        mockProfiles
      );
      expect(result?.relationship).toBe('self');
      expect(result?.id).toBe('1');
    });

    it('should detect spouse profile from "wife" keyword', () => {
      const result = detectProfileFromQuestion(
        "How is my wife's health?",
        mockProfiles
      );
      expect(result?.relationship).toBe('spouse');
      expect(result?.id).toBe('4');
    });
  });

  describe('name matching', () => {
    it('should detect profile by exact name match', () => {
      const result = detectProfileFromQuestion(
        "What is Mary Doe's blood pressure?",
        mockProfiles
      );
      expect(result?.name).toBe('Mary Doe');
      expect(result?.id).toBe('2');
    });

    it('should detect profile by first name only', () => {
      const result = detectProfileFromQuestion(
        "Show me Robert's cholesterol levels",
        mockProfiles
      );
      expect(result?.name).toBe('Robert Doe');
      expect(result?.id).toBe('3');
    });
  });

  describe('word boundary matching', () => {
    it('should not match partial words', () => {
      const result = detectProfileFromQuestion(
        "What about momentum in health trends?",
        mockProfiles,
        mockProfiles[0]
      );
      // Should not match "mom" in "momentum"
      expect(result?.relationship).toBe('self'); // Falls back to default
    });

    it('should match whole words only', () => {
      const result = detectProfileFromQuestion(
        "My mom is doing well",
        mockProfiles
      );
      expect(result?.relationship).toBe('mother');
    });
  });

  describe('ambiguous cases', () => {
    it('should return default profile when no keywords match', () => {
      const defaultProfile = mockProfiles[0];
      const result = detectProfileFromQuestion(
        "What are the latest health trends?",
        mockProfiles,
        defaultProfile
      );
      expect(result).toBe(defaultProfile);
    });

    it('should return null when no match and no default provided', () => {
      const result = detectProfileFromQuestion(
        "What are the latest health trends?",
        mockProfiles
      );
      expect(result).toBeNull();
    });

    it('should prioritize first keyword match when multiple keywords present', () => {
      const result = detectProfileFromQuestion(
        "Compare my mom's and dad's cholesterol",
        mockProfiles
      );
      // Should match "mom" first
      expect(result?.relationship).toBe('mother');
    });
  });

  describe('case insensitivity', () => {
    it('should match keywords regardless of case', () => {
      const result = detectProfileFromQuestion(
        "What is MOM's blood sugar?",
        mockProfiles
      );
      expect(result?.relationship).toBe('mother');
    });

    it('should match names regardless of case', () => {
      const result = detectProfileFromQuestion(
        "Show me MARY DOE's results",
        mockProfiles
      );
      expect(result?.name).toBe('Mary Doe');
    });
  });

  describe('edge cases', () => {
    it('should handle empty question', () => {
      const result = detectProfileFromQuestion('', mockProfiles, mockProfiles[0]);
      expect(result).toBe(mockProfiles[0]);
    });

    it('should handle empty profiles array', () => {
      const result = detectProfileFromQuestion('What is my health status?', []);
      expect(result).toBeNull();
    });

    it('should handle profile with relationship not in user profiles', () => {
      const result = detectProfileFromQuestion(
        "What about grandma's health?",
        mockProfiles,
        mockProfiles[0]
      );
      // No grandmother profile exists, should fall back to default
      expect(result).toBe(mockProfiles[0]);
    });
  });
});
