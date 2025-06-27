# 🔄 Async Flutter Generator API with Webhooks

This guide shows how to use the async API that solves the Netlify 10-second timeout issue by using webhooks to notify your frontend when the Flutter project is ready.

## 🎯 Problem Solved

- **Netlify timeout**: 10 seconds max
- **Flutter build time**: 2-3 minutes
- **Solution**: Async API + Webhooks

## 🚀 How It Works

1. **Frontend** → Sends request to `/generate-async` with webhook URL
2. **API** → Returns job ID immediately (< 1 second)
3. **Background** → Processes Flutter project (2-3 minutes)
4. **Webhook** → Notifies frontend when complete with download links

## 📋 API Endpoints

### 1. Start Async Generation
```http
POST /generate-async
Content-Type: application/json
X-API-Key: supersecretkey123

{
  "prompt": "Create a todo app with dark theme",
  "userId": "user123",
  "webhookUrl": "https://your-frontend.netlify.app/.netlify/functions/webhook"
}
```

**Response (Immediate):**
```json
{
  "success": true,
  "message": "Flutter project generation started",
  "jobId": "job_1703123456789_abc123def",
  "statusUrl": "/generate-async/status/job_1703123456789_abc123def",
  "estimatedTime": "2-3 minutes",
  "webhookConfigured": true,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 2. Check Job Status (Optional)
```http
GET /generate-async/status/job_1703123456789_abc123def
X-API-Key: supersecretkey123
```

**Response:**
```json
{
  "success": true,
  "job": {
    "id": "job_1703123456789_abc123def",
    "userId": "user123",
    "status": "in_progress",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:01:30.000Z",
    "data": {
      "step": "Building APK (this may take a while)",
      "projectName": "flutter_todo_app_with_dark_theme_123456"
    }
  }
}
```

**Status Values:**
- `queued` - Job is waiting to start
- `starting` - Job is initializing
- `in_progress` - Job is running (with step details)
- `completed` - Job finished successfully
- `failed` - Job failed with error

### 3. Webhook Notification (Automatic)

When the job completes, your webhook URL receives:

**Success Webhook:**
```json
{
  "jobId": "job_1703123456789_abc123def",
  "timestamp": "2024-01-01T12:03:00.000Z",
  "status": "success",
  "message": "Flutter project generated successfully!",
  "data": {
    "userId": "user123",
    "projectName": "flutter_todo_app_with_dark_theme_123456",
    "apkDownloadUrl": "/generate-async/download/flutter_todo_app_with_dark_theme_123456_apk.zip",
    "githubRepo": "https://github.com/AmeyKuradeAK/flutter_todo_app_with_dark_theme_123456",
    "timestamp": "2024-01-01T12:03:00.000Z"
  }
}
```

**Error Webhook:**
```json
{
  "jobId": "job_1703123456789_abc123def",
  "timestamp": "2024-01-01T12:03:00.000Z",
  "status": "error",
  "message": "Flutter project generation failed",
  "error": "Flutter analyze found errors: ...",
  "userId": "user123"
}
```

## 🌐 Setting Up Your Webhook Endpoint

### Option 1: Netlify Functions

Create `.netlify/functions/webhook.js`:

```javascript
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const webhook = JSON.parse(event.body);
    
    console.log('Webhook received:', webhook.jobId, webhook.status);
    
    if (webhook.status === 'success') {
      // Store the result in your database/storage
      // Notify your frontend (WebSocket, Server-Sent Events, etc.)
      // Send email notification, etc.
      
      console.log('APK ready:', webhook.data.apkDownloadUrl);
      console.log('GitHub repo:', webhook.data.githubRepo);
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

### Option 2: Vercel API Route

Create `pages/api/webhook.js`:

```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jobId, status, data, error } = req.body;
    
    console.log('Webhook received:', jobId, status);
    
    if (status === 'success') {
      // Handle success
      console.log('APK ready:', data.apkDownloadUrl);
      console.log('GitHub repo:', data.githubRepo);
      
      // Update your database
      // Notify user via WebSocket/SSE
      // Send notifications
    } else if (status === 'error') {
      // Handle error
      console.error('Generation failed:', error);
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Option 3: Express.js Webhook

```javascript
app.post('/api/webhook', (req, res) => {
  const { jobId, status, data, error } = req.body;
  
  console.log('Webhook received:', jobId, status);
  
  if (status === 'success') {
    // Handle success
    notifyUser(data.userId, {
      type: 'flutter_app_ready',
      apkUrl: data.apkDownloadUrl,
      githubRepo: data.githubRepo
    });
  }
  
  res.json({ success: true });
});
```

## 🧪 Testing Locally

### 1. Start Your API Server
```bash
npm run local
```

### 2. Start ngrok for API
```bash
ngrok http 3000
```
Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### 3. Start Webhook Test Server
```bash
node webhook-test-server.js
```

### 4. Start ngrok for Webhook Server
```bash
ngrok http 3001
```
Copy the HTTPS URL for webhooks (e.g., `https://def456.ngrok.io`)

### 5. Test the Flow
```bash
# Start async generation
curl -X POST "https://abc123.ngrok.io/generate-async" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: supersecretkey123" \
  -d '{
    "prompt": "Create a simple counter app",
    "userId": "test123",
    "webhookUrl": "https://def456.ngrok.io/webhook"
  }'

# Check job status (optional)
curl -H "X-API-Key: supersecretkey123" \
  "https://abc123.ngrok.io/generate-async/status/job_1703123456789_abc123def"
```

## 📱 Frontend Integration Examples

### React with State Management

```jsx
import React, { useState, useEffect } from 'react';

const FlutterGenerator = () => {
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateApp = async (prompt, userId) => {
    setLoading(true);
    setStatus('submitting');
    
    try {
      const response = await fetch('/api/generate-flutter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          userId,
          webhookUrl: `${window.location.origin}/api/webhook`
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setJobId(data.jobId);
        setStatus('processing');
        // Optionally poll status or wait for webhook
      }
    } catch (error) {
      console.error('Error:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Handle webhook notifications (via WebSocket, SSE, or polling)
  useEffect(() => {
    if (jobId) {
      // Poll status every 30 seconds
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/job-status/${jobId}`);
          const data = await response.json();
          
          if (data.job.status === 'completed') {
            setResult(data.job.data);
            setStatus('completed');
            clearInterval(interval);
          } else if (data.job.status === 'failed') {
            setStatus('error');
            clearInterval(interval);
          }
        } catch (error) {
          console.error('Status check error:', error);
        }
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [jobId]);

  return (
    <div>
      <h2>Flutter App Generator</h2>
      
      {status === 'idle' && (
        <button onClick={() => generateApp('Create a todo app', 'user123')}>
          Generate App
        </button>
      )}
      
      {status === 'processing' && (
        <div>
          <p>🔄 Generating your Flutter app...</p>
          <p>Job ID: {jobId}</p>
          <p>This usually takes 2-3 minutes</p>
        </div>
      )}
      
      {status === 'completed' && result && (
        <div>
          <p>✅ Your Flutter app is ready!</p>
          <a href={result.githubRepo} target="_blank">View Code on GitHub</a>
          <br />
          <a href={result.apkDownloadUrl}>Download APK</a>
        </div>
      )}
    </div>
  );
};
```

### Vue.js Example

```vue
<template>
  <div>
    <h2>Flutter App Generator</h2>
    
    <div v-if="status === 'idle'">
      <input v-model="prompt" placeholder="Describe your app..." />
      <button @click="generateApp" :disabled="loading">
        Generate App
      </button>
    </div>
    
    <div v-if="status === 'processing'">
      <p>🔄 Generating your Flutter app...</p>
      <p>Job ID: {{ jobId }}</p>
      <p>Estimated time: 2-3 minutes</p>
    </div>
    
    <div v-if="status === 'completed' && result">
      <p>✅ Your Flutter app is ready!</p>
      <a :href="result.githubRepo" target="_blank">View on GitHub</a>
      <br />
      <a :href="result.apkDownloadUrl">Download APK</a>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      prompt: '',
      jobId: null,
      status: 'idle',
      result: null,
      loading: false
    };
  },
  
  methods: {
    async generateApp() {
      this.loading = true;
      this.status = 'processing';
      
      try {
        const response = await fetch('/api/generate-flutter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: this.prompt,
            userId: 'user123',
            webhookUrl: `${window.location.origin}/api/webhook`
          })
        });
        
        const data = await response.json();
        this.jobId = data.jobId;
      } catch (error) {
        console.error('Error:', error);
        this.status = 'error';
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
```

## 🔧 Production Setup

### Environment Variables
```env
# Your backend API
API_BASE_URL=https://your-api-domain.com
API_KEY=your_secure_api_key

# Webhook URL for your frontend
WEBHOOK_URL=https://your-frontend.netlify.app/.netlify/functions/webhook
```

### Database Storage
Store job results in your database when webhook is received:

```sql
CREATE TABLE flutter_jobs (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),
  status VARCHAR(50),
  prompt TEXT,
  project_name VARCHAR(255),
  apk_download_url VARCHAR(500),
  github_repo_url VARCHAR(500),
  created_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

## 🎉 Benefits

✅ **No Timeouts** - Works with any hosting platform  
✅ **Real-time Updates** - Webhooks notify immediately  
✅ **Scalable** - Handle multiple concurrent requests  
✅ **Reliable** - Job status tracking and error handling  
✅ **User-Friendly** - Immediate feedback with progress updates  

Your Flutter Generator API is now production-ready for any frontend! 🚀
