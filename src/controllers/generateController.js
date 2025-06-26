const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

// Remove code fences from file content
function cleanContent(content) {
  // Remove lines starting with ``` or ```yaml
  return content.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '');
}

// Parse files from delimiter-based LLM response
function parseFilesFromLLMResponse(response) {
  // Split on === <file path> ===\n
  // The regex splits and captures the file path as a group
  const fileBlocks = response.split(/===\s*(.+?)\s*===/g).slice(1);
  const files = [];
  for (let i = 0; i < fileBlocks.length; i += 2) {
    const path = fileBlocks[i].trim();
    const content = fileBlocks[i + 1] ? fileBlocks[i + 1].trim() : '';
    if (path && content) files.push({ path, content });
  }
  return files;
}

async function callLLM(prompt) {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'mistral-medium',
      messages: [
        {
          role: 'system',
          content: `You are an expert Flutter developer and UI/UX designer. Given a user prompt, generate a complete, production-quality Flutter app. Always ensure the UI is professional, visually appealing, and highly responsive, even if the user does not specify styling or layout details. Use best practices for layout, theming, and responsiveness. Respond ONLY with the following format (no JSON, no markdown, no extra text):\n\n=== lib/main.dart ===\n<contents of main.dart>\n=== lib/screens/home.dart ===\n<contents of home.dart>\n=== pubspec.yaml ===\n<contents of pubspec.yaml>\n...`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4096,
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mistral API error: ${error}`);
  }

  const data = await response.json();
  // The generated code will be in data.choices[0].message.content
  return data.choices[0].message.content;
}

exports.generateFlutterProject = async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const timestamp = Date.now();
  const projectName = `flutter_project_${timestamp}`;
  const projectsRoot = path.join(__dirname, '../../flutter_projects');
  const projectPath = path.join(projectsRoot, projectName);

  if (!fs.existsSync(projectsRoot)) fs.mkdirSync(projectsRoot, { recursive: true });

  exec(`flutter create ${projectName}`, { cwd: projectsRoot }, async (err) => {
    if (err) return res.status(500).json({ error: 'Failed to create Flutter project' });

    let files;
    try {
      const llmResponse = await callLLM(prompt);
      files = parseFilesFromLLMResponse(llmResponse);
      if (!Array.isArray(files) || files.length === 0) throw new Error('No files found in LLM response');
    } catch (e) {
      return res.status(500).json({ error: 'Failed to generate code from Mistral', details: e.message });
    }

    // Write all files, cleaning code fences
    try {
      for (const file of files) {
        const filePath = path.join(projectPath, file.path);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, cleanContent(file.content));
      }
    } catch (e) {
      return res.status(500).json({ error: 'Failed to write files', details: e.message });
    }

    // Run pub get and build
    exec('flutter pub get', { cwd: projectPath }, (err2) => {
      if (err2) return res.status(500).json({ error: 'Failed to run flutter pub get' });

      exec('flutter build apk', { cwd: projectPath }, (err3) => {
        if (err3) return res.status(500).json({ error: 'Failed to build APK' });

        res.json({
          message: 'Flutter project generated and built successfully!',
          project: projectName,
          apkPath: path.join(projectPath, 'build', 'app', 'outputs', 'apk', 'release', 'app-release.apk')
        });

        // Schedule deletion of the project after 30 minutes
        setTimeout(() => {
          fs.rm(projectPath, { recursive: true, force: true }, (err) => {
            if (err) {
              console.error(`Failed to delete project ${projectPath}:`, err);
            } else {
              console.log(`Deleted project ${projectPath} after 30 minutes.`);
            }
          });
        }, 30 * 60 * 1000); // 30 minutes in milliseconds
      });
    });
  });
};
