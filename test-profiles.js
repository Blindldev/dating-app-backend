const fetch = require('node-fetch');

const testProfiles = [
  {
    name: 'Alex Thompson',
    age: 28,
    location: 'Lincoln Park',
    occupation: 'Software Engineer',
    education: "Bachelor's Degree",
    bio: 'Tech enthusiast who loves hiking and trying new restaurants. Always up for an adventure!',
    interests: 'Travel, Cooking, Gaming',
    hobbies: 'Swimming, Guitar, Chess',
    languages: 'English, Spanish',
    relationshipGoals: 'Serious Relationship',
    smoking: 'None',
    drinking: 'None',
    firstDateIdeas: 'Grab coffee at a local cafe',
    password: 'test123'
  },
  {
    name: 'Sarah Chen',
    age: 25,
    location: 'Wicker Park',
    occupation: 'Graphic Designer',
    education: "Master's Degree",
    bio: 'Creative soul with a passion for art and music. Looking for someone to explore the city with!',
    interests: 'Art, Music, Photography',
    hobbies: 'Painting, Piano, Yoga',
    languages: 'English, Mandarin',
    relationshipGoals: 'Casual Dating',
    smoking: 'None',
    drinking: 'Just Drink',
    firstDateIdeas: 'Visit a museum',
    password: 'test123'
  },
  {
    name: 'Marcus Johnson',
    age: 31,
    location: 'West Loop',
    occupation: 'Chef',
    education: 'Associate Degree',
    bio: 'Culinary artist by trade, sports enthusiast by heart. Love making people smile through food.',
    interests: 'Cooking, Fitness, Sports',
    hobbies: 'Basketball, Cooking, Dancing',
    languages: 'English, French',
    relationshipGoals: 'Marriage',
    smoking: 'None',
    drinking: 'Just Drink',
    firstDateIdeas: 'Take a cooking class',
    password: 'test123'
  }
];

async function createTestProfiles() {
  console.log('Starting test profile creation...');
  
  for (const profile of testProfiles) {
    try {
      const response = await fetch('http://localhost:3002/api/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create profile');
      }

      const data = await response.json();
      console.log(`✅ Profile created successfully for ${profile.name}`);
      console.log('Profile data:', data);
      console.log('-------------------');
    } catch (error) {
      console.error(`❌ Failed to create profile for ${profile.name}:`, error.message);
    }
  }

  // Verify profiles were created
  try {
    const response = await fetch('http://localhost:3002/api/profiles');
    const allProfiles = await response.json();
    console.log('\nTotal profiles created:', allProfiles.length);
    console.log('All profiles:', allProfiles);
  } catch (error) {
    console.error('Failed to fetch profiles:', error.message);
  }
}

// Run the tests
createTestProfiles(); 