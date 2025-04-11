const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { testProfiles } = require('./test-profiles');
const { findMatches } = require('./services/matchingService');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

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

// Signin endpoint
app.post('/api/signin', (req, res) => {
  const { email, password } = req.body;
  
  // For testing purposes, accept any email/password
  if (email && password) {
    res.json({
      id: '1',
      email: email,
      name: email.split('@')[0],
      createdAt: new Date().toISOString()
    });
  } else {
    res.status(400).json({ error: 'Email and password are required' });
  }
});

// Check email endpoint
app.post('/api/check-email', (req, res) => {
  const { email } = req.body;
  
  if (email) {
    // For testing purposes, always return 200
    res.status(200).json({ exists: true });
  } else {
    res.status(400).json({ error: 'Email is required' });
  }
});

// Helper function to check if a port is in use
const isPortInUse = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', () => resolve(true))
      .once('listening', () => {
        server.close();
        resolve(false);
      })
      .listen(port);
  });
};

// Helper function to kill process using a port
const killPortProcess = async (port) => {
  try {
    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      exec(`netstat -ano | findstr :${port}`, (err, stdout) => {
        if (err) return;
        const lines = stdout.split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length > 4) {
            const pid = parts[parts.length - 1];
            exec(`taskkill /F /PID ${pid}`);
          }
        }
      });
    } else {
      const { exec } = require('child_process');
      exec(`lsof -i :${port} | grep LISTEN | awk '{print $2}' | xargs kill -9`);
    }
  } catch (error) {
    console.error('Error killing port process:', error);
  }
};

// Load test profiles
const loadTestProfiles = () => {
  try {
    const profilesPath = path.join(__dirname, 'test-profiles.json');
    if (fs.existsSync(profilesPath)) {
      const data = fs.readFileSync(profilesPath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error loading test profiles:', error);
    return [];
  }
};

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

app.get('/api/matches/:profileId', (req, res) => {
  try {
    const { profileId } = req.params;
    const currentProfile = testProfiles.find(p => p.id === profileId);
    
    if (!currentProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const matches = findMatches(testProfiles, currentProfile);
    res.json(matches);
  } catch (error) {
    console.error('Error finding matches:', error);
    res.status(500).json({ error: 'Failed to find matches' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Routes
app.post('/api/auth/check-email', (req, res) => {
  try {
    const { email } = req.body;
    const profile = testProfiles.find(p => p.email === email);
    
    if (!profile) {
      return res.status(404).json({ message: 'Email not found' });
    }
    
    res.json({ message: 'Email found' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/signin', (req, res) => {
  try {
    const { email, password } = req.body;
    const profile = testProfiles.find(p => p.email === email && p.password === password);
    
    if (!profile) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Remove password from response
    const { password: _, ...profileWithoutPassword } = profile;
    res.json({ profile: profileWithoutPassword });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

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

app.post('/api/profiles', (req, res) => {
  try {
    const updatedProfile = req.body;
    // In a real app, we would save this to a database
    res.json(updatedProfile);
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