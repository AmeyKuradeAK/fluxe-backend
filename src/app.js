const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const apiKeyAuth = require('./middleware/apikeyAuth');

dotenv.config();

const app = express();

// Enable CORS for all routes
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Flutter Project Generator API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      'POST /generate': 'Generate Flutter project (synchronous - may timeout)',
      'POST /generate-async': 'Generate Flutter project (async with webhooks)',
      'GET /generate-async/status/:jobId': 'Check job status',
      'GET /generate-async/jobs': 'List all jobs',
      'GET /generate/health': 'Health check endpoint',
      'GET /generate-async/health': 'Async API health check',
      'GET /generate/download/:filename': 'Download generated APK files',
      'GET /generate-async/download/:filename': 'Download APK files (async)'
    },
    recommendation: 'Use /generate-async for production frontends to avoid timeouts',
    timestamp: new Date().toISOString()
  });
});

// Health check without API key
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes
const generateRoute = require('./routes/generate');
const generateAsyncRoute = require('./routes/generateAsync');

// API Key middleware for protected routes
app.use('/generate', apiKeyAuth);
app.use('/generate-async', apiKeyAuth);

app.use('/generate', generateRoute);
app.use('/generate-async', generateAsyncRoute);

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.path,
    method: req.method
  });
});

module.exports = app;
