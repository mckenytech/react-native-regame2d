// Local development server for ReGame Engine Editor
// This server handles file operations and terminal commands

const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

const PORT = 3001;

// Create a new project
app.post('/api/create-project', async (req, res) => {
  let { projectName, projectPath } = req.body;
  
  // Trim whitespace from inputs
  projectName = projectName?.trim();
  projectPath = projectPath?.trim();
  
  try {
    console.log(`Creating project: "${projectName}" at "${projectPath}"`);
    
    // Validate inputs
    if (!projectName || !projectPath) {
      return res.status(400).json({ 
        success: false, 
        error: 'Project name and path are required'
      });
    }
    
    // Ensure parent directory exists
    try {
      await fs.access(projectPath);
      console.log(`✅ Parent directory exists: ${projectPath}`);
    } catch (error) {
      console.error(`❌ Parent directory doesn't exist: ${projectPath}`);
      return res.status(400).json({ 
        success: false, 
        error: `Directory not found: ${projectPath}\n\nPlease create this directory first:\nmkdir "${projectPath}"`
      });
    }
    
    const fullPath = path.join(projectPath, projectName);
    console.log(`Full project path: ${fullPath}`);
    
    // Create project directory
    await fs.mkdir(fullPath, { recursive: true });
    console.log(`✅ Created directory: ${fullPath}`);
    
    // Copy all project files
    await createProjectFiles(fullPath, projectName);
    console.log(`✅ Copied all files to: ${fullPath}`);
    
    res.json({ 
      success: true, 
      path: fullPath,
      message: 'Project files created successfully'
    });
    
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Install dependencies
app.post('/api/install-dependencies', async (req, res) => {
  const { projectPath } = req.body;
  
  try {
    console.log(`Installing dependencies in: ${projectPath}`);
    
    // Set up SSE for real-time output
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    const npmInstall = exec('npm install', { 
      cwd: projectPath,
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    npmInstall.stdout.on('data', (data) => {
      res.write(`data: ${JSON.stringify({ type: 'output', message: data.toString() })}\n\n`);
    });
    
    npmInstall.stderr.on('data', (data) => {
      res.write(`data: ${JSON.stringify({ type: 'error', message: data.toString() })}\n\n`);
    });
    
    npmInstall.on('close', (code) => {
      if (code === 0) {
        res.write(`data: ${JSON.stringify({ type: 'complete', success: true })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ type: 'complete', success: false, code })}\n\n`);
      }
      res.end();
    });
    
  } catch (error) {
    console.error('Error installing dependencies:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
});

// Run project (start, android, ios, web)
app.post('/api/run-project', async (req, res) => {
  const { projectPath, platform } = req.body;
  
  try {
    const commands = {
      start: 'npm start',
      android: 'npm run android',
      ios: 'npm run ios',
      web: 'npm run web'
    };
    
    const command = commands[platform] || commands.start;
    
    console.log(`Running: ${command} in ${projectPath}`);
    
    // Set up SSE for real-time output
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    const process = exec(command, { 
      cwd: projectPath,
      maxBuffer: 10 * 1024 * 1024
    });
    
    res.write(`data: ${JSON.stringify({ type: 'started', command })}\n\n`);
    
    process.stdout.on('data', (data) => {
      res.write(`data: ${JSON.stringify({ type: 'output', message: data.toString() })}\n\n`);
    });
    
    process.stderr.on('data', (data) => {
      res.write(`data: ${JSON.stringify({ type: 'output', message: data.toString() })}\n\n`);
    });
    
    process.on('close', (code) => {
      res.write(`data: ${JSON.stringify({ type: 'complete', code })}\n\n`);
      res.end();
    });
    
  } catch (error) {
    console.error('Error running project:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
});

// Get engine files (for copying to new projects)
app.get('/api/engine-files', async (req, res) => {
  try {
    // Path to engine folder in the starter-template
    const enginePath = path.join(__dirname, '../starter-template/engine');
    const engineFiles = await readEngineFiles(enginePath);
    
    res.json({ 
      success: true, 
      files: engineFiles 
    });
    
  } catch (error) {
    console.error('Error reading engine files:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Save scene to App.js
app.post('/api/save-scene', async (req, res) => {
  const { projectPath, sceneCode } = req.body;
  
  try {
    console.log(`Saving scene to: ${projectPath}/App.js`);
    
    const appJsPath = path.join(projectPath, 'App.js');
    await fs.writeFile(appJsPath, sceneCode, 'utf8');
    
    res.json({ 
      success: true, 
      message: 'Scene saved successfully'
    });
    
  } catch (error) {
    console.error('Error saving scene:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Scan directory for game projects
app.post('/api/scan-projects', async (req, res) => {
  const { directoryPath } = req.body;
  
  try {
    console.log(`Scanning for projects in: ${directoryPath}`);
    
    // Check if directory exists
    try {
      await fs.access(directoryPath);
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        error: `Directory not found: ${directoryPath}`
      });
    }
    
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    const projects = [];
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projectPath = path.join(directoryPath, entry.name);
        
        // Check if it's a valid game project (has package.json and App.js)
        const hasPackageJson = await fileExists(path.join(projectPath, 'package.json'));
        const hasAppJs = await fileExists(path.join(projectPath, 'App.js'));
        const hasEngine = await fileExists(path.join(projectPath, 'engine', 'index.tsx'));
        
        if (hasPackageJson && hasAppJs) {
          // Read package.json to get project name
          let projectName = entry.name;
          try {
            const packageJson = JSON.parse(
              await fs.readFile(path.join(projectPath, 'package.json'), 'utf8')
            );
            projectName = packageJson.name || entry.name;
          } catch (e) {
            // Use directory name if can't read package.json
          }
          
          // Get last modified time
          const stats = await fs.stat(projectPath);
          
          projects.push({
            name: projectName,
            path: projectPath,
            hasEngine,
            lastModified: stats.mtime.toISOString(),
            size: entry.name
          });
        }
      }
    }
    
    // Sort by last modified (most recent first)
    projects.sort((a, b) => 
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );
    
    console.log(`Found ${projects.length} projects`);
    
    res.json({ 
      success: true, 
      projects
    });
    
  } catch (error) {
    console.error('Error scanning projects:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Helper: Create project files
async function createProjectFiles(projectPath, projectName) {
  // Copy entire starter-template to project
  const templateSource = path.join(__dirname, '../starter-template');
  await copyDirectory(templateSource, projectPath);
  console.log('✅ Copied starter template files');
  
  // Now customize the template files with project-specific values
  const projectSlug = projectName.toLowerCase().replace(/\s+/g, '');
  
  // Update package.json
  const packageJsonPath = path.join(projectPath, 'package.json');
  if (await fileExists(path.join(projectPath, 'package.template.json'))) {
    let packageContent = await fs.readFile(path.join(projectPath, 'package.template.json'), 'utf8');
    packageContent = packageContent.replace(/\{\{PROJECT_NAME\}\}/g, projectName.toLowerCase().replace(/\s+/g, '-'));
    await fs.writeFile(packageJsonPath, packageContent, 'utf8');
    await fs.unlink(path.join(projectPath, 'package.template.json'));
  } else {
    // Fallback to generated package.json
    await fs.writeFile(packageJsonPath, JSON.stringify(getPackageJson(projectName), null, 2), 'utf8');
  }
  
  // Update app.json
  const appJsonPath = path.join(projectPath, 'app.json');
  if (await fileExists(path.join(projectPath, 'app.template.json'))) {
    let appContent = await fs.readFile(path.join(projectPath, 'app.template.json'), 'utf8');
    appContent = appContent.replace(/\{\{PROJECT_NAME\}\}/g, projectName);
    appContent = appContent.replace(/\{\{PROJECT_SLUG\}\}/g, projectSlug);
    await fs.writeFile(appJsonPath, appContent, 'utf8');
    await fs.unlink(path.join(projectPath, 'app.template.json'));
  } else {
    // Fallback to generated app.json
    await fs.writeFile(appJsonPath, JSON.stringify(getAppJson(projectName), null, 2), 'utf8');
  }
  
  // Update README.md
  const readmePath = path.join(projectPath, 'README.md');
  if (await fileExists(path.join(projectPath, 'README.template.md'))) {
    let readmeContent = await fs.readFile(path.join(projectPath, 'README.template.md'), 'utf8');
    readmeContent = readmeContent.replace(/\{\{PROJECT_NAME\}\}/g, projectName);
    await fs.writeFile(readmePath, readmeContent, 'utf8');
    await fs.unlink(path.join(projectPath, 'README.template.md'));
  } else {
    // Fallback to generated README
    await fs.writeFile(readmePath, getReadmeTemplate(projectName), 'utf8');
  }
}

// Helper: Copy directory recursively
async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// Helper: Read engine files recursively
async function readEngineFiles(dirPath, basePath = '') {
  const files = {};
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.join(basePath, entry.name);
    
    if (entry.isDirectory()) {
      Object.assign(files, await readEngineFiles(fullPath, relativePath));
    } else {
      const content = await fs.readFile(fullPath, 'utf8');
      files[relativePath] = content;
    }
  }
  
  return files;
}

// Helper: Get project template
function getProjectTemplate(projectName) {
  return {
    'package.json': JSON.stringify({
      name: projectName.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      main: 'index.js',
      scripts: {
        start: 'expo start',
        android: 'expo start --android',
        ios: 'expo start --ios',
        web: 'expo start --web'
      },
      dependencies: {
        '@shopify/react-native-skia': '2.2.12',
        expo: '~54.0.20',
        'expo-status-bar': '~3.0.8',
        react: '19.1.0',
        'react-native': '0.81.5',
        'react-native-gesture-handler': '~2.28.0',
        'react-native-reanimated': '~4.1.1'
      },
      devDependencies: {
        'babel-preset-expo': '~54.0.0',
        '@types/react': '~19.1.10',
        'typescript': '~5.9.2'
      },
      private: true
    }, null, 2),
    
    'index.js': `import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
`,
    
    'App.js': getAppTemplate(),
    
    'app.json': JSON.stringify({
      expo: {
        name: projectName,
        slug: projectName.replace(/\s+/g, ''),
        version: '1.0.0',
        orientation: 'portrait',
        icon: './assets/icon.png',
        userInterfaceStyle: 'light',
        newArchEnabled: true,
        splash: {
          image: './assets/splash-icon.png',
          resizeMode: 'contain',
          backgroundColor: '#ffffff'
        },
        ios: {
          supportsTablet: true
        },
        android: {
          adaptiveIcon: {
            foregroundImage: './assets/adaptive-icon.png',
            backgroundColor: '#ffffff'
          },
          edgeToEdgeEnabled: true
        },
        web: {
          favicon: './assets/favicon.png'
        }
      }
    }, null, 2),
    
    'babel.config.js': `module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
`,

    'tsconfig.json': JSON.stringify({
      compilerOptions: {},
      extends: 'expo/tsconfig.base'
    }, null, 2),
    
    '.gitignore': `node_modules/
.expo/
dist/
npm-debug.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/
.env
`,
    
    'README.md': getReadmeTemplate(projectName)
  };
}

function getAppTemplate() {
  return `import { Game } from './engine';
import { MainScene } from './scenes/Main';

// Scene registry
const scenes = {
  main: MainScene,
  // Add more scenes here as you create them
};

export default function App() {
  return (
    <Game showGamePad>
      {(ctx) => {
        // Register all scenes
        Object.entries(scenes).forEach(([name, sceneFunc]) => {
          ctx.scene(name, sceneFunc);
        });

        // Start with main scene
        ctx.go('main');
      }}
    </Game>
  );
}
`;
}

function getMainSceneTemplate() {
  return `import { pos, rect, circle, body, area } from '../engine';

// Main scene - default starting scene
export function MainScene(ctx) {
  // Create player
  const player = ctx.add([
    pos(200, 200),
    rect(40, 40, '#6495ed'),
    area(),
    "player"
  ]);

  // Movement controls
  ctx.onKeyPress("up", () => {
    const transform = player.get('transform');
    transform.pos.y.value -= 5;
  });
  ctx.onKeyPress("down", () => {
    const transform = player.get('transform');
    transform.pos.y.value += 5;
  });
  ctx.onKeyPress("left", () => {
    const transform = player.get('transform');
    transform.pos.x.value -= 5;
  });
  ctx.onKeyPress("right", () => {
    const transform = player.get('transform');
    transform.pos.x.value += 5;
  });

  // Example: Create some enemies
  for (let i = 0; i < 3; i++) {
    ctx.add([
      pos(Math.random() * 400, Math.random() * 600),
      circle(20, '#ff6464'),
      area(),
      body({ 
        velocity: { 
          x: (Math.random() - 0.5) * 200, 
          y: (Math.random() - 0.5) * 200 
        } 
      }),
      "enemy"
    ]);
  }

  // Platform
  ctx.add([
    pos(200, 500),
    rect(300, 20, '#90ee90'),
    area(),
    body({ isStatic: true }),
    "platform"
  ]);

  // Collision handling
  player.onCollide("enemy", (enemy) => {
    console.log("Hit enemy!");
    ctx.destroy(enemy);
    // Example: Go to another scene
    // ctx.go('gameOver');
  });
}
`;
}

function getHelpersTemplate() {
  return `// Helper functions and utilities for your game

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

export function randomColor() {
  const colors = ['#ff6464', '#64ff64', '#6464ff', '#ffff64', '#ff64ff', '#64ffff'];
  return colors[Math.floor(Math.random() * colors.length)];
}
`;
}

function getPackageJson(projectName) {
  return {
    name: projectName.toLowerCase().replace(/\s+/g, '-'),
    version: '1.0.0',
    main: 'index.js',
    scripts: {
      start: 'expo start',
      android: 'expo start --android',
      ios: 'expo start --ios',
      web: 'expo start --web'
    },
    dependencies: {
      '@shopify/react-native-skia': '2.2.12',
      expo: '~54.0.20',
      'expo-status-bar': '~3.0.8',
      react: '19.1.0',
      'react-native': '0.81.5',
      'react-native-gesture-handler': '~2.28.0',
      'react-native-reanimated': '~4.1.1'
    },
    devDependencies: {
      'babel-preset-expo': '~54.0.0',
      '@types/react': '~19.1.10',
      'typescript': '~5.9.2'
    },
    private: true
  };
}

function getAppJson(projectName) {
  return {
    expo: {
      name: projectName,
      slug: projectName.toLowerCase().replace(/\s+/g, ''),
      version: '1.0.0',
      orientation: 'portrait',
      icon: './assets/icon.png',
      userInterfaceStyle: 'light',
      newArchEnabled: true,
      splash: {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff'
      },
      ios: {
        supportsTablet: true
      },
      android: {
        adaptiveIcon: {
          foregroundImage: './assets/adaptive-icon.png',
          backgroundColor: '#ffffff'
        },
        edgeToEdgeEnabled: true
      },
      web: {
        favicon: './assets/favicon.png'
      }
    }
  };
}

function getReadmeTemplate(projectName) {
  return `# ${projectName}

A game built with ReGame Engine

## Project Structure

\`\`\`
${projectName}/
├── App.js          # Main entry point
├── scenes/         # Game scenes
│   └── Main.js     # Main scene
├── scripts/        # Helper scripts
│   └── helpers.js  # Utility functions
├── assets/         # Images, sounds, etc.
└── engine/         # ReGame Engine
\`\`\`

## Setup

\`\`\`bash
npm install
npm start
\`\`\`

## Run

- **Android**: \`npm run android\`
- **iOS**: \`npm run ios\`
- **Web**: \`npm run web\`

## Creating Scenes

Create a new file in \`scenes/\` folder:

\`\`\`javascript
// scenes/Game.js
import { pos, rect } from '../engine';

export function GameScene(ctx) {
  // Your scene logic here
  const player = ctx.add([
    pos(100, 100),
    rect(50, 50, '#6495ed')
  ]);
  
  // Switch scenes
  ctx.go('anotherScene');
}
\`\`\`

Then register it in \`App.js\`:

\`\`\`javascript
import { GameScene } from './scenes/Game';

const scenes = {
  main: MainScene,
  game: GameScene,  // Add your scene
};
\`\`\`

## Controls

- **D-Pad**: Move player
- **A/B Buttons**: Actions

Happy gaming! 🎮
`;
}

app.listen(PORT, () => {
  console.log(`🚀 ReGame Engine Server running on http://localhost:${PORT}`);
  console.log(`   Web Editor: http://localhost:5173`);
  console.log(`   Ready to create projects!`);
});

