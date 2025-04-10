const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const net = require('net');
const { testProfiles } = require('./test-profiles');
const { findMatches } = require('./services/matchingService');

const app = express();
const PORT = process.env.PORT || 3002;

// Configure CORS for production
const allowedOrigins = [
  'https://blindl-blindls-projects.vercel.app', // Vercel frontend
  'http://localhost:3000', // Local development
  process.env.FRONTEND_URL // Environment variable for custom domain
].filter(Boolean); // Remove any undefined values

// Enable CORS for all routes
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
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // Cache preflight request for 10 minutes
}));

// Handle preflight requests
app.options('*', cors());

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

// Check if port is in use
const isPortInUse = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', () => {
        resolve(true);
      })
      .once('listening', () => {
        server.close();
        resolve(false);
      })
      .listen(port);
  });
};

// Kill process using the port
const killPortProcess = async (port) => {
  try {
    const { exec } = require('child_process');
    const platform = process.platform;
    let command;

    if (platform === 'win32') {
      command = `netstat -ano | findstr :${port}`;
    } else {
      command = `lsof -i :${port} | grep LISTEN`;
    }

    exec(command, (error, stdout) => {
      if (error) {
        console.error(`Error checking port: ${error}`);
        return;
      }

      if (stdout) {
        const pid = platform === 'win32' 
          ? stdout.split(' ').pop().trim()
          : stdout.split(/\s+/)[1];

        if (pid) {
          const killCommand = platform === 'win32'
            ? `taskkill /F /PID ${pid}`
            : `kill -9 ${pid}`;

          exec(killCommand, (killError) => {
            if (killError) {
              console.error(`Error killing process: ${killError}`);
            } else {
              console.log(`Successfully killed process on port ${port}`);
            }
          });
        }
      }
    });
  } catch (err) {
    console.error('Error in killPortProcess:', err);
  }
};

// Load test profiles
const loadTestProfiles = async () => {
  try {
    const data = await fs.readFile(path.join(__dirname, 'test-profiles.json'), 'utf8');
    const profiles = JSON.parse(data);
    console.log('Loaded test profiles:', profiles);
    return profiles;
  } catch (error) {
    console.error('Error loading test profiles:', error);
    return [];
  }
};

// Routes
app.get('/api/profiles', async (req, res) => {
  try {
    const profiles = await loadTestProfiles();
    res.json(profiles);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

app.post('/api/profiles', async (req, res) => {
  try {
    const profiles = await loadTestProfiles();
    const newProfile = {
      id: Date.now().toString(),
      ...req.body,
      hasCompleteProfile: true
    };
    profiles.push(newProfile);
    await fs.writeFile(
      path.join(__dirname, 'test-profiles.json'),
      JSON.stringify(profiles, null, 2)
    );
    res.status(201).json(newProfile);
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

app.put('/api/profiles/:id', async (req, res) => {
  try {
    const profiles = await loadTestProfiles();
    const index = profiles.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    profiles[index] = { ...profiles[index], ...req.body };
    await fs.writeFile(
      path.join(__dirname, 'test-profiles.json'),
      JSON.stringify(profiles, null, 2)
    );
    res.json(profiles[index]);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
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
      // Wait a bit for the port to be released
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