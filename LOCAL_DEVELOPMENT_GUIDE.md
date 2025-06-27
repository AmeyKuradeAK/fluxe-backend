# 🚀 Local Development with ngrok

This guide shows you how to run your Flutter Project Generator API locally and make it publicly accessible via ngrok.

## 🎯 Quick Start

### 1. Start the Local Server

Open PowerShell/Terminal in the project directory and run:

```powershell
npm run local
```

You should see:
```
✅ Environment variables configured
🌐 Starting development server...
Server running on port 3000
```

### 2. Start ngrok Tunnel

**Option A: Using the batch script (Windows)**
- Double-click `start-ngrok.bat`
- Or run from command line: `start-ngrok.bat`

**Option B: Manual command**
Open a new PowerShell/Terminal window and run:
```powershell
ngrok http 3000
```

### 3. Get Your Public URL

ngrok will show something like:
```
Forwarding    https://abc123-45-67-89-012.ngrok-free.app -> http://localhost:3000
```

Copy the HTTPS URL (e.g., `https://abc123-45-67-89-012.ngrok-free.app`)

## 🧪 Testing Your Public API

### Health Check (No API Key Required)
```bash
curl https://your-ngrok-url.ngrok-free.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 123.45
}
```

### Generate Flutter Project
```bash
curl -X POST "https://your-ngrok-url.ngrok-free.app/generate" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: supersecretkey123" \
  -d '{
    "prompt": "Create a simple counter app with Material Design",
    "userId": "test123"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Flutter project generated successfully!",
  "data": {
    "userId": "test123",
    "projectName": "flutter_simple_counter_app_with_material_design_123456",
    "apkDownloadUrl": "/generate/download/flutter_simple_counter_app_with_material_design_123456_apk.zip",
    "githubRepo": "https://github.com/AmeyKuradeAK/flutter_simple_counter_app_with_material_design_123456",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

### Download APK
```bash
curl -O -H "X-API-Key: supersecretkey123" \
  "https://your-ngrok-url.ngrok-free.app/generate/download/flutter_project_123456_apk.zip"
```

## 🔧 Configuration

Your current configuration:
- **API Key**: `supersecretkey123`
- **Port**: `3000`
- **Mistral AI**: ✅ Configured
- **GitHub**: ✅ Configured (AmeyKuradeAK)

## 📱 Frontend Integration Example

### JavaScript/Fetch
```javascript
const API_BASE = 'https://your-ngrok-url.ngrok-free.app';
const API_KEY = 'supersecretkey123';

async function generateFlutterApp(prompt, userId) {
  try {
    const response = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({ prompt, userId })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Project created!');
      console.log('📱 APK:', `${API_BASE}${result.data.apkDownloadUrl}`);
      console.log('📂 GitHub:', result.data.githubRepo);
      
      // Trigger download
      window.open(`${API_BASE}${result.data.apkDownloadUrl}`);
    } else {
      console.error('❌ Error:', result.error);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

// Usage
generateFlutterApp('Create a todo app with dark theme', 'user123');
```

### React Example
```jsx
import React, { useState } from 'react';

const FlutterGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const generateApp = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://your-ngrok-url.ngrok-free.app/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'supersecretkey123'
        },
        body: JSON.stringify({ prompt, userId })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Flutter App Generator</h2>
      <input
        type="text"
        placeholder="Enter app description..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <input
        type="text"
        placeholder="User ID"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
      />
      <button onClick={generateApp} disabled={loading}>
        {loading ? 'Generating...' : 'Generate App'}
      </button>
      
      {result && result.success && (
        <div>
          <p>✅ App generated successfully!</p>
          <a href={result.data.githubRepo} target="_blank">View on GitHub</a>
          <br />
          <a href={`https://your-ngrok-url.ngrok-free.app${result.data.apkDownloadUrl}`}>
            Download APK
          </a>
        </div>
      )}
    </div>
  );
};
```

## 🛠️ Development Workflow

1. **Start Local Server**: `npm run local`
2. **Start ngrok**: Double-click `start-ngrok.bat` or run `ngrok http 3000`
3. **Update Frontend**: Use the ngrok URL in your frontend code
4. **Test API**: Use the provided curl commands
5. **Develop**: Make changes to your code, server auto-restarts
6. **Share**: Give the ngrok URL to others for testing

## 🔒 Security Notes

- **API Key**: Change `supersecretkey123` to something secure for production
- **ngrok Free Limits**: 
  - 1 online tunnel at a time
  - 20 connections/minute
  - 40 requests/minute
- **GitHub Token**: Keep your token secure, it has repo creation permissions

## 🚀 Going to Production

When ready for production:

1. **VPS Deployment**: Use the Docker setup from the main README
2. **Domain Setup**: Point your domain to VPS IP
3. **SSL**: Use Let's Encrypt for HTTPS
4. **API Key**: Generate a strong production API key

## 📞 Support

If you encounter issues:

1. Check server logs in the terminal
2. Verify ngrok is running and accessible
3. Test endpoints with curl first
4. Check GitHub token permissions if repo creation fails

## 🎉 You're All Set!

Your Flutter Project Generator API is now:
- ✅ Running locally on your PC
- ✅ Publicly accessible via ngrok
- ✅ Ready for frontend integration
- ✅ Capable of generating Flutter apps with APKs
- ✅ Automatically creating GitHub repositories

Happy coding! 🚀
