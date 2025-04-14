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
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

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

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
  try {
    const { email, password, isNewUser } = req.body;
    console.log('Sign in attempt:', { email, isNewUser });

    // Check if user exists by email
    const existingUser = testProfiles.find(profile => profile.email === email);
    console.log('User lookup result:', { email, exists: !!existingUser });

    if (isNewUser) {
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Create new user
      const newUser = {
        id: testProfiles.length + 1,
        email: email,
        password: password, // In a real app, this should be hashed
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      testProfiles.push(newUser);
      console.log('New user created:', { email: newUser.email, id: newUser.id });
      return res.json({ success: true, user: newUser });
    } else {
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (existingUser.password !== password) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      console.log('Successful sign in for existing user:', email);
      return res.json({ 
        success: true, 
        user: existingUser,
        hasCompleteProfile: !!existingUser.bio
      });
    }
  } catch (error) {
    console.error('Sign in error:', error);
    res.status(500).json({ error: 'Failed to sign in' });
  }
});

// Google authentication endpoint
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    // Check if user exists by email
    const existingUser = testProfiles.find(profile => profile.email === email);

    if (existingUser) {
      return res.json({
        success: true,
        user: existingUser,
        hasCompleteProfile: Boolean(existingUser.bio)
      });
    }

    // Create new user if not found
    const newUser = {
      id: testProfiles.length + 1,
      email: email,
      name: name,
      picture: picture,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hasCompleteProfile: false
    };

    testProfiles.push(newUser);
    
    res.json({
      success: true,
      user: newUser,
      hasCompleteProfile: false
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Failed to authenticate with Google' });
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

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

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
    console.log('=== Profile Update Debug ===');
    console.log('Updating profile for email:', email);
    console.log('Current testProfiles:', testProfiles);
    console.log('Profiles with same email:', testProfiles.filter(p => p.email === email));

    // Find the user by email
    const userIndex = testProfiles.findIndex(profile => profile.email === email);
    
    if (userIndex === -1) {
      console.log('No user found with email:', email);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('Found user at index:', userIndex);
    const existingUser = testProfiles[userIndex];
    console.log('Existing user before update:', existingUser);

    // Update the user's profile
    const updatedUser = {
      ...existingUser,
      ...profileData,
      updatedAt: new Date().toISOString(),
      hasCompleteProfile: true
    };

    // Replace the old profile with the updated one
    testProfiles[userIndex] = updatedUser;
    console.log('Updated user:', updatedUser);
    console.log('Updated testProfiles:', testProfiles);

    res.json({
      success: true,
      user: updatedUser
    });
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
  try {
    console.log('Received profile creation request:', req.body);
    const { email, ...profileData } = req.body;
    
    // Check if we have a Google email in the request
    const googleEmail = req.body.googleEmail;
    
    if (!email && !googleEmail) {
      console.error('Email is missing in profile creation request');
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if profile already exists
    const existingProfile = testProfiles.find(p => p.email === (email || googleEmail));
    if (existingProfile) {
      console.log('Profile already exists, updating...');
      const index = testProfiles.findIndex(p => p.email === (email || googleEmail));
      testProfiles[index] = {
        ...testProfiles[index],
        ...profileData,
        updatedAt: new Date().toISOString()
      };
      return res.json(testProfiles[index]);
    }

    const newProfile = {
      id: testProfiles.length + 1,
      email: email || googleEmail, // Use email from form or Google auth
      ...profileData,
      photos: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hasCompleteProfile: false
    };

    console.log('Creating new profile:', newProfile);
    testProfiles.push(newProfile);
    res.status(201).json(newProfile);
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ error: 'Failed to create profile' });
  }
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

// Photo upload endpoint
app.post('/api/profiles/update-photo', upload.single('photo'), async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    // Upload to ImgBB
    const formData = new FormData();
    formData.append('image', fs.createReadStream(req.file.path));
    formData.append('key', process.env.IMGBB_API_KEY);

    const imgbbResponse = await axios.post('https://api.imgbb.com/1/upload', formData, {
      headers: {
        ...formData.getHeaders()
      }
    });

    // Delete the local file after upload
    fs.unlinkSync(req.file.path);

    if (imgbbResponse.data.success) {
      const photoUrl = imgbbResponse.data.data.url;
      
      // Update the user's profile with the new photo URL
      const userIndex = testProfiles.findIndex(profile => profile.email === email);
      if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update the profile with the new photo URL
      testProfiles[userIndex].photos = [photoUrl];

      res.json({
        success: true,
        photoUrl: photoUrl,
        message: 'Photo updated successfully'
      });
    } else {
      throw new Error('Failed to upload to ImgBB');
    }
  } catch (error) {
    console.error('Error updating photo:', error);
    res.status(500).json({ error: 'Failed to update photo' });
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