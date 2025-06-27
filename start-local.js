#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Flutter Project Generator - Local Development Setup');
console.log('====================================================\n');

// Check if .env file exists and has required variables
const envPath = path.join(__dirname, '.env');
let envConfigured = false;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const requiredVars = ['MISTRAL_API_KEY', 'GITHUB_TOKEN', 'GITHUB_USERNAME'];
  const currentVars = {};
  
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      currentVars[key] = value;
    }
  });
  
  const missingVars = requiredVars.filter(varName => !currentVars[varName] || currentVars[varName] === 'your_github_token_here' || currentVars[varName] === 'your_github_username');
  
  if (missingVars.length === 0) {
    envConfigured = true;
    console.log('✅ Environment variables configured');
  } else {
    console.log('⚠️  Missing environment variables:', missingVars.join(', '));
    console.log('📝 Please update your .env file with the correct values\n');
  }
} else {
  console.log('❌ .env file not found');
  console.log('📝 Please run "npm run setup" or create .env manually\n');
}

console.log('📋 Current configuration:');
console.log('   Port: 3000');
console.log('   API Key: supersecretkey123 (default)');
console.log('   Environment: development');
console.log('   Configured:', envConfigured ? 'Yes' : 'No');
console.log();

if (!envConfigured) {
  console.log('⚠️  To fully test the API, you need to configure:');
  console.log('   1. MISTRAL_API_KEY - Get from https://mistral.ai/');
  console.log('   2. GITHUB_TOKEN - Get from https://github.com/settings/tokens');
  console.log('   3. GITHUB_USERNAME - Your GitHub username');
  console.log();
}

console.log('🌐 Starting development server...');

// Start the Node.js server
const server = spawn('node', ['src/server.js'], {
  stdio: 'pipe',
  shell: true
});

server.stdout.on('data', (data) => {
  console.log(data.toString().trim());
});

server.stderr.on('data', (data) => {
  console.error(data.toString().trim());
});

server.on('close', (code) => {
  console.log(`\n❌ Server process exited with code ${code}`);
});

// Wait a moment for server to start, then provide ngrok instructions
setTimeout(() => {
  console.log('\n🌍 To make your API publicly accessible:');
  console.log();
  console.log('1️⃣  Open a new terminal/PowerShell window');
  console.log('2️⃣  Run: ngrok http 3000');
  console.log('3️⃣  Copy the public URL (e.g., https://abc123.ngrok.io)');
  console.log('4️⃣  Test with: curl https://abc123.ngrok.io/health');
  console.log();
  console.log('🧪 Test your API endpoints:');
  console.log('   Health: GET /health');
  console.log('   Generate: POST /generate (requires API key)');
  console.log('   Download: GET /generate/download/:filename');
  console.log();
  console.log('🔑 API Key for testing: supersecretkey123');
  console.log();
  console.log('📖 Example API call:');
  console.log('curl -X POST "https://your-ngrok-url.ngrok.io/generate" \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -H "X-API-Key: supersecretkey123" \\');
  console.log('  -d \'{"prompt": "Create a simple counter app", "userId": "test123"}\'');
  console.log();
  console.log('Press Ctrl+C to stop the server');
}, 2000);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
  process.exit(0);
});
