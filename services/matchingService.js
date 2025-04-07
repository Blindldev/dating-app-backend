const calculateCompatibilityScore = (profile1, profile2) => {
  let score = 0;
  const maxScore = 100;
  
  // Basic matching criteria with null checks
  const criteria = {
    age: (p1, p2) => {
      if (!p1.age || !p2.age) return 0;
      const ageDiff = Math.abs(p1.age - p2.age);
      if (ageDiff <= 2) return 10;
      if (ageDiff <= 5) return 5;
      return 0;
    },
    location: (p1, p2) => {
      if (!p1.location || !p2.location) return 0;
      return p1.location === p2.location ? 10 : 0;
    },
    relationshipGoals: (p1, p2) => {
      if (!p1.relationshipGoals || !p2.relationshipGoals) return 0;
      return p1.relationshipGoals === p2.relationshipGoals ? 15 : 0;
    },
    interests: (p1, p2) => {
      if (!p1.interests || !p2.interests || !Array.isArray(p1.interests) || !Array.isArray(p2.interests)) return 0;
      const commonInterests = p1.interests.filter(interest => 
        p2.interests.includes(interest)
      );
      return (commonInterests.length / Math.max(p1.interests.length, p2.interests.length)) * 20;
    },
    hobbies: (p1, p2) => {
      if (!p1.hobbies || !p2.hobbies || !Array.isArray(p1.hobbies) || !Array.isArray(p2.hobbies)) return 0;
      const commonHobbies = p1.hobbies.filter(hobby => 
        p2.hobbies.includes(hobby)
      );
      return (commonHobbies.length / Math.max(p1.hobbies.length, p2.hobbies.length)) * 15;
    },
    languages: (p1, p2) => {
      if (!p1.languages || !p2.languages || !Array.isArray(p1.languages) || !Array.isArray(p2.languages)) return 0;
      const commonLanguages = p1.languages.filter(language => 
        p2.languages.includes(language)
      );
      return (commonLanguages.length / Math.max(p1.languages.length, p2.languages.length)) * 10;
    },
    smoking: (p1, p2) => {
      if (!p1.smoking || !p2.smoking) return 0;
      return p1.smoking === p2.smoking ? 10 : 0;
    },
    drinking: (p1, p2) => {
      if (!p1.drinking || !p2.drinking) return 0;
      return p1.drinking === p2.drinking ? 10 : 0;
    }
  };

  // Calculate score for each criterion
  Object.values(criteria).forEach(criterion => {
    score += criterion(profile1, profile2);
  });

  return Math.min(score, maxScore);
};

const findMatches = (profiles, currentProfile, limit = 10) => {
  if (!profiles || !Array.isArray(profiles) || !currentProfile) {
    return [];
  }

  // Filter out the current profile and profiles that don't match basic criteria
  const potentialMatches = profiles.filter(profile => 
    profile &&
    profile.id !== currentProfile.id &&
    profile.gender &&
    currentProfile.lookingFor &&
    profile.lookingFor &&
    currentProfile.gender &&
    profile.lookingFor === currentProfile.gender &&
    currentProfile.lookingFor === profile.gender
  );

  if (potentialMatches.length === 0) {
    return [];
  }

  // Calculate compatibility scores
  const matchesWithScores = potentialMatches.map(profile => ({
    profile,
    compatibilityScore: calculateCompatibilityScore(currentProfile, profile)
  }));

  // Sort by compatibility score and return top matches
  return matchesWithScores
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    .slice(0, limit)
    .map(match => ({
      ...match.profile,
      compatibilityScore: match.compatibilityScore
    }));
};

module.exports = {
  calculateCompatibilityScore,
  findMatches
}; 