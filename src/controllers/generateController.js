const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

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
          content: `You are an expert Flutter developer. Given a user prompt, generate a complete Flutter app. Respond ONLY in valid JSON (no markdown, no code fences, no extra text) with a 'files' array, each with 'path' and 'content'. All file contents must be properly JSON-escaped. Example: { "files": [ { "path": "lib/main.dart", "content": "// ..." }, ... ] }.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2048,
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
      let jsonText = llmResponse;
      // Try to extract JSON if LLM added extra text
      if (!llmResponse.trim().startsWith('{')) {
        const match = llmResponse.match(/{[\s\S]*}/);
        if (match) {
          jsonText = match[0];
        } else {
          throw new Error('No JSON object found in LLM response');
        }
      }
      files = JSON.parse(jsonText).files;
      if (!Array.isArray(files)) throw new Error('No files array in LLM response');
    } catch (e) {
      return res.status(500).json({ error: 'Failed to generate code from Mistral', details: e.message });
    }

    // Write all files
    try {
      for (const file of files) {
        const filePath = path.join(projectPath, file.path);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, file.content);
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
