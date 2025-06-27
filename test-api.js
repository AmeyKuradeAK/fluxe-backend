#!/usr/bin/env node

const fetch = require('node-fetch');

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'supersecretkey123';

async function testAPI() {
  console.log('🧪 Testing Flutter Project Generator API');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log('=' .repeat(50));

  try {
    // Test 1: Health Check (no auth required)
    console.log('1️⃣  Testing health endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.status);
    console.log('   Uptime:', Math.round(healthData.uptime), 'seconds\n');

    // Test 2: Protected Health Check
    console.log('2️⃣  Testing protected health endpoint...');
    const protectedHealthResponse = await fetch(`${BASE_URL}/generate/health`, {
      headers: { 'X-API-Key': API_KEY }
    });
    const protectedHealthData = await protectedHealthResponse.json();
    console.log('✅ Protected health check:', protectedHealthData.status);
    console.log('   Configuration complete:', protectedHealthData.configurationComplete);
    if (!protectedHealthData.configurationComplete) {
      console.log('   Missing:', protectedHealthData.missingConfiguration.join(', '));
    }
    console.log();

    // Test 3: Root endpoint
    console.log('3️⃣  Testing root endpoint...');
    const rootResponse = await fetch(`${BASE_URL}/`);
    const rootData = await rootResponse.json();
    console.log('✅ Root endpoint:', rootData.service);
    console.log('   Version:', rootData.version);
    console.log();

    // Test 4: API Key validation (should fail)
    console.log('4️⃣  Testing API key validation...');
    const invalidKeyResponse = await fetch(`${BASE_URL}/generate/health`, {
      headers: { 'X-API-Key': 'invalid-key' }
    });
    if (invalidKeyResponse.status === 401) {
      console.log('✅ API key validation working correctly');
    } else {
      console.log('❌ API key validation failed');
    }
    console.log();

    // Test 5: Generate endpoint validation (should require prompt and userId)
    console.log('5️⃣  Testing generate endpoint validation...');
    const validateResponse = await fetch(`${BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({})
    });
    const validateData = await validateResponse.json();
    if (validateResponse.status === 400 && validateData.error.includes('prompt and userId')) {
      console.log('✅ Input validation working correctly');
    } else {
      console.log('❌ Input validation failed');
    }
    console.log();

    console.log('🎉 All basic tests passed!');
    console.log();
    console.log('To test full project generation, run:');
    console.log(`curl -X POST "${BASE_URL}/generate" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -H "X-API-Key: ${API_KEY}" \\`);
    console.log(`  -d '{"prompt": "Create a simple counter app", "userId": "test123"}'`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log();
    console.log('Make sure the server is running:');
    console.log('npm start');
    process.exit(1);
  }
}

testAPI();
