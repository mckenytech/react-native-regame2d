const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = 3000;

// Enable CORS for React Native app
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'File server is running' });
});

// Create directory
app.post('/create-directory', async (req, res) => {
  try {
    const { path: dirPath } = req.body;
    
    if (!dirPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    await fs.ensureDir(dirPath);
    res.json({ success: true, path: dirPath });
  } catch (error) {
    console.error('Error creating directory:', error);
    res.status(500).json({ error: error.message });
  }
});

// Copy starter template to project location
app.post('/create-project', async (req, res) => {
  try {
    const { projectPath, projectName } = req.body;
    
    if (!projectPath || !projectName) {
      return res.status(400).json({ error: 'Project path and name are required' });
    }

    const fullPath = path.join(projectPath, projectName);
    const templatePath = path.join(__dirname, '..', 'starter-template');

    // Check if template exists
    if (!await fs.pathExists(templatePath)) {
      return res.status(404).json({ error: 'Starter template not found' });
    }

    // Create project directory
    await fs.ensureDir(fullPath);

    // Copy starter template
    await fs.copy(templatePath, fullPath, {
      overwrite: false,
      errorOnExist: false
    });

    res.json({ 
      success: true, 
      path: fullPath,
      message: `Project "${projectName}" created successfully at ${fullPath}`
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check if path exists
app.post('/check-path', async (req, res) => {
  try {
    const { path: checkPath } = req.body;
    
    if (!checkPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    const exists = await fs.pathExists(checkPath);
    res.json({ exists, path: checkPath });
  } catch (error) {
    console.error('Error checking path:', error);
    res.status(500).json({ error: error.message });
  }
});

// List directory contents
app.post('/list-directory', async (req, res) => {
  try {
    const { path: dirPath } = req.body;
    
    if (!dirPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    const exists = await fs.pathExists(dirPath);
    if (!exists) {
      return res.status(404).json({ error: 'Directory not found' });
    }

    const items = await fs.readdir(dirPath);
    res.json({ items, path: dirPath });
  } catch (error) {
    console.error('Error listing directory:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ ReGame File Server running on http://localhost:${PORT}`);
  console.log(`📁 Ready to handle file operations for your editor!`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /health - Check server status`);
  console.log(`  POST /create-directory - Create a directory`);
  console.log(`  POST /create-project - Create project from template`);
  console.log(`  POST /check-path - Check if path exists`);
  console.log(`  POST /list-directory - List directory contents`);
});

