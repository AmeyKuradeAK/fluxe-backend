#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fetch = require('node-fetch');

console.log('🚀 Flutter Generator - Complete Setup');
console.log('=====================================\n');

let serverProcess = null;
let tunnelProcess = null;
let publicUrl = null;

// Function to start the local server
function startServer() {
  return new Promise((resolve, reject) => {
    console.log('1️⃣  Starting local server...');
    serverProcess = spawn('node', ['src/server.js'], {
      stdio: 'pipe',
      shell: true
    });

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('   Server:', output.trim());
      if (output.includes('Server running on port 3000')) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('   Server Error:', data.toString().trim());
    });

    serverProcess.on('close', (code) => {
      console.log(`   Server exited with code ${code}`);
    });

    // Timeout if server doesn't start
    setTimeout(() => {
      resolve(); // Continue anyway
    }, 5000);
  });
}

// Function to start LocalTunnel
function startTunnel() {
  return new Promise((resolve, reject) => {
    console.log('2️⃣  Starting LocalTunnel...');
    
    tunnelProcess = spawn('lt', ['--port', '3000'], {
      stdio: 'pipe',
      shell: true
    });

    tunnelProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('   Tunnel:', output.trim());
      
      // Extract URL from output
      const urlMatch = output.match(/your url is: (https:\/\/[^\s]+)/);
      if (urlMatch) {
        publicUrl = urlMatch[1];
        console.log(`✅ Public URL: ${publicUrl}`);
        resolve(publicUrl);
      }
    });

    tunnelProcess.stderr.on('data', (data) => {
      console.error('   Tunnel Error:', data.toString().trim());
    });

    tunnelProcess.on('close', (code) => {
      console.log(`   Tunnel exited with code ${code}`);
    });

    // Timeout if tunnel doesn't start
    setTimeout(() => {
      if (!publicUrl) {
        reject(new Error('Tunnel failed to start'));
      }
    }, 10000);
  });
}

// Function to test the API
async function testAPI(url) {
  console.log('3️⃣  Testing API endpoints...');
  
  try {
    // Test health endpoint
    const healthResponse = await fetch(`${url}/health`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Flutter-Generator-Test'
      },
      timeout: 10000
    });

    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health check passed:', healthData.status);
    } else {
      console.log('⚠️  Health check returned:', healthResponse.status);
    }

    // Test async generation
    console.log('   Testing async generation...');
    const generateResponse = await fetch(`${url}/generate-async`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'supersecretkey123',
        'Accept': 'application/json',
        'User-Agent': 'Flutter-Generator-Test'
      },
      body: JSON.stringify({
        prompt: 'Create a simple Todo app with Material UI no errors total working',
        userId: 'test_user_123'
      }),
      timeout: 10000
    });

    if (generateResponse.ok) {
      const generateData = await generateResponse.json();
      console.log('✅ Generation started:', generateData.jobId);
      console.log('   Status URL:', `${url}${generateData.statusUrl}`);
      return generateData;
    } else {
      console.log('⚠️  Generation failed:', generateResponse.status);
      const errorText = await generateResponse.text();
      console.log('   Error:', errorText);
    }

  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

// Function to provide usage instructions
function showUsageInstructions(url) {
  console.log('\n🎉 Your Flutter Generator API is running!');
  console.log('==========================================');
  console.log(`📍 Public URL: ${url}`);
  console.log('🔑 API Key: supersecretkey123');
  console.log('');
  console.log('📋 Frontend Integration:');
  console.log('```javascript');
  console.log(`const API_BASE = '${url}';`);
  console.log('const API_KEY = \'supersecretkey123\';');
  console.log('');
  console.log('// Generate Flutter app');
  console.log('const response = await fetch(`${API_BASE}/generate-async`, {');
  console.log('  method: \'POST\',');
  console.log('  headers: {');
  console.log('    \'Content-Type\': \'application/json\',');
  console.log('    \'X-API-Key\': API_KEY');
  console.log('  },');
  console.log('  body: JSON.stringify({');
  console.log('    prompt: \'Create a todo app\',');
  console.log('    userId: \'user123\',');
  console.log('    webhookUrl: \'https://your-frontend.com/webhook\'');
  console.log('  })');
  console.log('});');
  console.log('```');
  console.log('');
  console.log('🧪 Test Commands:');
  console.log(`curl -H "Accept: application/json" ${url}/health`);
  console.log('');
  console.log(`curl -X POST "${url}/generate-async" \\`);
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -H "X-API-Key: supersecretkey123" \\');
  console.log('  -d \'{"prompt": "Create a counter app", "userId": "test123"}\'');
  console.log('');
  console.log('📖 Read LOCALTUNNEL_SOLUTION.md for complete documentation');
  console.log('');
  console.log('Press Ctrl+C to stop');
}

// Main function
async function main() {
  try {
    // Start server
    await startServer();
    
    // Wait a bit for server to fully start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Start tunnel
    const url = await startTunnel();
    
    // Wait a bit for tunnel to stabilize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test the API
    await testAPI(url);
    
    // Show usage instructions
    showUsageInstructions(url);
    
    // Keep the process running
    process.stdin.resume();
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  if (serverProcess) serverProcess.kill();
  if (tunnelProcess) tunnelProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (serverProcess) serverProcess.kill();
  if (tunnelProcess) tunnelProcess.kill();
  process.exit(0);
});

// Start everything
main();
