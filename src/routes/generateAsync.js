const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { 
  generateFlutterProjectAsync, 
  getJobStatus, 
  listJobs, 
  healthCheck 
} = require('../controllers/generateControllerAsync');

// Async generation endpoint
router.post('/', generateFlutterProjectAsync);

// Job status endpoint
router.get('/status/:jobId', getJobStatus);

// List all jobs (for debugging)
router.get('/jobs', listJobs);

// Health check endpoint
router.get('/health', healthCheck);

// Download endpoint for APK files
router.get('/download/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../../flutter_projects', filename);
  
  // Security check: ensure filename ends with _apk.zip
  if (!filename.endsWith('_apk.zip')) {
    return res.status(400).json({ error: 'Invalid file type' });
  }
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found or may have been cleaned up' });
  }
  
  // Set appropriate headers
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  // Stream the file
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
  
  fileStream.on('error', (error) => {
    console.error('Error streaming file:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error downloading file' });
    }
  });
});

module.exports = router;
