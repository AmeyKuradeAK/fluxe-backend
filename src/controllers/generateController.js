const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { Octokit } = require('@octokit/rest');
const simpleGit = require('simple-git');
const archiver = require('archiver');
const { promisify } = require('util');

const execAsync = promisify(exec);

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;

// Generate a clean project name from prompt
function generateProjectName(prompt) {
  const cleanPrompt = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 30);
  const timestamp = Date.now().toString().slice(-6);
  return `flutter_${cleanPrompt}_${timestamp}`;
}

// Remove code fences from file content
function cleanContent(content) {
  return content.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '');
}

// Parse files from delimiter-based LLM response
function parseFilesFromLLMResponse(response) {
  const fileBlocks = response.split(/===\s*(.+?)\s*===/g).slice(1);
  const files = [];
  for (let i = 0; i < fileBlocks.length; i += 2) {
    const path = fileBlocks[i].trim();
    const content = fileBlocks[i + 1] ? fileBlocks[i + 1].trim() : '';
    if (path && content) files.push({ path, content });
  }
  return files;
}

// Enhanced LLM call with better prompting
async function callLLM(prompt) {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      messages: [
        {
          role: 'system',
          content: `You are an expert Flutter developer. Generate a complete, working Flutter app with the following requirements:

CRITICAL REQUIREMENTS:
- Generate ONLY working, compilable Flutter code
- Use ONLY real, published Flutter packages from pub.dev
- Include proper imports for all used packages
- Ensure all syntax is correct and follows Flutter best practices
- Add comprehensive error handling
- Include professional UI/UX design
- Make the app responsive and visually appealing
- Include proper state management (Provider, Riverpod, or Bloc)
- Add loading states and error handling
- Include proper navigation if needed
- Use hardcoded data (no API calls)
- Include assets and custom fonts if needed

RESPONSE FORMAT:
Respond ONLY with file contents separated by delimiters. No explanations, no markdown formatting:

=== pubspec.yaml ===
<complete pubspec.yaml content>
=== lib/main.dart ===
<complete main.dart content>
=== lib/screens/home_screen.dart ===
<complete home screen content>
=== lib/models/app_model.dart ===
<complete model content if needed>
=== lib/providers/app_provider.dart ===
<complete provider content if needed>
=== lib/widgets/custom_widget.dart ===
<complete widget content if needed>
=== README.md ===
<complete README with setup instructions>

IMPORTANT: Every file must be complete and syntactically correct. Test your code mentally before responding.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 8192,
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mistral API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Run Flutter commands with proper error handling
async function runFlutterCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd, timeout: 300000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Command failed: ${command}\nError: ${error.message}\nStderr: ${stderr}`));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// Validate Flutter project by running flutter analyze
async function validateFlutterProject(projectPath) {
  try {
    // First, run flutter pub get
    await runFlutterCommand('flutter pub get', projectPath);
    
    // Run flutter analyze to check for errors
    const analyzeResult = await runFlutterCommand('flutter analyze --no-fatal-infos', projectPath);
    
    // Check if there are any errors in the analysis
    if (analyzeResult.stdout.includes('error') || analyzeResult.stderr.includes('error')) {
      throw new Error(`Flutter analyze found errors:\n${analyzeResult.stdout}\n${analyzeResult.stderr}`);
    }
    
    return true;
  } catch (error) {
    throw new Error(`Project validation failed: ${error.message}`);
  }
}

// Create GitHub repository and push code
async function createGitHubRepo(projectName, projectPath, prompt) {
  try {
    const octokit = new Octokit({
      auth: GITHUB_TOKEN,
    });

    // Create repository
    const { data: repo } = await octokit.repos.createForAuthenticatedUser({
      name: projectName,
      description: `Flutter app: ${prompt.substring(0, 100)}...`,
      private: false,
      auto_init: false
    });

    // Initialize git and push
    const git = simpleGit(projectPath);
    await git.init();
    await git.add('.');
    await git.commit('Initial commit - Generated Flutter app');
    await git.addRemote('origin', repo.clone_url.replace('https://', `https://${GITHUB_TOKEN}@`));
    await git.push('origin', 'main');

    return {
      repoUrl: repo.html_url,
      cloneUrl: repo.clone_url
    };
  } catch (error) {
    throw new Error(`GitHub repository creation failed: ${error.message}`);
  }
}

// Create ZIP file of APK
async function createApkZip(apkPath, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(outputPath));
    archive.on('error', reject);

    archive.pipe(output);
    archive.file(apkPath, { name: 'app-release.apk' });
    archive.finalize();
  });
}

// Clean up project directory
async function cleanupProject(projectPath) {
  try {
    await fs.promises.rm(projectPath, { recursive: true, force: true });
    console.log(`Cleaned up project: ${projectPath}`);
  } catch (error) {
    console.error(`Failed to cleanup project ${projectPath}:`, error.message);
  }
}

// Main controller function
exports.generateFlutterProject = async (req, res) => {
  const { prompt, userId } = req.body;
  
  // Validation
  if (!prompt || !userId) {
    return res.status(400).json({ 
      error: 'Both prompt and userId are required',
      success: false 
    });
  }

  if (!MISTRAL_API_KEY || !GITHUB_TOKEN || !GITHUB_USERNAME) {
    return res.status(500).json({ 
      error: 'Server configuration incomplete. Missing API keys.',
      success: false 
    });
  }

  const projectName = generateProjectName(prompt);
  const projectsRoot = path.join(__dirname, '../../flutter_projects');
  const projectPath = path.join(projectsRoot, projectName);
  const apkPath = path.join(projectPath, 'build', 'app', 'outputs', 'flutter-apk', 'app-release.apk');
  const zipPath = path.join(projectsRoot, `${projectName}_apk.zip`);

  let repoInfo = null;

  try {
    // Ensure projects directory exists
    if (!fs.existsSync(projectsRoot)) {
      fs.mkdirSync(projectsRoot, { recursive: true });
    }

    // Step 1: Create Flutter project
    console.log(`Creating Flutter project: ${projectName}`);
    await runFlutterCommand(`flutter create ${projectName}`, projectsRoot);

    // Step 2: Generate code using Mistral
    console.log('Generating Flutter code...');
    const llmResponse = await callLLM(prompt);
    const files = parseFilesFromLLMResponse(llmResponse);

    if (!Array.isArray(files) || files.length === 0) {
      throw new Error('No files generated from AI response');
    }

    // Step 3: Write generated files
    console.log('Writing generated files...');
    for (const file of files) {
      const filePath = path.join(projectPath, file.path);
      const dir = path.dirname(filePath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, cleanContent(file.content));
    }

    // Step 4: Validate the project
    console.log('Validating Flutter project...');
    await validateFlutterProject(projectPath);

    // Step 5: Build APK
    console.log('Building APK...');
    await runFlutterCommand('flutter build apk --release', projectPath);

    // Verify APK exists
    if (!fs.existsSync(apkPath)) {
      throw new Error('APK file not found after build');
    }

    // Step 6: Create ZIP of APK
    console.log('Creating APK ZIP...');
    await createApkZip(apkPath, zipPath);

    // Step 7: Create GitHub repository and push code
    console.log('Creating GitHub repository...');
    repoInfo = await createGitHubRepo(projectName, projectPath, prompt);

    // Step 8: Send response
    res.json({
      success: true,
      message: 'Flutter project generated successfully!',
      data: {
        userId: userId,
        projectName: projectName,
        apkDownloadUrl: `/download/${projectName}_apk.zip`,
        githubRepo: repoInfo.repoUrl,
        timestamp: new Date().toISOString()
      }
    });

    // Step 9: Schedule cleanup (5 minutes after successful response)
    setTimeout(async () => {
      await cleanupProject(projectPath);
      // Clean up ZIP file after 1 hour
      setTimeout(() => {
        if (fs.existsSync(zipPath)) {
          fs.unlinkSync(zipPath);
          console.log(`Cleaned up ZIP: ${zipPath}`);
        }
      }, 60 * 60 * 1000); // 1 hour
    }, 5 * 60 * 1000); // 5 minutes

  } catch (error) {
    console.error('Error in generateFlutterProject:', error);
    
    // Cleanup on error
    if (fs.existsSync(projectPath)) {
      await cleanupProject(projectPath);
    }
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate Flutter project',
      details: error.message,
      userId: userId
    });
  }
};

// Health check endpoint
exports.healthCheck = (req, res) => {
  const requiredEnvVars = ['MISTRAL_API_KEY', 'GITHUB_TOKEN', 'GITHUB_USERNAME'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    configurationComplete: missingVars.length === 0,
    missingConfiguration: missingVars
  });
};
