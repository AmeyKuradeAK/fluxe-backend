#!/usr/bin/env node

const fetch = require('node-fetch');

const PUBLIC_URL = 'https://flutter-api-test.loca.lt';
const API_KEY = 'supersecretkey123';

async function testPublicAPI() {
  console.log('🧪 Testing Public Flutter Generator API');
  console.log(`📍 Public URL: ${PUBLIC_URL}`);
  console.log('=' .repeat(50));

  try {
    // Test 1: Health check
    console.log('1️⃣  Testing health endpoint...');
    const healthResponse = await fetch(`${PUBLIC_URL}/health`, {
      headers: {
        'Bypass-Tunnel-Reminder': 'true',
        'User-Agent': 'Flutter-Generator-API'
      }
    });
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.status);
    console.log('   Uptime:', Math.round(healthData.uptime), 'seconds\n');

    // Test 2: Root endpoint
    console.log('2️⃣  Testing root endpoint...');
    const rootResponse = await fetch(`${PUBLIC_URL}/`);
    const rootData = await rootResponse.json();
    console.log('✅ Root endpoint:', rootData.service);
    console.log('   Recommendation:', rootData.recommendation);
    console.log();

    // Test 3: Async API health check
    console.log('3️⃣  Testing async API health...');
    const asyncHealthResponse = await fetch(`${PUBLIC_URL}/generate-async/health`, {
      headers: { 'X-API-Key': API_KEY }
    });
    const asyncHealthData = await asyncHealthResponse.json();
    console.log('✅ Async API health:', asyncHealthData.status);
    console.log('   Configuration complete:', asyncHealthData.configurationComplete);
    console.log();

    // Test 4: Start a real Flutter generation (async)
    console.log('4️⃣  Testing async Flutter generation...');
    const generateResponse = await fetch(`${PUBLIC_URL}/generate-async`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        prompt: 'Create a simple counter app with Material Design',
        userId: 'test_user_123',
        webhookUrl: 'https://webhook.site/unique-url' // You can use webhook.site for testing
      })
    });

    if (generateResponse.ok) {
      const generateData = await generateResponse.json();
      console.log('✅ Generation started successfully!');
      console.log('   Job ID:', generateData.jobId);
      console.log('   Status URL:', `${PUBLIC_URL}${generateData.statusUrl}`);
      console.log('   Estimated time:', generateData.estimatedTime);
      console.log();

      // Test 5: Check job status
      console.log('5️⃣  Checking job status...');
      const statusResponse = await fetch(`${PUBLIC_URL}${generateData.statusUrl}`, {
        headers: { 'X-API-Key': API_KEY }
      });
      const statusData = await statusResponse.json();
      console.log('✅ Job status:', statusData.job.status);
      console.log('   Current step:', statusData.job.data.step || 'Starting...');
      console.log();

      console.log('🎉 All tests passed! Your API is working publicly!');
      console.log();
      console.log('📋 Usage for your frontend:');
      console.log(`   API Base URL: ${PUBLIC_URL}`);
      console.log(`   API Key: ${API_KEY}`);
      console.log();
      console.log('🔔 Monitor the job progress by polling the status URL');
      console.log('📱 The APK will be ready for download when status = "completed"');
      
    } else {
      console.log('❌ Generation failed:', generateResponse.status);
      const errorData = await generateResponse.text();
      console.log('   Error:', errorData);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log();
    console.log('💡 Make sure:');
    console.log('1. Your local server is running (npm start)');
    console.log('2. LocalTunnel is active (lt --port 3000)');
    console.log('3. The public URL is correct');
  }
}

testPublicAPI();
