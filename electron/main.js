const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { spawn, execSync } = require('child_process');
const http = require('http');

let mainWindow;
let gameProcess = null;
let currentGameProject = null;
let currentGamePlatform = null;
let currentGameDeviceId = null;
let metroReloadInFlight = false;
let lastDevClientUrl = null;
const isDev = !app.isPackaged;
const shouldClearCache = process.argv.includes('--clear-cache');

// Disable GPU acceleration to prevent Windows GPU process crashes reported in Electron
app.disableHardwareAcceleration();
function androidSoftReload(deviceId) {
  return new Promise((resolve) => {
    try {
      const target = deviceId ? `-s ${deviceId}` : '';
      execSync(`adb ${target} shell input keyevent 82`, { stdio: 'ignore' });
      setTimeout(() => {
        try {
          execSync(`adb ${target} shell input text rr`, { stdio: 'ignore' });
          console.log('📲 Triggered Android reload via ADB (rr)');
          resolve(true);
        } catch (error) {
          console.error('Failed to send rr via ADB:', error.message);
          resolve(false);
        }
      }, 150);
    } catch (error) {
      console.error('Failed to open dev menu via ADB:', error.message);
      resolve(false);
    }
  });
}

function androidLaunchDevClient(deviceId, devClientUrl) {
  return new Promise((resolve) => {
    if (!devClientUrl) {
      resolve(false);
      return;
    }
    try {
      const target = deviceId ? `-s ${deviceId}` : '';
      const decoded = decodeURIComponent(devClientUrl);
      execSync(
        `adb ${target} shell am start -a android.intent.action.VIEW -d "${decoded}"`,
        { stdio: 'ignore' }
      );
      console.log('📲 Relaunched Dev Client via intent');
      resolve(true);
    } catch (error) {
      console.error('Failed to relaunch dev client via intent:', error.message);
      resolve(false);
    }
  });
}


function getMetroPort(projectRoot) {
  try {
    if (!projectRoot) return 8081;
    const packagerInfo = path.join(projectRoot, 'packager-info.json');
    if (fs.existsSync(packagerInfo)) {
      const info = fs.readJsonSync(packagerInfo);
      if (info.packagerPort) return info.packagerPort;
    }

    const expoInfo = path.join(projectRoot, '.expo', 'packager-info.json');
    if (fs.existsSync(expoInfo)) {
      const info = fs.readJsonSync(expoInfo);
      if (info.packagerPort) return info.packagerPort;
    }
  } catch (error) {
    console.log('Failed to read packager info:', error.message);
  }
  return 8081;
}

async function triggerMetroReloadViaHttp(projectRoot) {
  if (metroReloadInFlight) {
    return false;
  }
  metroReloadInFlight = true;

  const detectedPort = getMetroPort(projectRoot);
  const ports = [detectedPort, 8081, 8082].filter(
    (value, index, self) => typeof value === 'number' && !Number.isNaN(value) && self.indexOf(value) === index
  );
  const paths = ['/reload', '/refresh', '/restart', '/_expo/refresh', '/_expo/reload'];

  const tryRequest = (port, path) =>
    new Promise((resolve) => {
      const requestOptions = {
        hostname: '127.0.0.1',
        port,
        path,
        method: 'POST',
        timeout: 1500,
      };

      if (!path.startsWith('/_expo/')) {
        requestOptions.headers = {
          'Content-Type': 'application/json',
        };
      }

      const req = http.request(requestOptions, (res) => {
        res.resume();
        res.on('end', () => {
          const ok = res.statusCode && res.statusCode >= 200 && res.statusCode < 400;
          resolve(ok);
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.on('error', () => resolve(false));
      if (path.startsWith('/_expo/')) {
        req.end();
      } else {
        const body = JSON.stringify({ platform: (currentGamePlatform || 'android') });
        req.write(body);
        req.end();
      }
    });

  let succeeded = false;
  try {
    for (const port of ports) {
      if (succeeded) break;
      for (const path of paths) {
        const ok = await tryRequest(port, path);
        if (ok) {
          console.log(`🔄 Triggered Metro reload via HTTP ${path} on port ${port}`);
          succeeded = true;
          break;
        }
      }
    }
    return succeeded;
  } finally {
    metroReloadInFlight = false;
  }
}

function killPort(port) {
  return new Promise((resolve) => {
    try {
      console.log(`🧹 Checking for processes on port ${port}...`);
      if (mainWindow) {
        mainWindow.webContents.send('game-output', `🧹 Clearing port ${port}...`);
      }

      if (process.platform === 'win32') {
        try {
          const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
          const lines = result.split('\n');
          const pids = new Set();

          for (const line of lines) {
            const match = line.match(/LISTENING\s+(\d+)/);
            if (match) {
              pids.add(match[1]);
            }
          }

          for (const pid of pids) {
            try {
              execSync(`taskkill /F /PID ${pid}`, { encoding: 'utf8' });
              console.log(`✅ Killed process ${pid} on port ${port}`);
            } catch (error) {
              // Process might have already exited
            }
          }

          if (pids.size === 0) {
            console.log(`✅ Port ${port} is free`);
          }
        } catch (error) {
          console.log(`✅ Port ${port} is free`);
        }
      } else {
        try {
          const result = execSync(`lsof -ti :${port}`, { encoding: 'utf8' });
          const pids = result.trim().split('\n');
          for (const pid of pids) {
            if (pid) {
              execSync(`kill -9 ${pid}`);
              console.log(`✅ Killed process ${pid} on port ${port}`);
            }
          }

          if (!pids.filter(Boolean).length) {
            console.log(`✅ Port ${port} is free`);
          }
        } catch (error) {
          console.log(`✅ Port ${port} is free`);
        }
      }
    } catch (error) {
      console.error(`Error while clearing port ${port}:`, error);
    } finally {
      resolve();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    frame: true,
    show: false
  });

  // Load the app
  if (isDev) {
    // In dev we still refresh the session cache to avoid stale content.
    mainWindow.webContents.session.clearCache();
    mainWindow.webContents.session.clearStorageData();

    // Add a small delay to ensure Vite is ready
    setTimeout(() => {
      mainWindow.loadURL('http://localhost:5173');
      mainWindow.webContents.openDevTools();
    }, 500);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  if (shouldClearCache) {
    try {
      console.log('🧹 Clearing Electron session cache before launch...');
      await session.defaultSession.clearCache();
      await session.defaultSession.clearStorageData();
      const userDataPath = app.getPath('userData');
      // Do not delete entire userData to preserve settings, but log location for manual cleanup.
      console.log(`🗂️ Electron userData path: ${userDataPath}`);
    } catch (error) {
      console.error('Failed to clear Electron cache:', error);
    }
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for File System Operations

// Get default projects directory
ipcMain.handle('get-default-path', async () => {
  let documentsPath = app.getPath('documents');
  
  // Avoid OneDrive paths - use local Documents folder instead
  if (documentsPath.includes('OneDrive')) {
    const os = require('os');
    const username = os.userInfo().username;
    documentsPath = path.join('C:', 'Users', username, 'Documents');
  }
  
  const defaultPath = path.join(documentsPath, 'RegameProjects');
  
  // Create the directory if it doesn't exist
  try {
    await fs.ensureDir(defaultPath);
  } catch (error) {
    console.error('Failed to create default directory:', error);
  }
  
  return defaultPath;
});

// Browse for folder
ipcMain.handle('browse-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Project Location'
  });

  if (result.canceled) {
    return null;
  }

  return result.filePaths[0];
});

// Check if path exists
ipcMain.handle('check-path', async (event, checkPath) => {
  try {
    const exists = await fs.pathExists(checkPath);
    return { success: true, exists };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Create project from template (SIMPLE COPY!)
ipcMain.handle('create-project', async (event, projectPath, projectName) => {
  const fullPath = path.join(projectPath, projectName);
  const expoTemplatePath = path.join(__dirname, '../expo-template');

  try {
    // Check if directory already exists
    const exists = await fs.pathExists(fullPath);
    if (exists) {
      return { 
        success: false, 
        message: 'A project with this name already exists at this location' 
      };
    }

    console.log(`📦 Creating project: ${projectName}`);
    mainWindow.webContents.send('game-output', `📦 Creating project from template...`);
    mainWindow.webContents.send('game-output', `📁 Copying template files...`);

    // Simply copy the entire template folder!
    const templateExists = await fs.pathExists(expoTemplatePath);
    if (!templateExists) {
      throw new Error('Template folder not found! Make sure expo-template exists in the editor directory.');
    }

    // Copy the entire template to the new project location
    await fs.copy(expoTemplatePath, fullPath, { 
      overwrite: false,
      errorOnExist: false,
      filter: (src) => {
        // Don't copy node_modules, native folders, build artifacts, or cache
        // Use path separator to avoid matching filenames like "android-icon.png"
        const shouldSkip = src.includes('node_modules') || 
                          src.includes('.expo') || 
                          src.includes(path.sep + 'android' + path.sep) ||  // Skip android/ folder only
                          src.includes(path.sep + 'ios' + path.sep) ||      // Skip ios/ folder only
                          src.endsWith(path.sep + 'android') ||              // Skip android at end of path
                          src.endsWith(path.sep + 'ios') ||                  // Skip ios at end of path
                          src.includes('.gradle') ||
                          src.includes('package-lock.json');
        return !shouldSkip;
      }
    });

    console.log(`✅ Template copied successfully`);
    mainWindow.webContents.send('game-output', `✅ Template copied!`);
    mainWindow.webContents.send('game-output', `📱 Skipped android/ios folders - Expo will generate them fresh when you run the game`);
    mainWindow.webContents.send('game-output', `📦 Installing dependencies...`);

    // Install dependencies in the new project (fresh node_modules with correct paths!)
    const npmInstall = spawn('npm', ['install'], {
      cwd: fullPath,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    await new Promise((resolve, reject) => {
      npmInstall.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          console.log(output);
          mainWindow.webContents.send('game-output', output);
        }
      });

      npmInstall.stderr.on('data', (data) => {
        const output = data.toString().trim();
        if (output && !output.includes('npm WARN')) {
          console.log(output);
        }
      });

      npmInstall.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Dependencies installed`);
          mainWindow.webContents.send('game-output', `✅ Dependencies installed!`);
          resolve();
        } else {
          console.error(`❌ npm install failed with code ${code}`);
          mainWindow.webContents.send('game-output', `⚠️ npm install failed, but continuing...`);
          resolve(); // Continue anyway
        }
      });

      npmInstall.on('error', (error) => {
        console.error(`❌ npm install error:`, error);
        resolve(); // Continue anyway
      });
    });

    // Ensure scenes directory exists
    await fs.ensureDir(path.join(fullPath, 'scenes'));
    
    // Always create/overwrite MainScene.json for the editor
    const editorScene = {
      name: 'MainScene',
      width: 800,
      height: 600,
      backgroundColor: '#2a2a2a',
      objects: []
    };
    
    const sceneFilePath = path.join(fullPath, 'scenes', 'MainScene.json');
    await fs.writeJson(sceneFilePath, editorScene, { spaces: 2 });

    console.log(`✅ Created MainScene.json at: ${sceneFilePath}`);
    mainWindow.webContents.send('game-output', `✅ Created MainScene.json`);

    return { 
      success: true, 
      message: `Project "${projectName}" created successfully!`,
      path: fullPath
    };
  } catch (error) {
    return { 
      success: false, 
      message: `Failed to create project: ${error.message}` 
    };
  }
});

// Helper function to create basic project structure
async function createBasicProjectStructure(projectPath, projectName) {
  // Create basic folders
  await fs.ensureDir(path.join(projectPath, 'assets'));
  await fs.ensureDir(path.join(projectPath, 'scenes'));
  await fs.ensureDir(path.join(projectPath, 'scripts'));

  // Create project config
  const config = {
    name: projectName,
    version: '1.0.0',
    engine: 'ReGame Engine',
    defaultScene: 'MainScene',
    resolution: { width: 800, height: 600 }
  };

  await fs.writeJson(
    path.join(projectPath, 'project.json'), 
    config, 
    { spaces: 2 }
  );

  // Create default blank scene
  const defaultScene = {
    name: 'MainScene',
    width: 800,
    height: 600,
    backgroundColor: '#2a2a2a',
    objects: [] // Start with empty scene
  };

  await fs.writeJson(
    path.join(projectPath, 'scenes', 'MainScene.json'),
    defaultScene,
    { spaces: 2 }
  );

  // Create README
  const readme = `# ${projectName}

Created with ReGame Engine

## Getting Started

Open this project in ReGame Editor to start building your game!

## Project Structure

- \`assets/\` - Game assets (images, sounds, etc.)
- \`scenes/\` - Game scenes
- \`scripts/\` - Game scripts
- \`project.json\` - Project configuration
`;

  await fs.writeFile(path.join(projectPath, 'README.md'), readme);
}

// List directory contents
ipcMain.handle('list-directory', async (event, dirPath) => {
  try {
    const contents = await fs.readdir(dirPath);
    return { success: true, contents };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Save project file
ipcMain.handle('save-file', async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Read project file
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return { success: true, content };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// List scene files in project
ipcMain.handle('list-scenes', async (event, projectPath) => {
  try {
    const scenesDir = path.join(projectPath, 'scenes');
    const files = await fs.readdir(scenesDir);
    const sceneFiles = files.filter(f => f.endsWith('.json'));
    const sceneNames = sceneFiles.map(f => f.replace('.json', ''));
    return { success: true, scenes: sceneNames };
  } catch (error) {
    return { success: false, message: error.message, scenes: ['MainScene'] };
  }
});

// Install dependencies
ipcMain.handle('install-dependencies', async (event, projectPath) => {
  try {
    console.log(`📦 Installing dependencies in ${projectPath}`);

    return new Promise((resolve) => {
      const installProcess = spawn('npm', ['install'], {
        cwd: projectPath,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      installProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          mainWindow.webContents.send('game-output', output);
        }
      });

      installProcess.stderr.on('data', (data) => {
        const output = data.toString().trim();
        if (output && !output.includes('npm WARN')) {
          mainWindow.webContents.send('game-output', `⚠️ ${output}`);
        }
      });

      installProcess.on('close', (code) => {
        if (code === 0) {
          mainWindow.webContents.send('game-output', '✅ Dependencies installed successfully!');
          resolve({ success: true });
        } else {
          resolve({ success: false, message: `npm install failed with code ${code}` });
        }
      });

      installProcess.on('error', (error) => {
        resolve({ success: false, message: error.message });
      });
    });
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Start Android emulator
ipcMain.handle('start-emulator', async (event, emulatorName) => {
  try {
    console.log(`🚀 Starting emulator: ${emulatorName}`);
    
    // Find Android SDK path
    const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
    if (!androidHome) {
      return { success: false, message: 'ANDROID_HOME not set. Please set Android SDK path in environment variables.' };
    }
    
    const emulatorPath = path.join(androidHome, 'emulator', 'emulator.exe');
    
    // Start emulator in background (don't wait for it to finish)
    spawn(emulatorPath, ['-avd', emulatorName], {
      detached: true,
      stdio: 'ignore'
    }).unref();
    
    return { success: true };
  } catch (error) {
    console.error('Failed to start emulator:', error);
    return { success: false, message: error.message };
  }
});

// Get available devices for platform
ipcMain.handle('get-devices', async (event, platform) => {
  try {
    let devices = [];
    
    if (platform === 'android') {
      // Use adb to list Android devices
      try {
        const result = execSync('adb devices -l', { encoding: 'utf8' });
        const lines = result.split('\n').slice(1); // Skip header
        
        lines.forEach(line => {
          if (line.trim() && !line.includes('List of devices')) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2 && parts[1] === 'device') {
              const id = parts[0];
              const modelMatch = line.match(/model:([^\s]+)/);
              const model = modelMatch ? modelMatch[1] : 'Unknown';
              devices.push({ id, name: model, platform: 'android' });
            }
          }
        });
        
        // If no devices found, try to list available emulators
        if (devices.length === 0) {
          try {
            const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
            if (androidHome) {
              const emulatorPath = path.join(androidHome, 'emulator', 'emulator.exe');
              const emulatorsResult = execSync(`"${emulatorPath}" -list-avds`, { encoding: 'utf8' });
              const emulators = emulatorsResult.trim().split('\n').filter(e => e.trim());
              
              if (emulators.length > 0) {
                // Return emulators with a special flag
                emulators.forEach(emu => {
                  devices.push({ 
                    id: emu.trim(), 
                    name: `${emu.trim()} (Not Running)`, 
                    platform: 'android',
                    isEmulator: true,
                    needsStart: true
                  });
                });
              }
            }
          } catch (emuError) {
            console.log('No emulators found or emulator command not available:', emuError.message);
          }
        }
      } catch (error) {
        console.error('Failed to get Android devices:', error);
        return { success: false, message: 'ADB not found. Make sure Android SDK is installed.' };
      }
    } else if (platform === 'ios') {
      // Use xcrun simctl to list iOS simulators (macOS only)
      if (process.platform !== 'darwin') {
        return { success: false, message: 'iOS simulators are only available on macOS' };
      }
      
      try {
        const result = execSync('xcrun simctl list devices available', { encoding: 'utf8' });
        const lines = result.split('\n');
        
        lines.forEach(line => {
          const match = line.match(/\s+(.+?)\s+\(([A-F0-9-]+)\)\s+\(Booted\)/);
          if (match) {
            devices.push({ id: match[2], name: match[1], platform: 'ios', status: 'Booted' });
          }
        });
      } catch (error) {
        console.error('Failed to get iOS devices:', error);
        return { success: false, message: 'Failed to list iOS simulators' };
      }
    }
    
    return { success: true, devices };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Run game on selected platform and device
ipcMain.handle('run-game', async (event, projectPath, platform, deviceId = null, options = {}) => {
  try {
    // Kill existing process if any
    if (gameProcess) {
      gameProcess.kill();
      gameProcess = null;
      currentGameProject = null;
      currentGamePlatform = null;
      currentGameDeviceId = null;
      lastDevClientUrl = null;
    }

    const runMode = options.mode === 'soft' ? 'soft' : 'dev-build';
    const isSoftStart = runMode === 'soft';
    const command = platform === 'android' ? 'run:android' : 'run:ios';
    const commandArgs = isSoftStart
      ? (() => {
          const args = ['expo', 'start', '--dev-client', '--clear'];
          if (platform === 'android') {
            args.push('--android');
          } else if (platform === 'ios' && process.platform === 'darwin') {
            args.push('--ios');
          }
          return args;
        })()
      : ['expo', command];

    await killPort(8081);
    await killPort(8082);

    console.log(`🎮 Starting ${isSoftStart ? 'Expo Dev Client (soft start)' : 'Expo Dev Build'} on ${platform} in ${projectPath}`);
    if (mainWindow) {
      mainWindow.webContents.send('game-output', `🎮 Starting: npx ${commandArgs.join(' ')}`);
      mainWindow.webContents.send('game-output', isSoftStart
        ? `⏳ Starting Metro in dev-client mode...`
        : `⏳ Building and installing app on ${platform}...`);
      if (!isSoftStart) {
        mainWindow.webContents.send('game-output', `💡 First build may take a few minutes`);
      } else {
        mainWindow.webContents.send('game-output', `💡 Dev client must already be installed on your device`);
      }
    }

    let metroStarted = false;
    let appInstalled = false;
    let devClientLaunchSent = false;
    
    // Spawn the process
    gameProcess = spawn('npx', commandArgs, {
      cwd: projectPath,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],  // Pipe stdin for reload command, pipe stdout/stderr
      env: {
        ...process.env,
        NODE_ENV: 'development',
        FORCE_COLOR: '0',  // Disable colored output that might cause issues
        // Set ANDROID_SERIAL to target specific device if provided
        ...(deviceId && platform === 'android' ? { ANDROID_SERIAL: deviceId } : {}),
        ...(options.env || {})
      }
    });

    console.log('✅ Expo process spawned with PID:', gameProcess.pid);
    currentGameProject = projectPath;
    currentGamePlatform = platform;
    currentGameDeviceId = deviceId || null;
    lastDevClientUrl = null;
    if (mainWindow) {
      mainWindow.webContents.send('game-output', `✅ Process started (PID: ${gameProcess.pid})`);
    }

    // Send output to renderer
    gameProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('[EXPO STDOUT]:', output);

      if (output.includes('regametemplate://expo-development-client')) {
        const match = output.match(/regametemplate:\/\/[^\s]+/);
        if (match) {
          lastDevClientUrl = match[0];
          console.log('🔗 Stored dev client URL for relaunch');
        }
      }
      
      // Detect when app is installed (only for dev-build mode)
      if (!isSoftStart && !appInstalled && (output.includes('Successfully installed') || 
                            output.includes('BUILD SUCCESSFUL') ||
                            output.includes('Installed the app'))) {
        appInstalled = true;
        console.log('✅ App installed on device!');
        if (mainWindow) {
          mainWindow.webContents.send('game-output', `✅ App installed successfully!`);
        }
      }
      
      // Detect when Metro actually starts
      if (!metroStarted && (output.includes('Metro') || 
                             output.includes('Bundler') ||
                             output.includes('server running') ||
                             output.includes('Waiting on'))) {
        metroStarted = true;
        console.log('✅ Metro bundler has started!');
        if (mainWindow) {
          mainWindow.webContents.send('game-output', `✅ Metro is running - you can now edit and reload!`);
          if (isSoftStart) {
            mainWindow.webContents.send('game-output', `📱 Launching dev client...`);
          }
          mainWindow.webContents.send('metro-ready');
        }

        if (isSoftStart && platform === 'android' && !devClientLaunchSent && gameProcess.stdin && !gameProcess.stdin.destroyed) {
          devClientLaunchSent = true;
          const launchCommand = 'a\n';
          const wrote = gameProcess.stdin.write(launchCommand);
          if (!wrote) {
            gameProcess.stdin.once('drain', () => {
              if (gameProcess && gameProcess.stdin && !gameProcess.stdin.destroyed) {
                gameProcess.stdin.write(launchCommand);
              }
            });
          }
          console.log('📲 Triggered Android dev client launch via Expo CLI');
          if (mainWindow) {
            mainWindow.webContents.send('game-output', `📲 Opening dev client on Android device...`);
          }
        }
      }
      
      if (output.trim()) {
        // Split by lines and send each line
        if (mainWindow) {
          output.split('\n').forEach(line => {
            if (line.trim()) {
              mainWindow.webContents.send('game-output', line.trim());
            }
          });
        }
      }
    });

    gameProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.log('[EXPO STDERR]:', output);
      if (output.trim() && mainWindow) {
        // Split by lines and send each line
        output.split('\n').forEach(line => {
          if (line.trim()) {
            mainWindow.webContents.send('game-output', line.trim());
          }
        });
      }
    });
    
    gameProcess.on('close', (code) => {
      console.log(`Expo process exited with code ${code}`);
      if (mainWindow) {
        mainWindow.webContents.send('game-output', `🏁 Expo server stopped (code ${code})`);
        mainWindow.webContents.send('game-exit', code);
      }
      gameProcess = null;
      currentGameProject = null;
      currentGamePlatform = null;
      currentGameDeviceId = null;
      lastDevClientUrl = null;
    });

    gameProcess.on('error', (error) => {
      console.error('❌ Failed to start Expo:', error);
      if (mainWindow) {
        mainWindow.webContents.send('game-output', `❌ Failed to start Expo: ${error.message}`);
        mainWindow.webContents.send('game-output', `💡 Command: npx ${commandArgs.join(' ')}`);
        mainWindow.webContents.send('game-output', `📁 Working directory: ${projectPath}`);
        mainWindow.webContents.send('game-exit', 1);
      }
      gameProcess = null;
      currentGameProject = null;
      currentGamePlatform = null;
      currentGameDeviceId = null;
      lastDevClientUrl = null;
    });

    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Stop running game
ipcMain.handle('stop-game', async () => {
  try {
    // Kill the game process
    if (gameProcess) {
      gameProcess.kill();
      gameProcess = null;
      currentGameProject = null;
      currentGamePlatform = null;
      currentGameDeviceId = null;
      lastDevClientUrl = null;
    }
    
    // Also kill Metro on port 8081 (Expo Go) to fully stop the game
    console.log('🛑 Stopping Expo and killing Metro on port 8081...');
    try {
      if (process.platform === 'win32') {
        const result = execSync('netstat -ano | findstr :8081', { encoding: 'utf8' });
        const lines = result.split('\n');
        const pids = new Set();
        
        for (const line of lines) {
          const match = line.match(/LISTENING\s+(\d+)/);
          if (match) {
            pids.add(match[1]);
          }
        }
        
        for (const pid of pids) {
          try {
            execSync(`taskkill /F /PID ${pid}`, { encoding: 'utf8' });
            console.log(`✅ Killed Metro process ${pid}`);
          } catch (e) {
            // Process might have already exited
          }
        }
      } else {
        // macOS/Linux
        try {
          const result = execSync('lsof -ti :8081', { encoding: 'utf8' });
          const pids = result.trim().split('\n');
          for (const pid of pids) {
            if (pid) {
              execSync(`kill -9 ${pid}`);
              console.log(`✅ Killed Metro process ${pid}`);
            }
          }
        } catch (e) {
          // No process on port
        }
      }
    } catch (portError) {
      console.error('Error killing Metro:', portError);
    }
    
    mainWindow.webContents.send('game-output', `⏹️ Game stopped`);
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('get-game-status', async () => {
  return {
    running: !!gameProcess,
    projectPath: currentGameProject,
    platform: currentGamePlatform,
  };
});

// Reload running game (send 'r' command to Metro)
ipcMain.handle('reload-game', async () => {
  try {
    let triggered = false;

    if (gameProcess && gameProcess.stdin && !gameProcess.stdin.destroyed) {
      const reloadCommand = 'r\n';
      const wrote = gameProcess.stdin.write(reloadCommand);
      if (!wrote) {
        await new Promise((resolve) => {
          gameProcess.stdin.once('drain', resolve);
        });
      }
      console.log('🔄 Sent reload command (r) via stdin to Metro');
      triggered = true;
    }

    const httpTriggered = await triggerMetroReloadViaHttp(currentGameProject);
    if (httpTriggered) {
      triggered = true;
    }

    if (!triggered && currentGamePlatform === 'android') {
      const intentTriggered = await androidLaunchDevClient(currentGameDeviceId, lastDevClientUrl);
      if (intentTriggered) {
        triggered = true;
        if (mainWindow) {
          mainWindow.webContents.send('game-output', '📲 Reloading via dev client intent');
        }
      }
    }

    if (!triggered && currentGamePlatform === 'android') {
      const adbTriggered = await androidSoftReload(currentGameDeviceId);
      if (adbTriggered) {
        triggered = true;
        if (mainWindow) {
          mainWindow.webContents.send('game-output', '📲 Reloading via ADB (rr)');
        }
      }
    }

    if (triggered) {
      if (mainWindow) {
        mainWindow.webContents.send('game-output', '🔄 Reloading app...');
      }
      return { success: true };
    }

    console.log('⚠️ Reload command not delivered to Metro');
    if (mainWindow) {
      mainWindow.webContents.send('game-output', '⚠️ Reload failed - press "r" in terminal or shake device');
    }
    return { success: false, message: 'Unable to reach Metro process for reload.' };
  } catch (error) {
    console.error('Failed to reload game:', error);
    return { success: false, message: error.message };
  }
});

// Toggle fullscreen for the editor window
ipcMain.handle('toggle-fullscreen', async () => {
  try {
    if (mainWindow) {
      const next = !mainWindow.isFullScreen();
      mainWindow.setFullScreen(next);
      return { success: true, fullScreen: next };
    }
    return { success: false, message: 'No window' };
  } catch (error) {
    return { success: false, message: error.message };
  }
});
