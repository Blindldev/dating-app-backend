require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { OAuth2Client } = require('google-auth-library');
const { testProfiles } = require('./test-profiles');
const { findMatches } = require('./services/matchingService');
const jwt = require('jsonwebtoken');

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
  // Allow popups and postMessage for Google Sign-In
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  next();
});

app.use(express.json());

// Initialize Google OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Middleware to verify Google token
const verifyGoogleToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'No token provided' });
    }

    console.log('Verifying token with client ID:', process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    
    // Verify the token was issued to our application
    if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
      console.error('Token audience mismatch:', {
        expected: process.env.GOOGLE_CLIENT_ID,
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
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    console.log('Received Google Sign-In request');

    const clientId = '910532636592-98noic506pegni3jm6omq7p610u8gdrh.apps.googleusercontent.com';
    console.log('Verifying token with client ID:', clientId);

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    console.log('Token payload:', {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      aud: payload.aud
    });

    const { email, name, picture } = payload;
    console.log('Google Sign-In attempt:', { email, name });

    if (!email) {
      console.error('Email is missing from Google authentication payload');
      throw new Error('Email is required from Google authentication');
    }

    // Check if user exists
    let user = testProfiles.find(u => u.email === email);
    console.log('User lookup result:', { email, exists: !!user });
    
    if (!user) {
      console.log('Creating new user with email:', email);
      // Create new user with Google data
      const newUser = {
        id: testProfiles.length + 1,
        email: email, // Explicitly set the email
        name: name || '',
        picture: picture || '',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Initialize with default values
        age: '',
        gender: '',
        lookingFor: '',
        location: '',
        occupation: '',
        education: '',
        bio: '',
        interests: [],
        hobbies: [],
        languages: [],
        photos: [picture],
        relationshipGoals: '',
        smoking: '',
        drinking: '',
        firstDateIdeas: [],
        settings: { notifications: true, emailUpdates: true }
      };
      
      testProfiles.push(newUser);
      user = newUser;
      console.log('New user created from Google:', { 
        email: user.email,
        name: user.name,
        id: user.id 
      });
    } else {
      // Update existing user's name and picture if changed
      if (user.name !== name || user.picture !== picture) {
        user.name = name;
        user.picture = picture;
        user.updatedAt = new Date().toISOString();
        console.log('Updated existing user profile:', { 
          email: user.email,
          name: user.name 
        });
      }
    }

    // Remove sensitive data before sending response
    const { password, ...userWithoutPassword } = user;
    console.log('Sending response with user data:', { 
      email: userWithoutPassword.email, 
      name: userWithoutPassword.name,
      hasEmail: !!userWithoutPassword.email,
      id: userWithoutPassword.id
    });
    res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error('Google Sign-In error:', error);
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

// Update profile endpoint
app.post('/api/profiles/update', (req, res) => {
  try {
    const { email, profileData } = req.body;
    console.log('Updating profile for:', email);
    console.log('Profile data:', profileData);

    const userIndex = testProfiles.findIndex(u => u.email === email);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create updated profile while preserving email
    const updatedProfile = {
      ...testProfiles[userIndex],
      ...profileData,
      email: email, // Explicitly set the email
      updatedAt: new Date().toISOString()
    };

    // Update the user profile
    testProfiles[userIndex] = updatedProfile;

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedProfile;
    res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error('Profile update error:', error);
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

// Routes
app.get('/api/profiles', (req, res) => {
  res.json(testProfiles);
});

app.post('/api/profiles', (req, res) => {
  const newProfile = {
    id: testProfiles.length + 1,
    ...req.body,
    createdAt: new Date().toISOString()
  };
  testProfiles.push(newProfile);
  res.status(201).json(newProfile);
});

app.put('/api/profiles/:id', (req, res) => {
  const index = testProfiles.findIndex(p => p.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  testProfiles[index] = { ...testProfiles[index], ...req.body };
  res.json(testProfiles[index]);
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Handle 404s
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found'
  });
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