const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Get default documents path
  getDefaultPath: () => ipcRenderer.invoke('get-default-path'),
  
  // Browse for folder
  browseFolder: () => ipcRenderer.invoke('browse-folder'),
  
  // Check if path exists
  checkPath: (path) => ipcRenderer.invoke('check-path', path),
  
  // Create project
  createProject: (projectPath, projectName) => 
    ipcRenderer.invoke('create-project', projectPath, projectName),
  
  // List directory
  listDirectory: (path) => ipcRenderer.invoke('list-directory', path),
  createDirectory: (path) => ipcRenderer.invoke('create-directory', path),
  
  // File operations
  saveFile: (filePath, content) => ipcRenderer.invoke('save-file', filePath, content),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  readBinaryFile: (filePath) => ipcRenderer.invoke('read-binary-file', filePath),
  listScenes: (projectPath) => ipcRenderer.invoke('list-scenes', projectPath),
  saveSpriteAsset: (payload) => ipcRenderer.invoke('save-sprite-asset', payload),
  
  // Game running
  installDependencies: (projectPath) => ipcRenderer.invoke('install-dependencies', projectPath),
  getDevices: (platform) => ipcRenderer.invoke('get-devices', platform),
  startEmulator: (emulatorName) => ipcRenderer.invoke('start-emulator', emulatorName),
  runGame: (projectPath, platform, deviceId, options) => ipcRenderer.invoke('run-game', projectPath, platform, deviceId, options),
  stopGame: () => ipcRenderer.invoke('stop-game'),
  reloadGame: () => ipcRenderer.invoke('reload-game'),
  getGameStatus: () => ipcRenderer.invoke('get-game-status'),
  onGameOutput: (callback) => ipcRenderer.on('game-output', (event, output) => callback(output)),
  onGameExit: (callback) => ipcRenderer.on('game-exit', (event, code) => callback(code)),
  onMetroReady: (callback) => ipcRenderer.on('metro-ready', () => callback()),

  // Window controls
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
});
