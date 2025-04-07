const { calculateCompatibilityScore, findMatches } = require('../services/matchingService');

describe('Matching Service', () => {
  const testProfile1 = {
    id: '1',
    name: 'Test User 1',
    age: 25,
    gender: 'Male',
    lookingFor: 'Female',
    location: 'Chicago',
    interests: ['Coding', 'Reading', 'Hiking'],
    hobbies: ['Gaming', 'Photography'],
    languages: ['English', 'Spanish'],
    relationshipGoals: 'Dating',
    smoking: 'Never',
    drinking: 'Socially'
  };

  const testProfile2 = {
    id: '2',
    name: 'Test User 2',
    age: 26,
    gender: 'Female',
    lookingFor: 'Male',
    location: 'Chicago',
    interests: ['Coding', 'Reading', 'Photography'],
    hobbies: ['Gaming', 'Hiking'],
    languages: ['English', 'Spanish'],
    relationshipGoals: 'Dating',
    smoking: 'Never',
    drinking: 'Socially'
  };

  const testProfile3 = {
    id: '3',
    name: 'Test User 3',
    age: 30,
    gender: 'Female',
    lookingFor: 'Male',
    location: 'New York',
    interests: ['Cooking', 'Travel'],
    hobbies: ['Yoga', 'Painting'],
    languages: ['English'],
    relationshipGoals: 'Marriage',
    smoking: 'Sometimes',
    drinking: 'Never'
  };

  describe('calculateCompatibilityScore', () => {
    test('should calculate high score for very compatible profiles', () => {
      const score = calculateCompatibilityScore(testProfile1, testProfile2);
      expect(score).toBeGreaterThan(80);
    });

    test('should calculate low score for incompatible profiles', () => {
      const score = calculateCompatibilityScore(testProfile1, testProfile3);
      expect(score).toBeLessThan(50);
    });

    test('should handle missing fields gracefully', () => {
      const partialProfile = { ...testProfile1 };
      delete partialProfile.interests;
      const score = calculateCompatibilityScore(partialProfile, testProfile2);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('findMatches', () => {
    const allProfiles = [testProfile1, testProfile2, testProfile3];

    test('should return matches sorted by compatibility', () => {
      const matches = findMatches(allProfiles, testProfile1);
      expect(matches.length).toBe(2);
      expect(matches[0].id).toBe('2'); // Most compatible
      expect(matches[1].id).toBe('3'); // Less compatible
    });

    test('should respect the limit parameter', () => {
      const matches = findMatches(allProfiles, testProfile1, 1);
      expect(matches.length).toBe(1);
    });

    test('should filter out self and incompatible genders', () => {
      const matches = findMatches(allProfiles, testProfile1);
      expect(matches.some(m => m.id === testProfile1.id)).toBe(false);
      expect(matches.every(m => m.gender === 'Female')).toBe(true);
    });
  });
}); 