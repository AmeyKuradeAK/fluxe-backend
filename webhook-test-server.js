#!/usr/bin/env node

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Store received webhooks
const webhooks = [];

// Webhook endpoint
app.post('/webhook', (req, res) => {
  const webhook = {
    receivedAt: new Date().toISOString(),
    headers: req.headers,
    body: req.body
  };
  
  webhooks.push(webhook);
  
  console.log('\n🔔 Webhook received!');
  console.log('Job ID:', req.body.jobId);
  console.log('Status:', req.body.status);
  console.log('Message:', req.body.message);
  
  if (req.body.status === 'success') {
    console.log('✅ Project generated successfully!');
    console.log('📱 APK Download:', req.body.data?.apkDownloadUrl);
    console.log('📂 GitHub Repo:', req.body.data?.githubRepo);
  } else if (req.body.status === 'error') {
    console.log('❌ Project generation failed');
    console.log('Error:', req.body.error);
  }
  
  console.log('─'.repeat(50));
  
  res.json({ success: true, message: 'Webhook received' });
});

// View all received webhooks
app.get('/webhooks', (req, res) => {
  res.json({
    total: webhooks.length,
    webhooks: webhooks.slice(-10) // Last 10 webhooks
  });
});

// Clear webhooks
app.delete('/webhooks', (req, res) => {
  webhooks.length = 0;
  res.json({ success: true, message: 'Webhooks cleared' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Webhook Test Server',
    port: PORT,
    webhookUrl: `http://localhost:${PORT}/webhook`,
    ngrokWebhookUrl: 'Use ngrok to get public URL for this endpoint',
    receivedWebhooks: webhooks.length,
    endpoints: {
      'POST /webhook': 'Receive webhooks from Flutter Generator',
      'GET /webhooks': 'View received webhooks',
      'DELETE /webhooks': 'Clear webhook history'
    }
  });
});

app.listen(PORT, () => {
  console.log('\n🎣 Webhook Test Server Started');
  console.log('='.repeat(40));
  console.log(`📍 Local URL: http://localhost:${PORT}`);
  console.log(`🔗 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log('');
  console.log('🌐 To use with ngrok:');
  console.log(`   1. Run: ngrok http ${PORT}`);
  console.log('   2. Copy the HTTPS URL');
  console.log('   3. Use: https://your-ngrok-url.ngrok.io/webhook');
  console.log('');
  console.log('💡 Test webhook:');
  console.log(`   curl -X POST http://localhost:${PORT}/webhook \\`);
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"jobId": "test", "status": "success", "message": "Test webhook"}\'');
  console.log('');
  console.log('📊 View webhooks: curl http://localhost:' + PORT + '/webhooks');
  console.log('');
});
