#!/usr/bin/env node

const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function setupNgrok() {
  console.log('🔧 ngrok Setup Assistant');
  console.log('========================\n');

  console.log('Option 1: Setup ngrok with account (Recommended)');
  console.log('1. Go to: https://dashboard.ngrok.com/signup');
  console.log('2. Create a free account');
  console.log('3. Copy your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken');
  console.log();

  const hasAccount = await askQuestion('Do you have an ngrok account and authtoken? (y/n): ');

  if (hasAccount.toLowerCase().startsWith('y')) {
    const authtoken = await askQuestion('Enter your ngrok authtoken: ');
    
    exec(`ngrok config add-authtoken ${authtoken}`, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Error setting authtoken:', error.message);
      } else {
        console.log('✅ ngrok authtoken configured successfully!');
        console.log('🚀 Now you can run: ngrok http 3000');
      }
      rl.close();
    });
  } else {
    console.log('\n🌐 Alternative Solutions for Public Access:');
    console.log('==========================================\n');
    
    console.log('Option 2: Use Cloudflare Tunnel (Free, no signup)');
    console.log('Run: npx cloudflared tunnel --url http://localhost:3000');
    console.log();
    
    console.log('Option 3: Use LocalTunnel (Free, no signup)');
    console.log('Install: npm install -g localtunnel');
    console.log('Run: lt --port 3000');
    console.log();
    
    console.log('Option 4: Use Serveo (Free, no signup)');
    console.log('Run: ssh -R 80:localhost:3000 serveo.net');
    console.log();
    
    const choice = await askQuestion('Which option would you like to try? (2/3/4): ');
    
    switch(choice) {
      case '2':
        console.log('\n🚀 Starting Cloudflare Tunnel...');
        exec('npx cloudflared tunnel --url http://localhost:3000', (error, stdout, stderr) => {
          if (error) {
            console.error('❌ Error:', error.message);
            console.log('💡 Try installing cloudflared first or use option 3');
          }
        });
        break;
        
      case '3':
        console.log('\n📦 Installing LocalTunnel...');
        exec('npm install -g localtunnel', (error) => {
          if (error) {
            console.error('❌ Installation failed:', error.message);
          } else {
            console.log('✅ LocalTunnel installed!');
            console.log('🚀 Starting tunnel...');
            exec('lt --port 3000', (error, stdout, stderr) => {
              console.log(stdout);
            });
          }
        });
        break;
        
      case '4':
        console.log('\n🚀 Starting Serveo tunnel...');
        console.log('💡 This will open an SSH connection');
        exec('ssh -R 80:localhost:3000 serveo.net', (error, stdout, stderr) => {
          console.log(stdout);
        });
        break;
        
      default:
        console.log('\n💡 You can also:');
        console.log('1. Create ngrok account later');
        console.log('2. Deploy to a free hosting service');
        console.log('3. Test locally first');
    }
    
    rl.close();
  }
}

setupNgrok();
