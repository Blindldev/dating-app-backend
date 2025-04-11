const testProfiles = [
  {
    id: 1,
    email: 'alex.thompson@example.com',
    password: 'test123',
    name: 'Alex Thompson',
    age: 28,
    gender: 'Male',
    lookingFor: 'Dating',
    location: 'Lincoln Park',
    occupation: 'Software Engineer',
    education: 'BS Computer Science',
    bio: 'Love hiking, photography, and trying new restaurants. Looking for someone to share adventures with.',
    interests: ['Hiking', 'Photography', 'Food', 'Technology', 'Travel'],
    hobbies: ['Coding', 'Photography', 'Cooking'],
    languages: ['English', 'Spanish'],
    photos: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
    relationshipGoals: 'Long-term relationship',
    smoking: 'Never',
    drinking: 'Socially',
    firstDateIdeas: ['Coffee shop', 'Art museum', 'Hiking'],
    status: 'active',
    createdAt: new Date().toISOString(),
    settings: {
      notifications: true,
      emailUpdates: true
    }
  },
  {
    id: 2,
    email: 'sarah.chen@example.com',
    password: 'test123',
    name: 'Sarah Chen',
    age: 26,
    gender: 'Female',
    lookingFor: 'Both',
    location: 'West Loop',
    occupation: 'Marketing Manager',
    education: 'MBA Marketing',
    bio: 'Creative soul who loves art, music, and exploring the city. Looking for meaningful connections.',
    interests: ['Art', 'Music', 'Food', 'Travel', 'Photography'],
    hobbies: ['Painting', 'Playing Piano', 'Blogging'],
    languages: ['English', 'Mandarin'],
    photos: ['https://example.com/photo3.jpg', 'https://example.com/photo4.jpg'],
    relationshipGoals: 'Open to possibilities',
    smoking: 'Never',
    drinking: 'Occasionally',
    firstDateIdeas: ['Art gallery', 'Concert', 'Food tour'],
    status: 'active',
    createdAt: new Date().toISOString(),
    settings: {
      notifications: true,
      emailUpdates: true
    }
  },
  {
    id: 3,
    email: 'marcus.johnson@example.com',
    password: 'test123',
    name: 'Marcus Johnson',
    age: 30,
    gender: 'Male',
    lookingFor: 'Dating',
    location: 'River North',
    occupation: 'Financial Analyst',
    education: 'MS Finance',
    bio: 'Fitness enthusiast and foodie. Looking for someone to share workouts and restaurant hopping with.',
    interests: ['Fitness', 'Food', 'Finance', 'Travel', 'Technology'],
    hobbies: ['Weightlifting', 'Cooking', 'Reading'],
    languages: ['English', 'French'],
    photos: ['https://example.com/photo5.jpg', 'https://example.com/photo6.jpg'],
    relationshipGoals: 'Serious relationship',
    smoking: 'Never',
    drinking: 'Socially',
    firstDateIdeas: ['Gym session', 'New restaurant', 'Coffee shop'],
    status: 'active',
    createdAt: new Date().toISOString(),
    settings: {
      notifications: true,
      emailUpdates: true
    }
  }
];

module.exports = { testProfiles }; 