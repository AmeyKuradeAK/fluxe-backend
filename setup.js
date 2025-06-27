#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envPath = path.join(__dirname, '.env');

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function setup() {
  console.log('🚀 Flutter Project Generator API Setup\n');
  console.log('This script will help you configure your environment variables.\n');

  try {
    // Check if .env exists
    let currentEnv = {};
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          currentEnv[key] = value;
        }
      });
    }

    const config = {};

    // API Key
    config.API_KEY = await askQuestion(
      `Enter your API key [current: ${currentEnv.API_KEY || 'not set'}]: `
    ) || currentEnv.API_KEY || 'supersecretkey123';

    // Port
    config.PORT = await askQuestion(
      `Enter port number [current: ${currentEnv.PORT || '3000'}]: `
    ) || currentEnv.PORT || '3000';

    // Mistral API Key
    config.MISTRAL_API_KEY = await askQuestion(
      `Enter your Mistral AI API key [current: ${currentEnv.MISTRAL_API_KEY ? 'set' : 'not set'}]: `
    ) || currentEnv.MISTRAL_API_KEY || '';

    // GitHub Token
    config.GITHUB_TOKEN = await askQuestion(
      `Enter your GitHub Personal Access Token [current: ${currentEnv.GITHUB_TOKEN ? 'set' : 'not set'}]: `
    ) || currentEnv.GITHUB_TOKEN || '';

    // GitHub Username
    config.GITHUB_USERNAME = await askQuestion(
      `Enter your GitHub username [current: ${currentEnv.GITHUB_USERNAME || 'not set'}]: `
    ) || currentEnv.GITHUB_USERNAME || '';

    // Node Environment
    config.NODE_ENV = await askQuestion(
      `Enter environment (development/production) [current: ${currentEnv.NODE_ENV || 'development'}]: `
    ) || currentEnv.NODE_ENV || 'development';

    // Generate .env content
    const envContent = Object.entries(config)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n') + '\n';

    // Write .env file
    fs.writeFileSync(envPath, envContent);

    console.log('\n✅ Environment configuration saved to .env');
    
    // Validate configuration
    const missing = [];
    if (!config.MISTRAL_API_KEY) missing.push('MISTRAL_API_KEY');
    if (!config.GITHUB_TOKEN) missing.push('GITHUB_TOKEN');
    if (!config.GITHUB_USERNAME) missing.push('GITHUB_USERNAME');

    if (missing.length > 0) {
      console.log('\n⚠️  Warning: The following required variables are missing:');
      missing.forEach(key => console.log(`   - ${key}`));
      console.log('\nPlease update your .env file with these values before running the application.');
    } else {
      console.log('\n🎉 All required configuration is set!');
      
      const runNow = await askQuestion('\nWould you like to start the server now? (y/N): ');
      if (runNow.toLowerCase().startsWith('y')) {
        console.log('\nStarting server...\n');
        require('./src/server.js');
      }
    }

    console.log('\n📚 Next steps:');
    console.log('1. Update .env with your actual API keys');
    console.log('2. Run "npm start" to start the server');
    console.log('3. Test with: curl http://localhost:' + config.PORT + '/health');
    console.log('4. See README.md for deployment instructions');

  } catch (error) {
    console.error('Error during setup:', error);
  } finally {
    rl.close();
  }
}

setup();
