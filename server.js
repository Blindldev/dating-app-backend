require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { OAuth2Client } = require('google-auth-library');
const { testProfiles } = require('./test-profiles');
const { findMatches } = require('./services/matchingService');

const app = express();
const PORT = process.env.PORT || 3002;

// Configure CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400
}));

// Add security headers
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  next();
});

app.use(express.json());

// Initialize Google OAuth client
const GOOGLE_CLIENT_ID = '1052505070503-3v2qk7vq2q2q2q2q2q2q2q2q2q2q2q2.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Middleware to verify Google token
const verifyGoogleToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'No token provided' });
    }

    console.log('Verifying token with client ID:', GOOGLE_CLIENT_ID);
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    
    // Verify the token was issued to our application
    if (payload.aud !== GOOGLE_CLIENT_ID) {
      console.error('Token audience mismatch:', {
        expected: GOOGLE_CLIENT_ID,
        received: payload.aud
      });
      return res.status(401).json({ error: 'Invalid token audience' });
    }

    // Verify the token was issued by Google
    if (payload.iss !== 'https://accounts.google.com' && 
        payload.iss !== 'accounts.google.com') {
      return res.status(401).json({ error: 'Invalid token issuer' });
    }

    req.googleUser = {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      email_verified: payload.email_verified
    };
    next();
  } catch (error) {
    console.error('Google token verification error:', error);
    res.status(401).json({ error: error.message || 'Invalid token' });
  }
};

// Check if email exists
app.post('/api/auth/check-email', (req, res) => {
  const { email } = req.body;
  console.log('Checking email:', email);
  
  const user = testProfiles.find(profile => profile.email === email);
  const exists = !!user;
  
  res.json({ exists });
});

// Sign in with email and password
app.post('/api/auth/signin', (req, res) => {
  const { email, password, isNewUser } = req.body;
  console.log('Sign in attempt:', { email, isNewUser: !!isNewUser });

  const user = testProfiles.find(profile => profile.email === email);
  console.log('User found:', !!user);
  
  if (!user && isNewUser) {
    console.log('Creating new user for:', email);
    // Create new user
    const newUser = {
      id: testProfiles.length + 1,
      email,
      password,
      name: '',
      age: null,
      gender: '',
      lookingFor: '',
      location: '',
      occupation: '',
      education: '',
      bio: '',
      interests: [],
      hobbies: [],
      languages: [],
      photos: [],
      relationshipGoals: '',
      smoking: '',
      drinking: '',
      firstDateIdeas: [],
      status: 'pending',
      createdAt: new Date().toISOString(),
      settings: {
        notifications: true,
        emailUpdates: true
      }
    };
    
    testProfiles.push(newUser);
    console.log('New user created successfully');
    res.json({ 
      isNewUser: true,
      profile: newUser
    });
  } else if (!user) {
    console.log('User not found and not a new user');
    return res.status(401).json({ error: 'Invalid email or password' });
  } else if (user.password !== password) {
    console.log('Invalid password for user:', email);
    return res.status(401).json({ error: 'Invalid password' });
  } else {
    console.log('Successful sign in for existing user:', email);
    res.json({ 
      isNewUser: false,
      profile: user
    });
  }
});

// Google authentication endpoint
app.post('/api/auth/google', verifyGoogleToken, async (req, res) => {
  try {
    const { email, name, picture } = req.googleUser;
    console.log('Google sign-in attempt:', email);
    
    // Check if user exists in test profiles
    let user = testProfiles.find(profile => profile.email === email);
    
    if (!user) {
      console.log('Creating new Google user:', email);
      // Create new user
      user = {
        id: testProfiles.length + 1,
        email: email,
        name: name || '',
        photos: [picture],
        status: 'active',
        createdAt: new Date().toISOString(),
        settings: {
          notifications: true,
          emailUpdates: true
        },
        interests: [],
        hobbies: [],
        languages: [],
        firstDateIdeas: [],
        age: null,
        gender: null,
        lookingFor: null,
        location: null,
        occupation: null,
        education: null,
        bio: null,
        relationshipGoals: null,
        smoking: null,
        drinking: null
      };
      testProfiles.push(user);
      console.log('New Google user created:', user);
      return res.json({ profile: user, isNewUser: true });
    }

    console.log('Existing Google user found:', user);
    res.json({ profile: user, isNewUser: false });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Chicago-specific data
const chicagoNeighborhoods = [
  'Loop', 'River North', 'Gold Coast', 'Lincoln Park', 'Lakeview',
  'Wicker Park', 'Bucktown', 'Logan Square', 'West Loop', 'South Loop'
];

const chicagoDateSpots = [
  'Art Institute of Chicago',
  'Millennium Park',
  'Navy Pier',
  'Garfield Park Conservatory',
  'Lincoln Park Zoo',
  'Chicago Riverwalk',
  'Museum of Contemporary Art',
  'Grant Park',
  'Shedd Aquarium',
  'Field Museum'
];

// Root route handler
app.get('/', (req, res) => {
  res.json({ message: 'Backend server is running' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
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

// Get current profile
app.get('/api/profiles/current', (req, res) => {
  try {
    // For demo purposes, return the first test profile
    const profile = testProfiles[0];
    if (!profile) {
      return res.status(404).json({ message: 'No profile found' });
    }
    
    // Remove password from response
    const { password: _, ...profileWithoutPassword } = profile;
    res.json(profileWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create or update profile
app.post('/api/profiles', (req, res) => {
  const { email, ...profileData } = req.body;
  console.log('Creating/updating profile for:', email);

  try {
    // Find the user by email
    const userIndex = testProfiles.findIndex(profile => profile.email === email);
    
    if (userIndex === -1) {
      console.log('User not found:', email);
      return res.status(404).json({ error: 'User not found' });
    }

    // Update the profile with new data
    const updatedProfile = {
      ...testProfiles[userIndex],
      ...profileData,
      status: 'pending',
      updatedAt: new Date().toISOString(),
      isProfileComplete: true // Add this flag to match sign-in response
    };

    // Update the profile in the array
    testProfiles[userIndex] = updatedProfile;
    console.log('Profile updated successfully:', email);

    // Return the updated profile in the same format as sign-in
    const { password, ...profileWithoutPassword } = updatedProfile;
    res.json({ 
      profile: profileWithoutPassword,
      isNewUser: false // Since we're updating an existing profile
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get matches
app.get('/api/matches/:profileId', (req, res) => {
  try {
    const { profileId } = req.params;
    const currentProfile = testProfiles.find(p => p.id === profileId);
    
    if (!currentProfile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const matches = findMatches(testProfiles, currentProfile);
    res.json(matches);
  } catch (error) {
    console.error('Error finding matches:', error);
    res.status(500).json({ message: 'Failed to find matches' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Routes
app.get('/api/profiles', (req, res) => {
  const profiles = loadTestProfiles();
  res.json(profiles);
});

app.post('/api/profiles', (req, res) => {
  const profiles = loadTestProfiles();
  const newProfile = {
    id: Date.now().toString(),
    ...req.body,
  };
  profiles.push(newProfile);
  res.status(201).json(newProfile);
});

app.put('/api/profiles/:id', (req, res) => {
  const profiles = loadTestProfiles();
  const index = profiles.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  profiles[index] = { ...profiles[index], ...req.body };
  res.json(profiles[index]);
});

app.get('/api/chicago/neighborhoods', (req, res) => {
  try {
    res.json(chicagoNeighborhoods);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/chicago/date-spots', (req, res) => {
  try {
    res.json(chicagoDateSpots);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/matches/test', (req, res) => {
  try {
    // For demo purposes, return a random match
    const currentProfile = testProfiles[0];
    const potentialMatches = testProfiles.filter(p => 
      p.gender !== currentProfile.gender && 
      p.id !== currentProfile.id
    );
    
    if (potentialMatches.length === 0) {
      return res.status(404).json({ message: 'No matches found' });
    }
    
    const randomMatch = potentialMatches[Math.floor(Math.random() * potentialMatches.length)];
    const { password: _, ...matchWithoutPassword } = randomMatch;
    
    // Generate a random date and time for the match
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * 7) + 1); // 1-7 days from now
    const hours = Math.floor(Math.random() * 12) + 12; // 12-23
    const minutes = Math.floor(Math.random() * 60);
    date.setHours(hours, minutes);
    
    // Select a random date spot
    const dateSpot = chicagoDateSpots[Math.floor(Math.random() * chicagoDateSpots.length)];
    
    res.json({
      match: matchWithoutPassword,
      date: date.toISOString(),
      location: dateSpot,
      commonInterests: currentProfile.interests.filter(interest => 
        randomMatch.interests.includes(interest)
      )
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is in use. Attempting to kill the process...`);
    require('child_process').exec(`lsof -i :${PORT} | grep LISTEN | awk '{print $2}' | xargs kill -9`, () => {
      server.listen(PORT);
    });
  } else {
    console.error('Server error:', error);
  }
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app }; 