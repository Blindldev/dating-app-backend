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

// Start server with port check
const startServer = async () => {
  try {
    const portInUse = await isPortInUse(PORT);
    if (portInUse) {
      console.log(`Port ${PORT} is in use. Attempting to kill the process...`);
      await killPortProcess(PORT);
      // Wait a moment for the port to be freed
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();

// Add error handling middleware at the end
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = { app }; 