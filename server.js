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
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400
}));

// Add security headers
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});

app.use(express.json());

// Initialize Google OAuth client
const googleClient = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET
});

// Middleware to verify Google token
const verifyGoogleToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'No token provided' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    
    // Verify the token was issued to our application
    if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
      throw new Error('Invalid token audience');
    }

    // Verify the token was issued by Google
    if (payload.iss !== 'https://accounts.google.com' && 
        payload.iss !== 'accounts.google.com') {
      throw new Error('Invalid token issuer');
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
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Google authentication endpoint
app.post('/api/auth/google', verifyGoogleToken, async (req, res) => {
  try {
    const { email, name, picture } = req.googleUser;
    
    // Check if user exists in test profiles
    let user = testProfiles.find(profile => profile.email === email);
    
    if (!user) {
      // Create new user from Google profile with minimal required fields
      user = {
        id: testProfiles.length + 1,
        email: email,
        name: name,
        photos: [picture],
        status: 'active',
        createdAt: new Date().toISOString(),
        settings: {
          notifications: true,
          emailUpdates: true
        },
        // Initialize empty arrays for required fields
        interests: [],
        hobbies: [],
        languages: [],
        firstDateIdeas: [],
        // Add other required fields with default values
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
    }

    res.json(user);
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

// Check if email exists
app.post('/api/auth/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    const user = testProfiles.find(profile => profile.email === email);
    res.json({ exists: !!user });
  } catch (error) {
    console.error('Email check error:', error);
    res.status(500).json({ error: 'Failed to check email' });
  }
});

// Sign in or create new user
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    let user = testProfiles.find(profile => profile.email === email);
    
    if (!user) {
      // Create new user
      user = {
        id: testProfiles.length + 1,
        email,
        password, // Note: In production, hash the password
        name: '',
        age: null,
        gender: null,
        lookingFor: null,
        location: null,
        occupation: null,
        education: null,
        bio: null,
        interests: [],
        hobbies: [],
        languages: [],
        photos: [],
        firstDateIdeas: [],
        relationshipGoals: null,
        smoking: null,
        drinking: null,
        status: 'active',
        createdAt: new Date().toISOString(),
        settings: {
          notifications: true,
          emailUpdates: true
        }
      };
      testProfiles.push(user);
      res.json({ profile: user, isNewUser: true });
    } else {
      // Verify password for existing user
      if (user.password !== password) {
        return res.status(401).json({ error: 'Invalid password' });
      }
      res.json({ profile: user, isNewUser: false });
    }
  } catch (error) {
    console.error('Sign in error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
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

// Update profile
app.post('/api/profiles', (req, res) => {
  try {
    const updatedProfile = req.body;
    // In a real app, we would save this to a database
    res.json(updatedProfile);
  } catch (error) {
    res.status(500).json({ message: error.message });
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