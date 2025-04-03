const express = require('express');
const cors = require('cors');
const { testProfiles } = require('./test-profiles');

const app = express();
const port = process.env.PORT || 3002;

// Configure CORS for production
const allowedOrigins = [
  'https://blindl-gsb77yru9-blindls-projects.vercel.app', // Vercel frontend
  'http://localhost:3000', // Local development
  process.env.FRONTEND_URL // Environment variable for custom domain
].filter(Boolean); // Remove any undefined values

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
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

let server;
if (require.main === module) {
  const HOST = '0.0.0.0'; // Listen on all network interfaces
  server = app.listen(port, HOST, () => {
    console.log(`Server is running on http://${HOST}:${port}`);
    console.log('You can access the server from your mobile device using your computer\'s IP address');
    console.log('Test the connection by visiting: http://192.168.12.59:3002/api/test');
  });
}

module.exports = { app, server }; 