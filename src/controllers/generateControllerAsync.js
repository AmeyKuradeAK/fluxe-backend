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

// In-memory storage for job status (use Redis in production)
const jobs = new Map();

// Generate a unique job ID
function generateJobId() {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

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

// Enhanced LLM call with better prompting for real-world apps
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
content: `You are an expert Flutter developer creating modern Flutter 3.24+ applications. Generate ONLY working, error-free code using current Flutter APIs and best practices.

🚨 CRITICAL - AVOID DEPRECATED APIS:
- NEVER use: headline1, headline2, headline3, headline4, headline5, headline6
- NEVER use: bodyText1, bodyText2, subtitle1, subtitle2, caption, overline
- ALWAYS use: displayLarge, displayMedium, displaySmall, headlineLarge, headlineMedium, headlineSmall, titleLarge, titleMedium, titleSmall, bodyLarge, bodyMedium, bodySmall, labelLarge, labelMedium, labelSmall

✅ MODERN FLUTTER REQUIREMENTS:
1. Use Material Design 3 (Material 3) only
2. Use current TextTheme properties: Theme.of(context).textTheme.headlineMedium (NOT headline4)
3. Use proper imports for all widgets and packages
4. Include comprehensive error handling with try-catch blocks
5. Use proper state management (Provider, Riverpod, or setState)
6. Include loading states and error handling
7. Make responsive layouts that work on all screen sizes
8. Use real, published packages from pub.dev only

📱 CODE STRUCTURE:
- Clean, readable code with proper naming conventions
- Proper widget composition and reusability
- State management that prevents memory leaks
- Error boundaries and graceful failure handling
- Loading indicators for async operations
- Empty states and error messages

🎨 UI REQUIREMENTS:
- Material Design 3 components only
- Consistent theming throughout the app
- Proper spacing and typography
- Responsive design for different screen sizes
- Smooth animations and transitions
- Accessibility support

📦 DEPENDENCIES:
- Only use well-maintained, popular packages
- Specify exact versions in pubspec.yaml
- Include all necessary imports in each file
- Ensure compatibility between all packages

🔧 EXAMPLE OF CORRECT CODE:
```dart
// CORRECT - Modern TextTheme usage
Text(
  'Hello World',
  style: Theme.of(context).textTheme.headlineMedium,
)

// CORRECT - Proper error handling
try {
  final result = await someAsyncOperation();
  setState(() {
    data = result;
    isLoading = false;
  });
} catch (e) {
  setState(() {
    error = e.toString();
    isLoading = false;
  });
}

// CORRECT - Material 3 components
FilledButton(
  onPressed: () {},
  child: Text('Click Me'),
)
```

📋 RESPONSE FORMAT:
Respond with COMPLETE, ERROR-FREE files:

=== pubspec.yaml ===
<complete pubspec.yaml with specific versions>
=== lib/main.dart ===
<complete main.dart with Material 3 theme>
=== lib/screens/home_screen.dart ===
<complete home screen with modern APIs>
=== lib/models/[model_name].dart ===
<model classes if needed>
=== lib/widgets/[widget_name].dart ===
<reusable widgets if needed>
=== README.md ===
<setup instructions>

🎯 VERIFICATION:
- Every import statement must be correct
- Every TextTheme usage must use modern properties
- Every async operation must have error handling
- Every widget must be properly composed
- All code must compile without errors

GENERATE ONLY MODERN, WORKING FLUTTER CODE!`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 16384,
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

// Auto-fix common Flutter issues
async function autoFixFlutterIssues(projectPath, errorOutput) {
  console.log('🔧 Attempting auto-fixes...');
  
  // Define fixes for common Flutter issues
  const fixes = [
    {
      name: 'Deprecated TextTheme properties',
      pattern: /headline[1-6]|bodyText[1-2]|subtitle[1-2]|caption|overline/,
      apply: (content) => {
        let fixed = content;
        // Fix deprecated TextTheme properties
        fixed = fixed.replace(/\.headline1\b/g, '.displayLarge');
        fixed = fixed.replace(/\.headline2\b/g, '.displayMedium');
        fixed = fixed.replace(/\.headline3\b/g, '.displaySmall');
        fixed = fixed.replace(/\.headline4\b/g, '.headlineMedium');
        fixed = fixed.replace(/\.headline5\b/g, '.headlineSmall');
        fixed = fixed.replace(/\.headline6\b/g, '.titleLarge');
        fixed = fixed.replace(/\.subtitle1\b/g, '.titleMedium');
        fixed = fixed.replace(/\.subtitle2\b/g, '.titleSmall');
        fixed = fixed.replace(/\.bodyText1\b/g, '.bodyLarge');
        fixed = fixed.replace(/\.bodyText2\b/g, '.bodyMedium');
        fixed = fixed.replace(/\.caption\b/g, '.bodySmall');
        fixed = fixed.replace(/\.overline\b/g, '.labelSmall');
        return fixed;
      }
    },
    {
      name: 'Missing return statements',
      pattern: /return;$/gm,
      apply: (content) => content.replace(/return;$/gm, 'return null;')
    },
    {
      name: 'Unused imports',
      pattern: /^import\s+[^;]+;$/gm,
      apply: (content) => {
        // More sophisticated unused import removal would require AST parsing
        // For now, just return the content as-is
        return content;
      }
    }
  ];

  let totalFixed = 0;
  
  // Recursively find all Dart files
  function findDartFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.lstatSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'build') {
        files.push(...findDartFiles(fullPath));
      } else if (stat.isFile() && item.endsWith('.dart')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  const dartFiles = findDartFiles(projectPath);
  console.log(`🔍 Found ${dartFiles.length} Dart files to check`);

  for (const filePath of dartFiles) {
    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      let modified = false;
      const originalContent = content;

      for (const fix of fixes) {
        if (fix.pattern.test(errorOutput) || fix.pattern.test(content)) {
          const fixedContent = fix.apply(content);
          if (fixedContent !== content) {
            content = fixedContent;
            modified = true;
            console.log(`✅ Applied fix "${fix.name}" to ${path.relative(projectPath, filePath)}`);
          }
        }
      }

      if (modified) {
        fs.writeFileSync(filePath, content);
        totalFixed++;
      }
    } catch (error) {
      console.error(`❌ Error fixing file ${filePath}:`, error.message);
    }
  }

  console.log(`🎯 Auto-fix complete: ${totalFixed} files modified`);
  return totalFixed > 0;
}

// Validate Flutter project with comprehensive error checking
async function validateFlutterProject(projectPath, jobId) {
  try {
    updateJobStatus(jobId, 'in_progress', { step: 'Running flutter pub get' });
    await runFlutterCommand('flutter pub get', projectPath);

    // Check if .env.example exists and create .env with placeholder values
    const envExamplePath = path.join(projectPath, '.env.example');
    if (fs.existsSync(envExamplePath)) {
      const envExampleContent = fs.readFileSync(envExamplePath, 'utf-8');
      const envPath = path.join(projectPath, '.env');
      
      // Create .env with placeholder values for validation
      const envContent = envExampleContent.replace(/=$/gm, '=PLACEHOLDER_VALUE');
      fs.writeFileSync(envPath, envContent);
      
      console.log('Created .env file with placeholder values for validation');
    }

    updateJobStatus(jobId, 'in_progress', { step: 'Running flutter analyze' });
    
    let analyzeAttempts = 0;
    const maxAttempts = 3;
    
    while (analyzeAttempts < maxAttempts) {
      try {
        const analyzeResult = await runFlutterCommand('flutter analyze --verbose', projectPath);
        
        console.log('📋 Full analyze output:');
        console.log('STDOUT:', analyzeResult.stdout);
        console.log('STDERR:', analyzeResult.stderr);
        
        // Check for success conditions
        if (analyzeResult.stdout.includes('No issues found!') || 
            (analyzeResult.stdout.includes('0 issues found') && !analyzeResult.stdout.includes('error'))) {
          console.log('✅ Flutter analyze passed');
          break;
        } else {
          analyzeAttempts++;
          console.log(`❌ Flutter analyze found issues (attempt ${analyzeAttempts}/${maxAttempts})`);
          
          // Extract specific issues for better debugging
          const issues = analyzeResult.stdout.split('\n').filter(line => 
            line.includes('•') || line.includes('error') || line.includes('warning')
          );
          console.log('📝 Specific issues found:');
          issues.forEach(issue => console.log('  ', issue.trim()));
          
          if (analyzeAttempts < maxAttempts) {
            // Try auto-fix
            console.log('🔧 Attempting auto-fixes...');
            updateJobStatus(jobId, 'in_progress', { step: `Auto-fixing issues (attempt ${analyzeAttempts})` });
            const wasFixed = await autoFixFlutterIssues(projectPath, analyzeResult.stdout + '\n' + analyzeResult.stderr);
            
            if (wasFixed) {
              console.log('✅ Auto-fixes applied, re-running pub get...');
              await runFlutterCommand('flutter pub get', projectPath);
            }
          } else {
            // For the last attempt, still try to build
            console.log('⚠️  Max attempts reached, trying auto-fix before build...');
            await autoFixFlutterIssues(projectPath, analyzeResult.stdout + '\n' + analyzeResult.stderr);
            await runFlutterCommand('flutter pub get', projectPath);
            break;
          }
        }
      } catch (error) {
        analyzeAttempts++;
        console.log(`Analyze attempt ${analyzeAttempts} failed:`, error.message);
        if (analyzeAttempts >= maxAttempts) {
          console.log('⚠️  Analyze failed but continuing to build...');
          break; // Continue to build even if analyze fails
        }
      }
    }

    updateJobStatus(jobId, 'in_progress', { step: 'Checking app compilation' });
    
    // Check if the app compiles without actually running it
    try {
      await runFlutterCommand('flutter build apk --debug --no-pub', projectPath);
      console.log('✅ Flutter debug build successful');
    } catch (error) {
      console.log('❌ Debug build failed, but continuing with release build...');
      console.log('Debug build error:', error.message);
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

// Send webhook notification to frontend
async function sendWebhook(webhookUrl, jobId, data) {
  try {
    console.log(`Sending webhook to ${webhookUrl} for job ${jobId}`);
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Flutter-Generator-Webhook'
      },
      body: JSON.stringify({
        jobId,
        timestamp: new Date().toISOString(),
        ...data
      }),
      timeout: 10000
    });

    if (response.ok) {
      console.log(`✅ Webhook sent successfully for job ${jobId}`);
    } else {
      console.error(`❌ Webhook failed for job ${jobId}:`, response.status, response.statusText);
    }
  } catch (error) {
    console.error(`❌ Webhook error for job ${jobId}:`, error.message);
  }
}

// Update job status
function updateJobStatus(jobId, status, data = {}) {
  const job = jobs.get(jobId);
  if (job) {
    job.status = status;
    job.updatedAt = new Date().toISOString();
    job.data = { ...job.data, ...data };
    jobs.set(jobId, job);
    
    console.log(`Job ${jobId} status updated to: ${status}`);
  }
}

// Background job processor
async function processFlutterGeneration(jobId, prompt, userId, webhookUrl) {
  const projectName = generateProjectName(prompt);
  const projectsRoot = path.join(__dirname, '../../flutter_projects');
  const projectPath = path.join(projectsRoot, projectName);
  const apkPath = path.join(projectPath, 'build', 'app', 'outputs', 'flutter-apk', 'app-release.apk');
  const zipPath = path.join(projectsRoot, `${projectName}_apk.zip`);

  try {
    // Update status: Starting
    updateJobStatus(jobId, 'starting', { 
      projectName,
      step: 'Initializing project'
    });

    // Ensure projects directory exists
    if (!fs.existsSync(projectsRoot)) {
      fs.mkdirSync(projectsRoot, { recursive: true });
    }

    // Step 1: Create Flutter project
    updateJobStatus(jobId, 'in_progress', { step: 'Creating Flutter project structure' });
    console.log(`Creating Flutter project: ${projectName}`);
    await runFlutterCommand(`flutter create ${projectName}`, projectsRoot);

    // Step 2: Generate code using Mistral
    updateJobStatus(jobId, 'in_progress', { step: 'Generating Flutter code with AI' });
    console.log('Generating Flutter code...');
    const llmResponse = await callLLM(prompt);
    const files = parseFilesFromLLMResponse(llmResponse);

    if (!Array.isArray(files) || files.length === 0) {
      throw new Error('No files generated from AI response');
    }

    // Step 3: Write generated files
    updateJobStatus(jobId, 'in_progress', { step: 'Writing generated files' });
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
    updateJobStatus(jobId, 'in_progress', { step: 'Validating Flutter project' });
    console.log('Validating Flutter project...');
    await validateFlutterProject(projectPath, jobId);

    // Step 5: Build APK
    updateJobStatus(jobId, 'in_progress', { step: 'Building APK (this may take a while)' });
    console.log('Building APK...');
    await runFlutterCommand('flutter build apk --release', projectPath);

    // Verify APK exists
    if (!fs.existsSync(apkPath)) {
      throw new Error('APK file not found after build');
    }

    // Step 6: Create ZIP of APK
    updateJobStatus(jobId, 'in_progress', { step: 'Packaging APK for download' });
    console.log('Creating APK ZIP...');
    await createApkZip(apkPath, zipPath);

    // Step 7: Create GitHub repository and push code
    updateJobStatus(jobId, 'in_progress', { step: 'Creating GitHub repository' });
    console.log('Creating GitHub repository...');
    const repoInfo = await createGitHubRepo(projectName, projectPath, prompt);

    // Step 8: Job completed successfully
    const completedData = {
      userId: userId,
      projectName: projectName,
      apkDownloadUrl: `/generate/download/${projectName}_apk.zip`,
      githubRepo: repoInfo.repoUrl,
      timestamp: new Date().toISOString()
    };

    updateJobStatus(jobId, 'completed', completedData);

    // Send success webhook
    if (webhookUrl) {
      await sendWebhook(webhookUrl, jobId, {
        status: 'success',
        message: 'Flutter project generated successfully!',
        data: completedData
      });
    }

    // Step 9: Schedule cleanup (5 minutes after completion)
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
    console.error('Error in processFlutterGeneration:', error);
    
    // Cleanup on error
    if (fs.existsSync(projectPath)) {
      await cleanupProject(projectPath);
    }
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }

    // Update job status to failed
    updateJobStatus(jobId, 'failed', {
      error: error.message,
      timestamp: new Date().toISOString()
    });

    // Send failure webhook
    if (webhookUrl) {
      await sendWebhook(webhookUrl, jobId, {
        status: 'error',
        message: 'Flutter project generation failed',
        error: error.message,
        userId: userId
      });
    }
  }
}

// Main controller function (async endpoint)
exports.generateFlutterProjectAsync = async (req, res) => {
  const { prompt, userId, webhookUrl } = req.body;
  
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

  const jobId = generateJobId();

  // Create job record
  jobs.set(jobId, {
    id: jobId,
    userId,
    prompt,
    webhookUrl: webhookUrl || null,
    status: 'queued',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    data: {}
  });

  // Start background processing (don't wait for it)
  processFlutterGeneration(jobId, prompt, userId, webhookUrl).catch(console.error);

  // Return immediate response with job ID
  res.json({
    success: true,
    message: 'Flutter project generation started',
    jobId: jobId,
    statusUrl: `/generate/status/${jobId}`,
    estimatedTime: '2-3 minutes',
    webhookConfigured: !!webhookUrl,
    timestamp: new Date().toISOString()
  });
};

// Get job status endpoint
exports.getJobStatus = (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      error: 'Job not found',
      jobId
    });
  }

  res.json({
    success: true,
    job: {
      id: job.id,
      userId: job.userId,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      data: job.data
    }
  });
};

// List all jobs (for debugging)
exports.listJobs = (req, res) => {
  const allJobs = Array.from(jobs.values()).map(job => ({
    id: job.id,
    userId: job.userId,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt
  }));

  res.json({
    success: true,
    jobs: allJobs,
    total: allJobs.length
  });
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
    missingConfiguration: missingVars,
    activeJobs: jobs.size
  });
};
