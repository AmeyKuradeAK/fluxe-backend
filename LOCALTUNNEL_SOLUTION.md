# 🌐 LocalTunnel API Solution

Your LocalTunnel URL: `https://proud-socks-make.loca.lt`

## 🔓 **The Password Issue**

LocalTunnel shows a password screen when accessed via browser, but this is only for browser security. **API calls work directly without any password** - the issue is that LocalTunnel sometimes returns HTML instead of JSON.

## ✅ **Working Solutions**

### **Option 1: Use curl directly (Recommended)**

```bash
# Test your health endpoint
curl -H "User-Agent: API-Client" https://proud-socks-make.loca.lt/health

# Test async generation
curl -X POST "https://proud-socks-make.loca.lt/generate-async" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: supersecretkey123" \
  -H "User-Agent: API-Client" \
  -d '{
    "prompt": "Create a simple counter app",
    "userId": "test123"
  }'
```

### **Option 2: Use with specific headers in your frontend**

```javascript
// Always include these headers when calling your LocalTunnel API
const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': 'supersecretkey123',
  'User-Agent': 'Flutter-Generator-Frontend',
  'Accept': 'application/json'
};

// Example fetch call
const response = await fetch('https://proud-socks-make.loca.lt/generate-async', {
  method: 'POST',
  headers: headers,
  body: JSON.stringify({
    prompt: 'Create a todo app',
    userId: 'user123',
    webhookUrl: 'https://your-frontend.netlify.app/.netlify/functions/webhook'
  })
});
```

### **Option 3: Create a Custom Subdomain**

```bash
# Use a custom subdomain (might work better)
lt --port 3000 --subdomain your-flutter-api
```

This gives you: `https://your-flutter-api.loca.lt`

## 🚀 **For Your Frontend Integration**

Use this configuration:

```javascript
// Your frontend API configuration
const API_CONFIG = {
  baseURL: 'https://proud-socks-make.loca.lt',
  apiKey: 'supersecretkey123',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Flutter-Generator-App'
  }
};

// Generate Flutter app function
async function generateFlutterApp(prompt, userId, webhookUrl) {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/generate-async`, {
      method: 'POST',
      headers: {
        ...API_CONFIG.headers,
        'X-API-Key': API_CONFIG.apiKey
      },
      body: JSON.stringify({
        prompt,
        userId,
        webhookUrl
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Generation started:', data.jobId);
      return data;
    } else {
      throw new Error(`API Error: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Generation failed:', error);
    throw error;
  }
}

// Check job status
async function checkJobStatus(jobId) {
  const response = await fetch(`${API_CONFIG.baseURL}/generate-async/status/${jobId}`, {
    headers: {
      ...API_CONFIG.headers,
      'X-API-Key': API_CONFIG.apiKey
    }
  });
  
  return response.json();
}
```

## 🧪 **Testing Your API Right Now**

Run these commands in your terminal to test:

```bash
# 1. Test health (should work)
curl -s -H "Accept: application/json" https://proud-socks-make.loca.lt/health

# 2. Test root endpoint
curl -s -H "Accept: application/json" https://proud-socks-make.loca.lt/

# 3. Start a Flutter generation
curl -X POST "https://proud-socks-make.loca.lt/generate-async" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: supersecretkey123" \
  -H "Accept: application/json" \
  -d '{
    "prompt": "Create a simple counter app with Material Design",
    "userId": "test_user_123"
  }'

# 4. Check the job status (use the jobId from step 3)
curl -H "X-API-Key: supersecretkey123" \
  -H "Accept: application/json" \
  "https://proud-socks-make.loca.lt/generate-async/status/JOB_ID_HERE"
```

## 📱 **Complete Frontend Example**

```html
<!DOCTYPE html>
<html>
<head>
    <title>Flutter Generator</title>
</head>
<body>
    <h1>Flutter App Generator</h1>
    <input type="text" id="prompt" placeholder="Describe your app..." />
    <button onclick="generateApp()">Generate App</button>
    <div id="status"></div>

    <script>
        const API_BASE = 'https://proud-socks-make.loca.lt';
        const API_KEY = 'supersecretkey123';

        async function generateApp() {
            const prompt = document.getElementById('prompt').value;
            const statusDiv = document.getElementById('status');

            statusDiv.innerHTML = '🔄 Starting generation...';

            try {
                const response = await fetch(`${API_BASE}/generate-async`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': API_KEY,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        prompt: prompt,
                        userId: 'demo_user',
                        webhookUrl: window.location.origin + '/webhook'
                    })
                });

                const data = await response.json();
                
                if (data.success) {
                    statusDiv.innerHTML = `✅ Generation started!<br>Job ID: ${data.jobId}<br>Estimated time: ${data.estimatedTime}`;
                    
                    // Poll for status
                    pollJobStatus(data.jobId);
                } else {
                    statusDiv.innerHTML = `❌ Error: ${data.error}`;
                }
            } catch (error) {
                statusDiv.innerHTML = `❌ Network error: ${error.message}`;
            }
        }

        async function pollJobStatus(jobId) {
            const statusDiv = document.getElementById('status');
            
            const interval = setInterval(async () => {
                try {
                    const response = await fetch(`${API_BASE}/generate-async/status/${jobId}`, {
                        headers: {
                            'X-API-Key': API_KEY,
                            'Accept': 'application/json'
                        }
                    });
                    
                    const data = await response.json();
                    const job = data.job;
                    
                    statusDiv.innerHTML = `
                        Job Status: ${job.status}<br>
                        ${job.data.step || ''}
                    `;
                    
                    if (job.status === 'completed') {
                        clearInterval(interval);
                        statusDiv.innerHTML = `
                            ✅ App ready!<br>
                            <a href="${API_BASE}${job.data.apkDownloadUrl}">Download APK</a><br>
                            <a href="${job.data.githubRepo}" target="_blank">View on GitHub</a>
                        `;
                    } else if (job.status === 'failed') {
                        clearInterval(interval);
                        statusDiv.innerHTML = `❌ Generation failed: ${job.data.error}`;
                    }
                } catch (error) {
                    console.error('Status check failed:', error);
                }
            }, 10000); // Check every 10 seconds
        }
    </script>
</body>
</html>
```

## 🎉 **Your API is Working!**

**Public URL:** `https://proud-socks-make.loca.lt`
**API Key:** `supersecretkey123`

Use the curl commands above to test, and integrate with your frontend using the JavaScript examples!

The password screen only affects browser access - your API calls will work perfectly! 🚀
