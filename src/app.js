const express = require('express');
const dotenv = require('dotenv');
const apiKeyAuth = require('./middleware/apiKeyAuth');

dotenv.config();

const app = express();

app.use(express.json());

// API Key middleware for all routes
app.use(apiKeyAuth);

// Routes
const generateRoute = require('./routes/generate');
app.use('/generate', generateRoute);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

module.exports = app;
