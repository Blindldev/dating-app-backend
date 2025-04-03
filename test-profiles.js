const testProfiles = [
  {
    id: '1',
    email: 'alex.thompson@example.com',
    password: 'test123',
    name: 'Alex Thompson',
    age: 28,
    gender: 'Male',
    lookingFor: 'Women',
    location: 'Lincoln Park, Chicago',
    occupation: 'Software Engineer',
    education: "Bachelor's in Computer Science",
    bio: 'Tech enthusiast who loves hiking and trying new restaurants. Always up for an adventure!',
    interests: ['Travel', 'Cooking', 'Gaming', 'Hiking', 'Photography'],
    hobbies: ['Swimming', 'Guitar', 'Chess', 'Rock Climbing'],
    languages: ['English', 'Spanish'],
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop'
    ],
    relationshipGoals: 'Long-term Relationship',
    smoking: 'Never',
    drinking: 'Socially',
    firstDateIdeas: ['Coffee shop', 'Art gallery', 'Rock climbing'],
    status: 'active',
    createdAt: new Date().toISOString(),
    settings: {
      notifications: true,
      profileVisibility: 'public',
      showOnlineStatus: true
    }
  },
  {
    id: '2',
    email: 'sarah.chen@example.com',
    password: 'test123',
    name: 'Sarah Chen',
    age: 25,
    gender: 'Female',
    lookingFor: 'Men',
    location: 'Wicker Park, Chicago',
    occupation: 'Graphic Designer',
    education: "Master's in Fine Arts",
    bio: 'Creative soul with a passion for art and music. Looking for someone to explore the city with!',
    interests: ['Art', 'Music', 'Photography', 'Fashion', 'Travel'],
    hobbies: ['Painting', 'Piano', 'Yoga', 'Cooking'],
    languages: ['English', 'Mandarin'],
    photos: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop'
    ],
    relationshipGoals: 'Dating',
    smoking: 'Never',
    drinking: 'Socially',
    firstDateIdeas: ['Art museum', 'Live music', 'Cooking class'],
    status: 'active',
    createdAt: new Date().toISOString(),
    settings: {
      notifications: true,
      profileVisibility: 'public',
      showOnlineStatus: true
    }
  },
  {
    id: '3',
    email: 'marcus.johnson@example.com',
    password: 'test123',
    name: 'Marcus Johnson',
    age: 31,
    gender: 'Male',
    lookingFor: 'Women',
    location: 'West Loop, Chicago',
    occupation: 'Chef',
    education: 'Culinary Institute of America',
    bio: 'Culinary artist by trade, sports enthusiast by heart. Love making people smile through food.',
    interests: ['Cooking', 'Sports', 'Travel', 'Wine Tasting', 'Fitness'],
    hobbies: ['Basketball', 'Wine Tasting', 'Running', 'Photography'],
    languages: ['English', 'French'],
    photos: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop'
    ],
    relationshipGoals: 'Marriage',
    smoking: 'Never',
    drinking: 'Socially',
    firstDateIdeas: ['Cooking class', 'Wine tasting', 'Farmers market'],
    status: 'active',
    createdAt: new Date().toISOString(),
    settings: {
      notifications: true,
      profileVisibility: 'public',
      showOnlineStatus: true
    }
  }
];

module.exports = { testProfiles }; 