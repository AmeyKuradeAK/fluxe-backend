# Flutter Project Generator API

A powerful REST API service that generates complete Flutter projects with APK builds and automatic GitHub repository creation based on natural language prompts.

## Features

- 🚀 **AI-Powered Generation**: Uses Mistral AI to generate complete Flutter projects from prompts
- 📱 **APK Building**: Automatically builds release APKs for generated projects
- 🔄 **GitHub Integration**: Creates repositories and pushes generated code automatically
- ✅ **Project Validation**: Runs `flutter analyze` to ensure code quality
- 🧹 **Auto Cleanup**: Automatically cleans up temporary files
- 🔒 **Secure API**: API key-based authentication
- 🌐 **VPS Ready**: Docker support for easy deployment
- 📦 **Download Support**: Direct APK download via API

## Prerequisites

Before running this project, ensure you have:

- **Node.js** (v18 or higher)
- **Flutter SDK** (latest stable)
- **Git** (for repository operations)
- **Docker** (for VPS deployment)

## API Keys Required

You'll need the following API keys:

1. **Mistral AI API Key**: Get from [Mistral AI](https://mistral.ai/)
2. **GitHub Personal Access Token**: Get from [GitHub Settings](https://github.com/settings/tokens)
   - Required permissions: `repo`, `user`, `delete_repo`

## Local Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd fluxe-backend
npm install
```

### 2. Environment Configuration

Update the `.env` file with your credentials:

```env
API_KEY=your_secure_api_key_here
PORT=3000
MISTRAL_API_KEY=your_mistral_api_key_here
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_USERNAME=your_github_username
NODE_ENV=development
```

### 3. Run Locally

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:3000`

## VPS Deployment

### Using Docker

1. **Build the Docker image:**
```bash
docker build -t flutter-generator .
```

2. **Run the container:**
```bash
docker run -d \
  --name flutter-api \
  -p 3000:3000 \
  -e API_KEY=your_secure_api_key_here \
  -e MISTRAL_API_KEY=your_mistral_api_key_here \
  -e GITHUB_TOKEN=your_github_token \
  -e GITHUB_USERNAME=your_github_username \
  -e NODE_ENV=production \
  flutter-generator
```

3. **Using Docker Compose (Recommended):**

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  flutter-api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - API_KEY=your_secure_api_key_here
      - MISTRAL_API_KEY=your_mistral_api_key_here
      - GITHUB_TOKEN=your_github_token
      - GITHUB_USERNAME=your_github_username
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Run with:
```bash
docker-compose up -d
```

## Public Access Setup

To make your API publicly accessible:

### Option 1: Direct VPS with Domain
1. Point your domain to your VPS IP
2. Use nginx as reverse proxy
3. Enable SSL with Let's Encrypt

### Option 2: Cloud Services
- **Railway**: Connect your GitHub repo for auto-deploy
- **Heroku**: Use the included `Dockerfile` for deployment
- **DigitalOcean App Platform**: Deploy directly from GitHub

### Option 3: Tunneling (Development)
```bash
# Using ngrok for development testing
npx ngrok http 3000
```

## API Usage

### Authentication
All requests (except `/health`) require an API key in the header:
```
X-API-Key: your_api_key_here
```

### Endpoints

#### 1. Generate Flutter Project
```http
POST /generate
Content-Type: application/json
X-API-Key: your_api_key_here

{
  "prompt": "Create a todo app with dark theme and local storage",
  "userId": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Flutter project generated successfully!",
  "data": {
    "userId": "user123",
    "projectName": "flutter_todo_app_dark_theme_123456",
    "apkDownloadUrl": "/generate/download/flutter_todo_app_dark_theme_123456_apk.zip",
    "githubRepo": "https://github.com/username/flutter_todo_app_dark_theme_123456",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

#### 2. Health Check
```http
GET /generate/health
```

#### 3. Download APK
```http
GET /generate/download/flutter_project_123456_apk.zip
X-API-Key: your_api_key_here
```

### Example Usage with cURL

```bash
# Generate a Flutter project
curl -X POST "https://your-api-domain.com/generate" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
    "prompt": "Create a weather app with location services and 5-day forecast",
    "userId": "user456"
  }'

# Download the generated APK
curl -O -H "X-API-Key: your_api_key_here" \
  "https://your-api-domain.com/generate/download/flutter_weather_app_123456_apk.zip"
```

### Frontend Integration Example

```javascript
const generateFlutterApp = async (prompt, userId) => {
  try {
    const response = await fetch('https://your-api-domain.com/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'your_api_key_here'
      },
      body: JSON.stringify({ prompt, userId })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Show success message
      console.log('Project created:', result.data.githubRepo);
      
      // Trigger APK download
      window.open(`https://your-api-domain.com${result.data.apkDownloadUrl}`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## Process Flow

1. **Validation**: Validates prompt and userId
2. **Project Creation**: Creates a new Flutter project structure
3. **AI Generation**: Uses Mistral AI to generate complete Flutter code
4. **File Writing**: Writes all generated files to the project
5. **Validation**: Runs `flutter analyze` to check for errors
6. **Building**: Executes `flutter build apk --release`
7. **Packaging**: Creates a ZIP file containing the APK
8. **GitHub Repo**: Creates a new GitHub repository and pushes the code
9. **Response**: Returns download link and repository URL
10. **Cleanup**: Automatically removes temporary files

## Troubleshooting

### Common Issues

1. **Flutter not found**: Ensure Flutter is in PATH
2. **Permission denied**: Check file permissions in Docker
3. **GitHub API errors**: Verify token permissions
4. **Build failures**: Check Flutter project structure

### Logs
```bash
# Docker logs
docker logs flutter-api

# Follow logs in real-time
docker logs -f flutter-api
```

### Health Checks
```bash
# Quick health check
curl http://localhost:3000/health

# Detailed health check with config validation
curl -H "X-API-Key: your_api_key" http://localhost:3000/generate/health
```

## Security Considerations

- Use strong API keys (minimum 32 characters)
- Regularly rotate GitHub tokens
- Monitor API usage and implement rate limiting
- Use HTTPS in production
- Keep dependencies updated

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Check the troubleshooting section
- Review the health check endpoints
- Check Docker/container logs
- Verify all environment variables are set correctly
