const express = require('express');
const cors = require('cors');
const testProfiles = require('./test-profiles');

const app = express();
const port = process.env.PORT || 3002;

// Configure CORS for production
const allowedOrigins = [
  'https://blindl-gsb77yru9-blindls-projects.vercel.app', // Vercel frontend
  'http://localhost:3000', // Local development
  process.env.FRONTEND_URL, // Environment variable for custom domain
  'https://*.onrender.com' // Render domains
].filter(Boolean); // Remove any undefined values

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin matches any of the allowed patterns
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        const pattern = new RegExp('^' + allowedOrigin.replace('*', '.*') + '$');
        return pattern.test(origin);
      }
      return allowedOrigin === origin;
    });
    
    if (!isAllowed) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Add a test endpoint to verify server is accessible
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Server is running and accessible',
    timestamp: new Date().toISOString()
  });
});

// Add a health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Initial test profiles with complete data
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
  },
  {
    id: '4',
    email: 'pottery.chicago@example.com',
    password: 'test123',
    name: 'Mike',
    age: 25,
    gender: 'Male',
    lookingFor: 'Women',
    location: 'Andersonville, Chicago',
    occupation: 'Pottery Artist',
    education: "Bachelor's in Fine Arts",
    bio: 'Passionate about creating beautiful pottery pieces and sharing the joy of ceramics. Love exploring Chicago\'s art scene and finding inspiration in everyday moments.',
    interests: ['Pottery', 'Art History', 'Local Markets', 'Coffee Culture', 'Photography'],
    hobbies: ['Pottery Making', 'Photography', 'Bike Riding', 'Art Gallery Visits'],
    languages: ['English', 'Spanish'],
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=400&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&h=400&q=80'
    ],
    relationshipGoals: 'Serious Relationship',
    smoking: 'Never',
    drinking: 'Socially',
    firstDateIdeas: ['Visit a pottery studio', 'Coffee at a local cafe', 'Art gallery tour'],
    status: 'active',
    createdAt: new Date().toISOString(),
    settings: {
      notifications: true,
      profileVisibility: 'public',
      showOnlineStatus: true
    }
  }
];

// Store profiles in memory (replace with database in production)
let profiles = [...testProfiles];

// Log profiles for verification
console.log('Loaded test profiles:', profiles.map(p => ({
  email: p.email,
  name: p.name,
  hasCompleteProfile: Boolean(p.bio && p.interests && p.hobbies)
})));

// Sign in endpoint
app.post('/api/signin', (req, res) => {
  const { email, password, confirmPassword } = req.body;
  
  // Check if this is a new account attempt
  if (confirmPassword) {
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    // For new accounts, return success to allow profile creation
    return res.json({ 
      message: 'New account created',
      email,
      isNewAccount: true
    });
  }
  
  const profile = profiles.find(p => p.email === email && p.password === password);
  
  if (profile) {
    // Check if it's a test profile
    const isTestProfile = testProfiles.some(tp => tp.email === email);
    
    // For test profiles, return complete profile data
    if (isTestProfile) {
      console.log('Test profile found:', profile.email);
      const { password, ...profileData } = profile;
      res.json(profileData);
    } else {
      // For regular profiles, check if profile is complete
      const { password, ...profileData } = profile;
      res.json({
        ...profileData,
        isProfileComplete: Boolean(profile.bio && profile.interests && profile.hobbies)
      });
    }
  } else {
    res.status(401).json({ error: 'Invalid email or password' });
  }
});

// Profile creation endpoint
app.post('/api/profiles', async (req, res) => {
  try {
    const profileData = req.body;
    
    // Validate required fields
    const requiredFields = [
      'name', 'age', 'gender', 'lookingFor', 'location', 'occupation', 
      'education', 'bio', 'interests', 'hobbies', 'languages', 
      'relationshipGoals', 'smoking', 'drinking', 'firstDateIdeas'
    ];

    const missingFields = requiredFields.filter(field => !profileData[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Create new profile
    const newProfile = {
      id: Date.now().toString(),
      ...profileData,
      email: `${profileData.name.toLowerCase().replace(' ', '.')}@example.com`,
      createdAt: new Date().toISOString(),
      status: 'active',
      settings: {
        notifications: true,
        profileVisibility: 'public',
        showOnlineStatus: true
      }
    };

    profiles.push(newProfile);

    // Remove sensitive data before sending response
    const { password, ...profileResponse } = newProfile;
    res.status(201).json(profileResponse);
  } catch (error) {
    console.error('Profile creation error:', error);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

// Get all profiles
app.get('/api/profiles', (req, res) => {
  // Remove sensitive data before sending response
  const safeProfiles = profiles.map(({ password, ...profile }) => profile);
  res.json(safeProfiles);
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
}).on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
}); 