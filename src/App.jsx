import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateSceneCode } from './utils/codeGenerator';
import ScriptEditor from './components/ScriptEditor';
import './App-compact.css';

export default function App() {
  const [mode, setMode] = useState('menu'); // 'menu', 'create', 'editor'
  const [projectName, setProjectName] = useState('MyGame');
  const [projectPath, setProjectPath] = useState('');
  const [currentProject, setCurrentProject] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [recentProjects, setRecentProjects] = useState([]);
  
  // Console auto-scroll ref
  const consoleEndRef = useRef(null);
  
  // Editor state
  const [gameObjects, setGameObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Game running state
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [runMode, setRunMode] = useState('dev-build'); // 'dev-build' or 'soft'
  const [gameConsoleOutput, setGameConsoleOutput] = useState([]);
  const [showPlatformDialog, setShowPlatformDialog] = useState(false);
  const [showDeviceDialog, setShowDeviceDialog] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const externalRunWarningShown = useRef(false);
  
  // Scene management
  const [availableScenes, setAvailableScenes] = useState(['MainScene']);
  const [currentSceneName, setCurrentSceneName] = useState('MainScene');
  
  // Script editor
  const [scriptEditorOpen, setScriptEditorOpen] = useState(false);
  const [editingScript, setEditingScript] = useState(null); // { objectId, scriptCode }
  
  // Context menu
  const [contextMenu, setContextMenu] = useState(null); // { x, y, objectId }
  const [showComponentMenu, setShowComponentMenu] = useState(false);
  
  // Camera/Viewport settings
  const [viewportPreset, setViewportPreset] = useState('9:16'); // Aspect ratio preset
  const [viewportOrientation, setViewportOrientation] = useState('portrait');
  const [viewportWidth, setViewportWidth] = useState(360); // Default phone width
  const [viewportHeight, setViewportHeight] = useState(640); // Default phone height
  
  // Debug mode
  const [debugMode, setDebugMode] = useState(false);

  // Viewport presets (common device aspect ratios)
  const viewportPresets = {
    '9:16': { width: 360, height: 640, name: 'Phone Portrait (9:16)' },
    '16:9': { width: 640, height: 360, name: 'Phone Landscape (16:9)' },
    '9:19.5': { width: 360, height: 780, name: 'Tall Phone (9:19.5)' },
    '4:3': { width: 480, height: 640, name: 'Tablet Portrait (4:3)' },
    '16:10': { width: 800, height: 500, name: 'Tablet Landscape (16:10)' },
  };

  // Handle viewport preset change
  const handleViewportPresetChange = (preset) => {
    setViewportPreset(preset);
    const dimensions = viewportPresets[preset];
    if (dimensions) {
      setViewportWidth(dimensions.width);
      setViewportHeight(dimensions.height);
    }
  };

  const normalizeAreaComponent = (component) => {
    if (component.type !== 'Area') return component;
    
    const normalizedScale = typeof component.scale === 'number'
      ? { x: component.scale, y: component.scale }
      : {
          x: component.scale?.x ?? 1,
          y: component.scale?.y ?? 1,
        };
    
    return {
      ...component,
      shape: component.shape ?? null,
      scale: normalizedScale,
      offset: {
        x: component.offset?.x ?? 0,
        y: component.offset?.y ?? 0,
      },
      collisionIgnore: component.collisionIgnore ?? [],
      restitution: component.restitution ?? 0,
      friction: component.friction ?? 1,
      cursor: component.cursor ?? null,
    };
  };

  const normalizeGameObjects = (objects = []) =>
    objects.map((obj) => ({
      ...obj,
      components: obj.components?.map(normalizeAreaComponent) ?? [],
    }));

  const syncGameStatus = useCallback(async () => {
    if (!window.electronAPI?.getGameStatus) return;
    try {
      const status = await window.electronAPI.getGameStatus();
      if (!status) return;
      const projectPath = currentProject?.path;
      const sameProject = status.projectPath && projectPath
        ? status.projectPath === projectPath
        : !status.projectPath || !projectPath;
      
      if (status.running && projectPath && status.projectPath && status.projectPath !== projectPath) {
        if (!externalRunWarningShown.current) {
          externalRunWarningShown.current = true;
          setGameConsoleOutput(prev => [
            ...prev,
            '',
            `⚠️ Another project is currently running (${status.projectPath}). Stop it before running this project.`,
          ]);
        }
      } else {
        externalRunWarningShown.current = false;
      }
      
      setIsGameRunning(Boolean(status.running && sameProject));
    } catch (error) {
      console.error('Failed to sync game status:', error);
    }
  }, [currentProject?.path, setGameConsoleOutput]);

  // Auto-detect default path on mount and load recent projects
  useEffect(() => {
    async function loadDefaultPath() {
      try {
        const defaultPath = await window.electronAPI.getDefaultPath();
        setProjectPath(defaultPath);
      } catch (error) {
        console.error('Failed to get default path:', error);
      }
    }
    loadDefaultPath();

    // Load recent projects from localStorage
    const savedRecent = localStorage.getItem('recentProjects');
    if (savedRecent) {
      try {
        setRecentProjects(JSON.parse(savedRecent));
      } catch (error) {
        console.error('Failed to parse recent projects:', error);
      }
    }
  }, []);

  useEffect(() => {
    let intervalId;
    if (mode === 'editor') {
      syncGameStatus();
      intervalId = setInterval(syncGameStatus, 5000);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [mode, syncGameStatus]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+S to save
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (mode === 'editor' && currentProject?.scenePath) {
          saveScene();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, currentProject, gameObjects]);
  
  // Close context menu on click anywhere
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleBrowseFolder = async () => {
    try {
      const selectedPath = await window.electronAPI.browseFolder();
      if (selectedPath) {
        setProjectPath(selectedPath);
      }
    } catch (error) {
      alert(`Failed to browse folder: ${error.message}`);
    }
  };

  const handleCreateProject = async () => {
    try {
      if (!projectName.trim()) {
        alert('Please enter a project name');
        return;
      }

      if (!projectPath.trim()) {
        alert('Please enter a project location');
        return;
      }

      const fullPath = `${projectPath}\\${projectName}`;
      
      if (window.confirm(`Project will be created at:\n${fullPath}\n\nThis will:\n1. Create a fresh Expo app\n2. Add the ReGame Engine\n3. Set up the editor\n\n(This may take 2-3 minutes)\n\nContinue?`)) {
        setIsLoading(true);
        setLoadingMessage('Creating Expo app with ReGame Engine...');
        setGameConsoleOutput([
          '🚀 Starting project creation...',
          '📦 This will create a proper Expo app first',
          '🎮 Then add the ReGame Engine on top',
          ''
        ]);
        
        const result = await window.electronAPI.createProject(projectPath, projectName);
        
        if (result.success) {
          // Project created successfully!
          setIsLoading(false);
          setLoadingMessage('');
          setGameConsoleOutput([]);
          
          // Show success message and ask to open
          const openNow = window.confirm(
            `✅ Project "${projectName}" created successfully!\n\n` +
            `Location: ${result.path}\n\n` +
            `Click OK to open in editor, or Cancel to stay on the menu.`
          );
          
          if (openNow) {
            setIsLoading(true);
            setLoadingMessage('Loading project...');
            
            // Wait for files to be fully written to disk
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Load the MainScene.json that was created
            await loadProject(fullPath, projectName);
          }
        } else {
          setIsLoading(false);
          setLoadingMessage('');
          setGameConsoleOutput([]);
          alert(`❌ Error: ${result.message}`);
        }
      }
    } catch (error) {
      setIsLoading(false);
      alert(`Failed to create project: ${error.message}`);
    }
  };

  const addToRecentProjects = (projectPath, projectName) => {
    const newProject = {
      name: projectName,
      path: projectPath,
      lastOpened: new Date().toISOString()
    };

    // Remove if already exists, then add to front
    const filtered = recentProjects.filter(p => p.path !== projectPath);
    const updated = [newProject, ...filtered].slice(0, 10); // Keep max 10
    
    setRecentProjects(updated);
    localStorage.setItem('recentProjects', JSON.stringify(updated));
  };

  const removeFromRecentProjects = (projectPath) => {
    const updated = recentProjects.filter(p => p.path !== projectPath);
    setRecentProjects(updated);
    localStorage.setItem('recentProjects', JSON.stringify(updated));
  };

  const loadProject = async (projectPath, projectName) => {
    try {
      // Read the main scene file
      const scenePath = `${projectPath}\\scenes\\MainScene.json`;
      
      // Retry logic - sometimes file system needs a moment
      let fileExists = false;
      let retries = 0;
      const maxRetries = 5;
      
      while (!fileExists && retries < maxRetries) {
        const checkResult = await window.electronAPI.checkPath(scenePath);
        if (checkResult.success && checkResult.exists) {
          fileExists = true;
        } else {
          retries++;
          if (retries < maxRetries) {
            console.log(`File not ready yet, retry ${retries}/${maxRetries}...`);
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      }
      
      if (!fileExists) {
        throw new Error(`Scene file not found after ${maxRetries} attempts. Path: ${scenePath}`);
      }
      
      const sceneResult = await window.electronAPI.readFile(scenePath);
      
      if (sceneResult.success) {
        const sceneData = JSON.parse(sceneResult.content);
        
        // Discover all available scenes
        const scenesResult = await window.electronAPI.listScenes(projectPath);
        const discoveredScenes = scenesResult.success ? scenesResult.scenes : ['MainScene'];
        
        // Set up project with loaded scene
        const project = {
          id: `proj_${Date.now()}`,
          name: projectName,
          path: projectPath,
          scenePath: scenePath,
          scene: sceneData,
        };
        
        setCurrentProject(project);
        setGameObjects(normalizeGameObjects(sceneData.objects || []));
        
        // Restore viewport settings if available
        if (sceneData.viewport) {
          setViewportPreset(sceneData.viewport.preset || '9:16');
          setViewportWidth(sceneData.viewport.width || 360);
          setViewportHeight(sceneData.viewport.height || 640);
        }
        
        // Restore debug mode
        setDebugMode(sceneData.debug ?? false);
        
        setSelectedObject(null);
        setAvailableScenes(discoveredScenes);
        setCurrentSceneName('MainScene');
        setIsLoading(false);
        setLoadingMessage('');
        setMode('editor');
        
        // Add to recent projects
        addToRecentProjects(projectPath, projectName);
        
        console.log('✅ Project loaded successfully!', project);
        console.log('📂 Available scenes:', discoveredScenes);
      } else {
        throw new Error('Failed to read scene file: ' + sceneResult.message);
      }
    } catch (error) {
      setIsLoading(false);
      setLoadingMessage('');
      console.error('❌ Failed to load project:', error);
      alert(`Failed to load project: ${error.message}`);
    }
  };

  const handleOpenRecentProject = async (project) => {
    setIsLoading(true);
    setLoadingMessage(`Loading ${project.name}...`);
    
    // Extract project name from path
    const pathParts = project.path.split('\\');
    const projectName = pathParts[pathParts.length - 1];
    
    await loadProject(project.path, projectName);
  };

  const handleBrowseExistingProject = async () => {
    try {
      const selectedPath = await window.electronAPI.browseFolder();
      if (selectedPath) {
        setIsLoading(true);
        setLoadingMessage('Loading project...');
        
        // Extract project name from path
        const pathParts = selectedPath.split('\\');
        const projectName = pathParts[pathParts.length - 1];
        
        await loadProject(selectedPath, projectName);
      }
    } catch (error) {
      setIsLoading(false);
      alert(`Failed to open project: ${error.message}`);
    }
  };

  const handleQuickStart = () => {
    const project = {
      id: `proj_${Date.now()}`,
      name: projectName,
      path: projectName.toLowerCase().replace(/\s+/g, '-'),
      scene: {
        name: 'Main Scene',
        width: 800,
        height: 600,
        backgroundColor: '#2a2a2a',
      },
    };
    setCurrentProject(project);
    setGameObjects([]);
    setSelectedObject(null);
    setMode('editor');
  };

  // ===== EDITOR FUNCTIONS =====

  const addGameObject = () => {
    // Spawn objects near center of canvas with slight random offset
    const baseX = 350;
    const baseY = 250;
    const randomOffset = () => Math.random() * 100 - 50; // -50 to +50
    
    const newObject = {
      id: `obj_${Date.now()}`,
      name: `GameObject ${gameObjects.length + 1}`,
      transform: {
        x: baseX + randomOffset(),
        y: baseY + randomOffset(),
        width: 100,
        height: 100,
        rotation: 0,
      },
      components: [
        { type: 'Transform', enabled: true }
      ],
      visible: true,
    };
    setGameObjects(normalizeGameObjects([...gameObjects, newObject]));
    setSelectedObject(newObject.id);
  };

  const deleteGameObject = (id) => {
    setGameObjects(gameObjects.filter(obj => obj.id !== id));
    if (selectedObject === id) {
      setSelectedObject(null);
    }
  };

  const updateGameObject = (id, updates) => {
    setGameObjects(gameObjects.map(obj => 
      obj.id === id ? { ...obj, ...updates } : obj
    ));
  };

  const addComponent = (objectId, componentType) => {
    const obj = gameObjects.find(o => o.id === objectId);
    if (!obj) return;

    // Check if component already exists
    if (obj.components.some(c => c.type === componentType)) {
      alert(`${componentType} component already exists!`);
      return;
    }

    const newComponent = { type: componentType, enabled: true };
    
    // Add default properties based on type
    if (componentType === 'Sprite') {
      newComponent.color = '#e94560';
      newComponent.imagePath = '';
    } else if (componentType === 'Shape') {
      newComponent.shapeType = 'Rectangle'; // Rectangle or Circle
      newComponent.color = '#6495ed';
      newComponent.filled = true;
    } else if (componentType === 'Circle') {
      // Shortcut for circle shape
      newComponent.type = 'Shape';
      newComponent.shapeType = 'Circle';
      newComponent.color = '#ff6464';
      newComponent.filled = true;
    } else if (componentType === 'Rectangle') {
      // Shortcut for rectangle shape
      newComponent.type = 'Shape';
      newComponent.shapeType = 'Rectangle';
      newComponent.color = '#6495ed';
      newComponent.filled = true;
    } else if (componentType === 'Area') {
      // Area component for collision detection (based on Kaplay's AreaComp)
      newComponent.shape = null; // null/undefined -> auto, matches Kaplay behavior
      newComponent.width = null; // null = auto-detect from shape
      newComponent.height = null;
      newComponent.radius = null;
      newComponent.offset = { x: 0, y: 0 };
      newComponent.scale = { x: 1, y: 1 };
      newComponent.cursor = null; // Not used on mobile, matches Kaplay signature
      newComponent.collisionIgnore = []; // Tags to ignore in collisions
      newComponent.restitution = 0; // Bounciness (0-1, 0=no bounce, 1=perfect bounce)
      newComponent.friction = 1; // Friction (0-1, 0=ice, 1=normal)
    } else if (componentType === 'Physics') {
      newComponent.mass = 1;
      newComponent.gravity = true;
      newComponent.velocity = { x: 0, y: 0 };
    } else if (componentType === 'Script') {
      newComponent.scriptPath = '';
    }

    updateGameObject(objectId, {
      components: [...obj.components, newComponent]
    });
  };

  const removeComponent = (objectId, componentType) => {
    const obj = gameObjects.find(o => o.id === objectId);
    if (!obj) return;

    if (componentType === 'Transform') {
      alert('Cannot remove Transform component!');
      return;
    }

    updateGameObject(objectId, {
      components: obj.components.filter(c => c.type !== componentType)
    });
  };

  const handleSceneMouseDown = (e, obj) => {
    if (e.target.closest('.game-object')) {
      e.stopPropagation(); // Prevent event bubbling
      setSelectedObject(obj.id);
      setIsDragging(true);
      
      // Calculate offset from mouse position to object position
      // Use the scene canvas as reference
      const sceneCanvas = document.querySelector('.sceneCanvas');
      if (sceneCanvas) {
        const rect = sceneCanvas.getBoundingClientRect();
        setDragOffset({
          x: e.clientX - rect.left - obj.transform.x,
          y: e.clientY - rect.top - obj.transform.y,
        });
      }
    }
  };

  const handleSceneMouseMove = (e) => {
    if (!isDragging || !selectedObject) return;

    // Get the scene canvas position
    const sceneCanvas = document.querySelector('.sceneCanvas');
    if (!sceneCanvas) return;
    
    const rect = sceneCanvas.getBoundingClientRect();
    const newX = e.clientX - rect.left - dragOffset.x;
    const newY = e.clientY - rect.top - dragOffset.y;

    const obj = gameObjects.find(o => o.id === selectedObject);
    if (obj) {
      updateGameObject(selectedObject, {
        transform: { ...obj.transform, x: Math.round(newX), y: Math.round(newY) }
      });
    }
  };

  const handleSceneMouseUp = () => {
    setIsDragging(false);
  };

  // ===== SCENE MANAGEMENT =====
  const handleCreateNewScene = async () => {
    const sceneName = prompt('Enter new scene name (e.g., Level1, GameOver):');
    if (!sceneName) return;
    
    // Validate scene name
    const cleanName = sceneName.trim().replace(/\s+/g, '');
    if (!cleanName || availableScenes.includes(cleanName)) {
      alert(`Scene "${cleanName}" already exists or is invalid!`);
      return;
    }
    
    try {
      // Create new scene JSON file
      const sceneFilePath = `${currentProject.path}\\scenes\\${cleanName}.json`;
      const emptyScene = {
        name: cleanName,
        width: 800,
        height: 600,
        backgroundColor: '#2a2a2a',
        objects: []
      };
      
      const saveResult = await window.electronAPI.saveFile(
        sceneFilePath,
        JSON.stringify(emptyScene, null, 2)
      );
      
      if (saveResult.success) {
        // Create corresponding JS file
        const jsFilePath = `${currentProject.path}\\scenes\\${cleanName}.js`;
        const sceneCode = `import { pos, rect, circle, body, area } from '../engine';\n\n// ${cleanName} - Created with ReGame Editor\nexport function ${cleanName}(ctx) {\n  // Empty scene - Add GameObjects in the editor!\n}\n`;
        await window.electronAPI.saveFile(jsFilePath, sceneCode);
        
        // Update available scenes
        setAvailableScenes(prev => [...prev, cleanName]);
        alert(`✅ Scene "${cleanName}" created successfully!`);
      }
    } catch (error) {
      alert(`Failed to create scene: ${error.message}`);
    }
  };
  
  const handleSwitchScene = async (sceneName) => {
    if (sceneName === currentSceneName) return;
    
    // Save current scene first
    if (currentProject) {
      await saveCurrentScene();
    }
    
    // Load new scene
    try {
      const sceneFilePath = `${currentProject.path}\\scenes\\${sceneName}.json`;
      const sceneResult = await window.electronAPI.readFile(sceneFilePath);
      
      if (sceneResult.success) {
        const sceneData = JSON.parse(sceneResult.content);
        setGameObjects(normalizeGameObjects(sceneData.objects || []));
        
        // Restore viewport settings if available
        if (sceneData.viewport) {
          setViewportPreset(sceneData.viewport.preset || '9:16');
          setViewportWidth(sceneData.viewport.width || 360);
          setViewportHeight(sceneData.viewport.height || 640);
        }
        
        // Restore debug mode
        setDebugMode(sceneData.debug ?? false);
        
        setCurrentSceneName(sceneName);
        setSelectedObject(null);
        console.log(`✅ Switched to scene: ${sceneName}`);
      }
    } catch (error) {
      alert(`Failed to load scene ${sceneName}: ${error.message}`);
    }
  };
  
  const saveCurrentScene = async () => {
    if (!currentProject) return;
    
    const sceneFilePath = `${currentProject.path}\\scenes\\${currentSceneName}.json`;
    const sceneData = {
      name: currentSceneName,
      viewport: {
        preset: viewportPreset,
        width: viewportWidth,
        height: viewportHeight,
      },
      debug: debugMode, // Save debug mode setting
      width: 800, // Canvas width (deprecated - kept for backwards compat)
      height: 600, // Canvas height (deprecated - kept for backwards compat)
      backgroundColor: '#2a2a2a',
      objects: gameObjects
    };
    
    await window.electronAPI.saveFile(sceneFilePath, JSON.stringify(sceneData, null, 2));
  };

  const handlePlayGame = () => {
    if (isGameRunning) {
      // Stop the game
      handleStopGame();
    } else {
      // Show platform selection dialog
      setShowPlatformDialog(true);
    }
  };

  const handleRunGame = async (platform, deviceId = null) => {
    setShowPlatformDialog(false);
    setShowDeviceDialog(false);
    
    if (!currentProject?.path) {
      alert('No project loaded!');
      return;
    }

    try {
      // Auto-save before running
      await saveScene();
      
      setIsGameRunning(true);
      const isSoftRun = runMode === 'soft';
      const runLabel = isSoftRun ? 'Expo Dev Client (soft start)' : 'Expo Dev Build';
      const commandPreview = isSoftRun
        ? 'npx expo start --dev-client --clear'
        : `npx expo ${platform === 'android' ? 'run:android' : 'run:ios'}`;
      const deviceInfo = deviceId ? ` on device ${deviceId}` : '';
      setGameConsoleOutput(prev => [
        ...prev,
        ``,
        `─────────────────────────────────────────────`,
        `🎮 Starting ${runLabel} on ${platform}${deviceInfo}...`,
        `📂 Project: ${currentProject.path}`,
        ``,
        `⚙️ Step 1: Checking dependencies...`
      ]);

      // Check if dependencies are installed
      const hasNodeModules = await window.electronAPI.checkPath(
        `${currentProject.path}\\node_modules`
      );

      if (!hasNodeModules.exists) {
        setGameConsoleOutput(prev => [
          ...prev,
          ``,
          `📦 Installing dependencies (this may take a few minutes)...`,
          `💡 Running: npm install`,
          ``
        ]);

        // Install dependencies first
        const installResult = await window.electronAPI.installDependencies(currentProject.path);
        
        if (!installResult.success) {
          setGameConsoleOutput(prev => [...prev, `❌ Failed to install dependencies: ${installResult.message}`]);
          setIsGameRunning(false);
          return;
        }
      } else {
        setGameConsoleOutput(prev => [...prev, `✅ Dependencies already installed`]);
      }

      setGameConsoleOutput(prev => [
        ...prev,
        ``,
        isSoftRun
          ? `⚙️ Step 2: Starting Metro in dev-client mode...`
          : `⚙️ Step 2: Starting Expo and detecting ${platform} devices...`,
        `💡 Running: ${commandPreview}`,
        `📱 Waiting for device list...`,
        ``
      ]);

      // Run the game via Electron IPC (pass deviceId if selected)
      const result = await window.electronAPI.runGame(
        currentProject.path,
        platform,
        deviceId,
        { mode: runMode }
      );
      
      if (!result.success) {
        setGameConsoleOutput(prev => [...prev, `❌ Error: ${result.message}`]);
        setIsGameRunning(false);
      }
    } catch (error) {
      setGameConsoleOutput(prev => [...prev, `❌ Failed to start game: ${error.message}`]);
      setIsGameRunning(false);
    }
  };

  const handleStopGame = async () => {
    try {
      await window.electronAPI.stopGame();
      setGameConsoleOutput(prev => [...prev, '', '⏹️ Game stopped by user']);
      setIsGameRunning(false);
      await syncGameStatus();
    } catch (error) {
      console.error('Failed to stop game:', error);
      setIsGameRunning(false);
    }
  };

  const handleReloadGame = async () => {
    try {
      await window.electronAPI.reloadGame();
      setGameConsoleOutput(prev => [...prev, '', '🔄 Reloading app...']);
    } catch (error) {
      console.error('Failed to reload game:', error);
      setGameConsoleOutput(prev => [...prev, `❌ Failed to reload: ${error.message}`]);
    }
  };

  // Script editor functions
  const openScriptEditor = (objectId) => {
    const obj = gameObjects.find(o => o.id === objectId);
    if (!obj) return;
    
    const scriptComponent = obj.components.find(c => c.type === 'Script');
    setEditingScript({
      objectId: objectId,
      scriptCode: scriptComponent?.code || ''
    });
    setScriptEditorOpen(true);
  };

  const saveScriptCode = async (code) => {
    if (!editingScript) return;
    
    const obj = gameObjects.find(o => o.id === editingScript.objectId);
    if (!obj) return;
    
    // Check if Script component already exists
    const hasScriptComponent = obj.components.some(c => c.type === 'Script');
    
    let updated;
    if (hasScriptComponent) {
      // Update existing Script component
      updated = obj.components.map(c =>
        c.type === 'Script' ? { ...c, code: code } : c
      );
    } else {
      // Add new Script component
      updated = [
        ...obj.components,
        { type: 'Script', code: code, enabled: true }
      ];
    }
    
    // Update the gameObjects state with the new script
    const updatedGameObjects = gameObjects.map(o => 
      o.id === editingScript.objectId ? { ...o, components: updated } : o
    );
    
    // Update state
    setGameObjects(normalizeGameObjects(updatedGameObjects));
    setEditingScript(null);
    
    // Auto-save the scene after updating state
    // Use the updated gameObjects directly instead of relying on state
    if (!currentProject?.path) {
      console.warn('No project loaded - cannot auto-save script');
      return;
    }
    
    try {
      // Save scene JSON with updated objects
      const sceneFilePath = `${currentProject.path}\\scenes\\${currentSceneName}.json`;
      const sceneData = {
        name: currentSceneName,
        viewport: {
          preset: viewportPreset,
          width: viewportWidth,
          height: viewportHeight,
        },
        width: 800,
        height: 600,
        backgroundColor: '#2a2a2a',
        objects: updatedGameObjects // Use the updated objects directly!
      };
      
      await window.electronAPI.saveFile(sceneFilePath, JSON.stringify(sceneData, null, 2));
      
      // Generate JS files for ALL scenes
      for (const sceneName of availableScenes) {
        const sceneJsonPath = `${currentProject.path}\\scenes\\${sceneName}.json`;
        const sceneJsPath = `${currentProject.path}\\scenes\\${sceneName === 'MainScene' ? 'Main' : sceneName}.js`;
        
        // Read scene data
        const sceneResult = await window.electronAPI.readFile(sceneJsonPath);
        if (sceneResult.success) {
          const sceneDataToGenerate = JSON.parse(sceneResult.content);
          const existingSceneResult = await window.electronAPI.readFile(sceneJsPath);
          const existingSceneCode = existingSceneResult.success ? existingSceneResult.content : '';
          const gameCode = generateSceneCode(sceneName, sceneDataToGenerate.objects || [], existingSceneCode);
          await window.electronAPI.saveFile(sceneJsPath, gameCode);
          console.log(`✅ Generated ${sceneName}.js`);
        }
      }
      
      // Update App.js
      await generateAppJs();
      
      console.log('✅ Script saved and scene regenerated');
    } catch (error) {
      console.error('Failed to auto-save after script update:', error);
      alert(`Failed to save script changes: ${error.message}`);
    }
  };

  // Listen for game console output
  useEffect(() => {
    if (window.electronAPI?.onGameOutput) {
      window.electronAPI.onGameOutput((output) => {
        setGameConsoleOutput(prev => [...prev, output]);
      });
    }

    if (window.electronAPI?.onGameExit) {
      window.electronAPI.onGameExit((code) => {
        setGameConsoleOutput(prev => [
          ...prev, 
          '', 
          code === 0 ? '✅ Game exited normally' : `❌ Game exited with code ${code}`
        ]);
        setIsGameRunning(false);
      });
    }

    // Listen for Metro ready event (build finished, Metro keeps running)
    if (window.electronAPI?.onMetroReady) {
      window.electronAPI.onMetroReady(() => {
        console.log('✅ Metro is ready! Editor unlocked.');
        // Keep isGameRunning true so Reload/Stop buttons stay visible
        // But user can still edit!
      });
    }
  }, []);
  
  // Auto-scroll console to bottom when new output arrives
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [gameConsoleOutput]);

  const saveScene = async () => {
    if (!currentProject?.path) {
      alert('No project loaded - cannot save!');
      return;
    }

    try {
      // Save current scene JSON
      await saveCurrentScene();
      
      // Generate JS files for ALL scenes
      for (const sceneName of availableScenes) {
        const sceneJsonPath = `${currentProject.path}\\scenes\\${sceneName}.json`;
        const sceneJsPath = `${currentProject.path}\\scenes\\${sceneName === 'MainScene' ? 'Main' : sceneName}.js`;
        
        // Read scene data
        const sceneResult = await window.electronAPI.readFile(sceneJsonPath);
        if (sceneResult.success) {
          const sceneData = JSON.parse(sceneResult.content);
          const existingSceneResult = await window.electronAPI.readFile(sceneJsPath);
          const existingSceneCode = existingSceneResult.success ? existingSceneResult.content : '';
          const gameCode = generateSceneCode(sceneName, sceneData.objects || [], existingSceneCode);
          await window.electronAPI.saveFile(sceneJsPath, gameCode);
          console.log(`✅ Generated ${sceneName}.js`);
        }
      }
      
      // Update App.js to register all scenes
      await generateAppJs();
      
      alert(`Scene saved successfully! ✅\n\nSaved:\n- ${currentSceneName}.json (editor data)\n- Generated JS files for all scenes\n- Updated App.js`);
      
      console.log('✅ Saved all scenes');
    } catch (error) {
      alert(`Error saving scene: ${error.message}`);
    }
  };
  
  const generateAppJs = async () => {
    // Generate App.js with all scenes registered
    const imports = availableScenes.map(name => {
      const jsName = name === 'MainScene' ? 'Main' : name;
      return `import { ${name} } from './scenes/${jsName}';`;
    }).join('\n');
    
    const sceneRegistry = availableScenes.map(name => `  ${name.toLowerCase()}: ${name},`).join('\n');
    
    const appCode = `import { Game } from './engine';
${imports}

// Scene registry
const scenes = {
${sceneRegistry}
};

export default function App() {
  return (
    <Game 
      showGamePad
      debug={${debugMode}} // Debug mode - shows green collision area outlines
    >
      {(ctx) => {
        // Register all scenes
        Object.entries(scenes).forEach(([name, sceneFunc]) => {
          ctx.scene(name, sceneFunc);
        });

        // Start with main scene
        ctx.go('mainscene');
      }}
    </Game>
  );
}
`;
    
    await window.electronAPI.saveFile(`${currentProject.path}\\App.js`, appCode);
  };

  // Loading Overlay (show console if creating project)
  if (isLoading) {
    return (
      <div className="container">
        <div className="loadingOverlay">
          <div className="loadingSpinner"></div>
          <p className="loadingText">{loadingMessage}</p>
          
          {gameConsoleOutput.length > 0 && (
            <div className="loadingConsole">
              {gameConsoleOutput.map((line, idx) => (
                <div key={idx} className="consoleLine">{line}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Menu Mode - Project Manager
  if (mode === 'menu') {
    return (
      <div className="container">
        <div className="header">
          <h1 className="title">🎮 ReGame Engine Editor</h1>
          <p className="subtitle">Electron Edition</p>
        </div>

        <div className="content">
          {/* Create New Project Card */}
          <div className="card">
            <div className="cardIcon">📁</div>
            <h2 className="cardTitle">Create New Project</h2>
            <p className="cardDesc">Set up a new game project with ReGame Engine</p>
            
            <button 
              className="button buttonPrimary" 
              onClick={() => setMode('create')}
            >
              Create Project
            </button>
          </div>

          {/* Quick Start Card */}
          <div className="card">
            <div className="cardIcon">⚡</div>
            <h2 className="cardTitle">Quick Start</h2>
            <p className="cardDesc">Jump into the editor without saving files</p>
            
            <input
              className="input"
              type="text"
              placeholder="Project Name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
            
            <button 
              className="button buttonSecondary" 
              onClick={handleQuickStart}
            >
              Open Editor
            </button>
          </div>

          {/* Coming Soon */}
          {/* Recent Projects */}
          <div className="card">
            <div className="cardIcon">📂</div>
            <h2 className="cardTitle">Recent Projects</h2>
            <p className="cardDesc">Open a recently edited project</p>
            
            {recentProjects.length === 0 ? (
              <p className="emptyState" style={{ marginTop: '16px' }}>No recent projects yet</p>
            ) : (
              <div className="recentProjectsList">
                {recentProjects.slice(0, 5).map((project, idx) => (
                  <div key={idx} className="recentProjectItem">
                    <div className="recentProjectInfo" onClick={() => handleOpenRecentProject(project)}>
                      <div className="recentProjectName">🎮 {project.name}</div>
                      <div className="recentProjectPath">{project.path}</div>
                    </div>
                    <button 
                      className="recentProjectRemove"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromRecentProjects(project.path);
                      }}
                      title="Remove from recent"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button 
              className="button buttonSecondary" 
              onClick={handleBrowseExistingProject}
              style={{ marginTop: '16px' }}
            >
              📁 Browse for Project
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Create Mode - Project Creator
  if (mode === 'create') {
    return (
      <div className="container">
        <div className="header">
          <button className="backButton" onClick={() => setMode('menu')}>
            ← Back
          </button>
          <h1 className="title">Create New Project</h1>
        </div>

        <div className="content">
          <div className="form">
            <label className="label">Project Name</label>
            <input
              className="input"
              type="text"
              placeholder="MyAwesomeGame"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />

            <label className="label">Project Location</label>
            <div className="inputRow">
              <input
                className="input inputWithButton"
                type="text"
                placeholder="C:\Users\YourName\Documents\RegameProjects"
                value={projectPath}
                onChange={(e) => setProjectPath(e.target.value)}
              />
              <button 
                className="browseButton" 
                onClick={handleBrowseFolder}
              >
                📁 Browse
              </button>
            </div>

            <button 
              className="button buttonPrimary buttonLarge" 
              onClick={handleCreateProject}
            >
              Create Project
            </button>

            <p className="helpText">
              Project folder will be created at the specified location with the starter template files.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Editor Mode - Main Editor Interface
  const selectedObj = gameObjects.find(obj => obj.id === selectedObject);

  return (
    <div className="container">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbarCenter">
          <h2 className="toolbarTitle">{currentProject?.name || 'Editor'}</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="toolbarSubtitle">Scene:</span>
            <select 
              className="sceneSelector"
              value={currentSceneName}
              onChange={(e) => handleSwitchScene(e.target.value)}
              title="Switch Scene"
            >
              {availableScenes.map(scene => (
                <option key={scene} value={scene}>{scene}</option>
              ))}
            </select>
            <button 
              className="newSceneButton"
              onClick={handleCreateNewScene}
              title="Create New Scene"
            >
              + New Scene
            </button>
            
            {/* Viewport Preset Selector */}
            <span className="toolbarSubtitle" style={{ marginLeft: '16px' }}>Viewport:</span>
            <select 
              className="sceneSelector"
              value={viewportPreset}
              onChange={(e) => handleViewportPresetChange(e.target.value)}
              title="Device Aspect Ratio"
            >
              {Object.entries(viewportPresets).map(([key, preset]) => (
                <option key={key} value={key}>{preset.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {currentProject?.scenePath && (
            <button className="toolbarButton saveButton" onClick={saveScene} title="Save Scene (Ctrl+S)">💾 Save</button>
          )}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span className="toolbarSubtitle">Run Mode:</span>
            <select
              className="sceneSelector runModeSelector"
              value={runMode}
              onChange={(e) => setRunMode(e.target.value)}
              title="Choose how to launch the game"
            >
              <option value="dev-build">Full Build (run:android)</option>
              <option value="soft">Soft Metro (dev client)</option>
            </select>
          </div>
          <button 
            className={`toolbarButton ${debugMode ? 'playButton' : ''}`}
            onClick={() => setDebugMode(!debugMode)} 
            title="Toggle Debug Mode (Show Collision Outlines)"
            style={{ backgroundColor: debugMode ? '#4CAF50' : undefined }}
          >
            🐛 Debug
          </button>
          <button className="toolbarButton" onClick={() => window.electronAPI.toggleFullscreen()} title="Toggle Full Screen">🗖 Full Screen</button>
          <button className={`toolbarButton ${isGameRunning ? 'stopButton' : 'playButton'}`} onClick={handlePlayGame} title={isGameRunning ? 'Stop Game' : 'Run Game'}>
            {isGameRunning ? '⏹️ Stop' : '▶️ Play'}
          </button>
          {isGameRunning && ( // Reload button only visible when game is running
            <button className="toolbarButton reloadButton" onClick={handleReloadGame} title="Reload Game (R)">🔄 Reload</button>
          )}
        </div>
      </div>

      {/* Platform Selection Dialog */}
      {showPlatformDialog && (
        <div className="dialogOverlay">
          <div className="dialog">
            <h2 className="dialogTitle">Select Platform</h2>
            <p className="dialogDesc">Choose which platform to run the game on</p>
            
            <div className="platformButtons">
              <button 
                className="platformButton"
                onClick={async () => {
                  setSelectedPlatform('android');
                  setShowPlatformDialog(false);
                  const result = await window.electronAPI.getDevices('android');
                  if (result.success && result.devices.length > 0) {
                    setAvailableDevices(result.devices);
                    setShowDeviceDialog(true);
                  } else {
                    alert(result.message || 'No Android devices found. Make sure USB debugging is enabled.');
                    setShowPlatformDialog(true);
                    setSelectedPlatform(null);
                  }
                }}
              >
                <div className="platformIcon">🤖</div>
                <div className="platformName">Android</div>
                <div className="platformCmd">{runMode === 'soft' ? 'Dev Client' : 'Dev Build'}</div>
              </button>
              
              <button 
                className="platformButton"
                onClick={async () => {
                  setSelectedPlatform('ios');
                  setShowPlatformDialog(false);
                  const result = await window.electronAPI.getDevices('ios');
                  if (result.success && result.devices.length > 0) {
                    setAvailableDevices(result.devices);
                    setShowDeviceDialog(true);
                  } else {
                    alert(result.message || 'No iOS simulators found.');
                    setShowPlatformDialog(true);
                    setSelectedPlatform(null);
                  }
                }}
              >
                <div className="platformIcon">🍎</div>
                <div className="platformName">iOS</div>
                <div className="platformCmd">{runMode === 'soft' ? 'Dev Client' : 'Dev Build'}</div>
              </button>
            </div>
            
            <button 
              className="button buttonSecondary"
              onClick={() => setShowPlatformDialog(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Device Selection Dialog */}
      {showDeviceDialog && (
        <div className="dialogOverlay">
          <div className="dialog">
            <h2 className="dialogTitle">Select Device</h2>
            <p className="dialogDesc">Choose a device to run on</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '16px 0' }}>
              {availableDevices.map((device) => (
                <button
                  key={device.id}
                  className="platformButton"
                  style={{ width: '100%', padding: '12px' }}
                  onClick={async () => {
                    setShowDeviceDialog(false);
                    
                    // If emulator needs to be started, show message and start it
                    if (device.needsStart && device.isEmulator) {
                      setGameConsoleOutput(prev => [
                        ...prev,
                        ``,
                        `🚀 Starting emulator: ${device.id}...`,
                        `⏳ This may take a minute...`
                      ]);
                      
                      // Start emulator in background via IPC
                      await window.electronAPI.startEmulator(device.id);
                      
                      setGameConsoleOutput(prev => [
                        ...prev,
                        `✅ Emulator started! Launching game...`
                      ]);
                      
                      // Wait for emulator to boot (5 seconds)
                      await new Promise(resolve => setTimeout(resolve, 5000));
                    }
                    
                    handleRunGame(selectedPlatform, device.id);
                  }}
                >
                  <div style={{ fontSize: '24px' }}>{device.needsStart ? '🟡' : '🟢'}</div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold' }}>{device.name}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{device.id}</div>
                  </div>
                </button>
              ))}
            </div>
            
            <button 
              className="button buttonSecondary"
              onClick={() => {
                setShowDeviceDialog(false);
                setShowPlatformDialog(true);
              }}
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Editor Layout */}
      <div className="editorLayout">
        {/* Left: Hierarchy (Scene Tree) */}
        <div className="hierarchy">
          <div className="panelHeader">
            <h3 className="panelTitle">Scene Tree</h3>
            <button className="addTreeButton" onClick={addGameObject} title="Add Node">
              +
            </button>
          </div>
          <div className="panelContent treePanel">
            {/* Root Node - Always shows current scene */}
            <div className="treeNode rootNode">
              <span className="treeArrow">▼</span>
              <span className="treeIcon">🎬</span>
              <span className="treeName">{currentSceneName}</span>
            </div>
            
            {gameObjects.length === 0 ? (
              <div className="treeEmptyHint">
                <span style={{ fontSize: '11px', color: '#888', marginLeft: '28px' }}>
                  Press + to add a node
                </span>
              </div>
            ) : (
              <div className="treeChildren">
                {gameObjects.map((obj, index) => {
                  const shape = obj.components.find(c => c.type === 'Shape');
                  const hasScript = obj.components.some(c => c.type === 'Script');
                  
                  // Determine icon based on components
                  let icon = '📦'; // Default Node2D
                  if (shape) {
                    icon = shape.shapeType === 'Circle' ? '🔵' : '🟦';
                  }
                  if (hasScript) {
                    icon = '📜'; // Script icon takes priority
                  }
                  
                  return (
                    <div 
                      key={obj.id} 
                      className={`treeNode childNode ${selectedObject === obj.id ? 'selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedObject(obj.id);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedObject(obj.id);
                        setContextMenu({ x: e.clientX, y: e.clientY, objectId: obj.id });
                      }}
                    >
                      <span className="treeIndent"></span>
                      <span className="treeArrow invisible">▸</span>
                      <span className="treeIcon">{icon}</span>
                      <span className="treeName">{obj.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Center: Scene View */}
        <div className="sceneView">
          <div className="panelHeader">
            <h3 className="panelTitle">Scene</h3>
          </div>
          <div 
            className="sceneCanvas"
            onMouseMove={handleSceneMouseMove}
            onMouseUp={handleSceneMouseUp}
            onMouseLeave={handleSceneMouseUp}
          >
            {/* Camera Viewport Outline */}
            <div 
              className="cameraViewport"
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: `${viewportWidth}px`,
                height: `${viewportHeight}px`,
                border: '2px solid #e94560',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                pointerEvents: 'none',
                zIndex: 1000,
              }}
            >
              <div style={{
                position: 'absolute',
                top: '-24px',
                left: '0',
                fontSize: '11px',
                color: '#e94560',
                fontWeight: 'bold',
                background: '#1a1a2e',
                padding: '2px 6px',
                borderRadius: '3px',
              }}>
                📷 {viewportWidth} × {viewportHeight}
              </div>
            </div>
            
            {gameObjects.length === 0 ? (
              <>
                <div className="canvasText">🎨 Scene Canvas</div>
                <div className="canvasHelp">Add GameObjects from the Hierarchy panel</div>
              </>
            ) : (
              gameObjects.map(obj => {
                const shapeComponent = obj.components.find(c => c.type === 'Shape');
                const spriteComponent = obj.components.find(c => c.type === 'Sprite');
                const areaComponent = obj.components.find(c => c.type === 'Area');
                const fillColor = shapeComponent?.color || spriteComponent?.color || '#666';
                const areaScaleX = areaComponent?.scale?.x ?? 1;
                const areaScaleY = areaComponent?.scale?.y ?? 1;
                const isCircle = shapeComponent?.shapeType === 'Circle';

                const areaWidth = (() => {
                  if (!areaComponent) return obj.transform.width;
                  if (areaComponent.width != null) return areaComponent.width;
                  if (areaComponent.radius != null) return areaComponent.radius * 2;
                  return obj.transform.width;
                })() * areaScaleX;
                const areaHeight = (() => {
                  if (!areaComponent) return obj.transform.height;
                  if (areaComponent.height != null) return areaComponent.height;
                  if (areaComponent.radius != null) return areaComponent.radius * 2;
                  return obj.transform.height;
                })() * areaScaleY;
                const areaOffsetX = areaComponent?.offset?.x ?? 0;
                const areaOffsetY = areaComponent?.offset?.y ?? 0;

                return (
                  <React.Fragment key={obj.id}>
                    <div
                      className={`game-object ${selectedObject === obj.id ? 'selected-object' : ''}`}
                      style={{
                        position: 'absolute',
                        left: obj.transform.x,
                        top: obj.transform.y,
                        width: obj.transform.width,
                        height: obj.transform.height,
                        backgroundColor: fillColor,
                        borderRadius: isCircle ? '50%' : '0',
                        border: selectedObject === obj.id ? '2px solid #e94560' : '1px solid #444',
                        cursor: 'move',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '12px',
                        userSelect: 'none',
                        boxShadow: selectedObject === obj.id ? '0 0 0 2px #e94560' : 'none',
                      }}
                      onMouseDown={(e) => handleSceneMouseDown(e, obj)}
                    >
                      {obj.name}
                    </div>
                    
                    {/* Debug: Show collision area outline in editor */}
                    {debugMode && areaComponent && (
                      <div
                        style={{
                          position: 'absolute',
                          left: obj.transform.x + areaOffsetX,
                          top: obj.transform.y + areaOffsetY,
                          width: areaWidth,
                          height: areaHeight,
                          border: '2px solid #00ff00',
                          borderRadius: isCircle || areaComponent.radius != null ? '50%' : '0',
                          pointerEvents: 'none',
                          zIndex: 999,
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Inspector */}
        <div className="inspector">
          <div className="panelHeader">
            <h3 className="panelTitle">Inspector</h3>
          </div>
          <div className="panelContent">
            {!selectedObj ? (
              <p className="emptyState">Select an object to edit</p>
            ) : (
              <div className="inspectorContent">
                {/* Object Name */}
                <div className="propertyGroup">
                  <label className="propertyLabel">Name</label>
                  <input
                    className="propertyInput"
                    type="text"
                    value={selectedObj.name}
                    onChange={(e) => updateGameObject(selectedObj.id, { name: e.target.value })}
                  />
                </div>

                {/* Transform Component (always present) */}
                <div className="componentSection">
                  <div className="componentHeader">
                    <strong>Transform</strong>
                  </div>
                  <div className="propertyGroup">
                    <label className="propertyLabel">Position X</label>
                    <input
                      className="propertyInput"
                      type="number"
                      value={Math.round(selectedObj.transform.x)}
                      onChange={(e) => updateGameObject(selectedObj.id, {
                        transform: { ...selectedObj.transform, x: parseFloat(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="propertyGroup">
                    <label className="propertyLabel">Position Y</label>
                    <input
                      className="propertyInput"
                      type="number"
                      value={Math.round(selectedObj.transform.y)}
                      onChange={(e) => updateGameObject(selectedObj.id, {
                        transform: { ...selectedObj.transform, y: parseFloat(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="propertyGroup">
                    <label className="propertyLabel">Width</label>
                    <input
                      className="propertyInput"
                      type="number"
                      value={selectedObj.transform.width}
                      onChange={(e) => updateGameObject(selectedObj.id, {
                        transform: { ...selectedObj.transform, width: parseFloat(e.target.value) || 1 }
                      })}
                    />
                  </div>
                  <div className="propertyGroup">
                    <label className="propertyLabel">Height</label>
                    <input
                      className="propertyInput"
                      type="number"
                      value={selectedObj.transform.height}
                      onChange={(e) => updateGameObject(selectedObj.id, {
                        transform: { ...selectedObj.transform, height: parseFloat(e.target.value) || 1 }
                      })}
                    />
                  </div>
                </div>

                {/* Other Components */}
                {selectedObj.components.filter(c => c.type !== 'Transform').map((component, idx) => (
                  <div key={idx} className="componentSection">
                    <div className="componentHeader">
                      <strong>{component.type === 'Shape' ? `${component.shapeType} Shape` : component.type}</strong>
                      <button
                        className="removeComponentBtn"
                        onClick={() => removeComponent(selectedObj.id, component.type)}
                        title="Remove component"
                      >
                        ✕
                      </button>
                    </div>
                    
                    {component.type === 'Shape' && (
                      <>
                        <div className="propertyGroup">
                          <label className="propertyLabel">Shape Type</label>
                          <select
                            className="propertyInput"
                            value={component.shapeType}
                            onChange={(e) => {
                              const updated = selectedObj.components.map(c =>
                                c.type === 'Shape' ? { ...c, shapeType: e.target.value } : c
                              );
                              updateGameObject(selectedObj.id, { components: updated });
                            }}
                          >
                            <option value="Rectangle">Rectangle</option>
                            <option value="Circle">Circle</option>
                          </select>
                        </div>
                        <div className="propertyGroup">
                          <label className="propertyLabel">Color</label>
                          <input
                            className="propertyInput"
                            type="color"
                            value={component.color}
                            onChange={(e) => {
                              const updated = selectedObj.components.map(c =>
                                c.type === 'Shape' ? { ...c, color: e.target.value } : c
                              );
                              updateGameObject(selectedObj.id, { components: updated });
                            }}
                          />
                        </div>
                      </>
                    )}
                    
                    {component.type === 'Sprite' && (
                      <div className="propertyGroup">
                        <label className="propertyLabel">Color</label>
                        <input
                          className="propertyInput"
                          type="color"
                          value={component.color}
                          onChange={(e) => {
                            const updated = selectedObj.components.map(c =>
                              c.type === 'Sprite' ? { ...c, color: e.target.value } : c
                            );
                            updateGameObject(selectedObj.id, { components: updated });
                          }}
                        />
                      </div>
                    )}

                    {component.type === 'Area' && (
                      <>
                        <div className="propertyGroup">
                          <label className="propertyLabel">Shape</label>
                          <select
                            className="propertyInput"
                            value={component.shape ?? 'auto'}
                            onChange={(e) => {
                              const updated = selectedObj.components.map(c =>
                                c.type === 'Area' ? { ...c, shape: e.target.value } : c
                              );
                              updateGameObject(selectedObj.id, { components: updated });
                            }}
                          >
                            <option value="auto">Auto (from visual shape)</option>
                            <option value="rect">Rectangle</option>
                            <option value="circle">Circle</option>
                          </select>
                        </div>
                        
                        <div className="propertyGroup">
                          <label className="propertyLabel">Scale X</label>
                          <input
                            className="propertyInput"
                            type="number"
                            step="0.1"
                            value={component.scale?.x ?? 1}
                            onChange={(e) => {
                              const updated = selectedObj.components.map(c =>
                                c.type === 'Area'
                                  ? { ...c, scale: { x: parseFloat(e.target.value), y: c.scale?.y ?? 1 } }
                                  : c
                              );
                              updateGameObject(selectedObj.id, { components: updated });
                            }}
                          />
                        </div>
                        <div className="propertyGroup">
                          <label className="propertyLabel">Scale Y</label>
                          <input
                            className="propertyInput"
                            type="number"
                            step="0.1"
                            value={component.scale?.y ?? 1}
                            onChange={(e) => {
                              const updated = selectedObj.components.map(c =>
                                c.type === 'Area'
                                  ? { ...c, scale: { x: c.scale?.x ?? 1, y: parseFloat(e.target.value) } }
                                  : c
                              );
                              updateGameObject(selectedObj.id, { components: updated });
                            }}
                          />
                        </div>
                        
                        <div className="propertyGroup">
                          <label className="propertyLabel">Offset X</label>
                          <input
                            className="propertyInput"
                            type="number"
                            value={component.offset?.x ?? 0}
                            onChange={(e) => {
                              const updated = selectedObj.components.map(c =>
                                c.type === 'Area' ? { 
                                  ...c, 
                                  offset: { 
                                    x: parseFloat(e.target.value), 
                                    y: c.offset?.y ?? 0 
                                  } 
                                } : c
                              );
                              updateGameObject(selectedObj.id, { components: updated });
                            }}
                          />
                        </div>
                        
                        <div className="propertyGroup">
                          <label className="propertyLabel">Offset Y</label>
                          <input
                            className="propertyInput"
                            type="number"
                            value={component.offset?.y ?? 0}
                            onChange={(e) => {
                              const updated = selectedObj.components.map(c =>
                                c.type === 'Area' ? { 
                                  ...c, 
                                  offset: { 
                                    x: c.offset?.x ?? 0, 
                                    y: parseFloat(e.target.value) 
                                  } 
                                } : c
                              );
                              updateGameObject(selectedObj.id, { components: updated });
                            }}
                          />
                        </div>
                    
                    <div className="propertyGroup">
                      <label className="propertyLabel">Collision Ignore Tags</label>
                      <input
                        className="propertyInput"
                        type="text"
                        placeholder="enemy, bullet"
                        value={(component.collisionIgnore || []).join(', ')}
                        onChange={(e) => {
                          const tags = e.target.value
                            .split(',')
                            .map(tag => tag.trim())
                            .filter(Boolean);
                          const updated = selectedObj.components.map(c =>
                            c.type === 'Area' ? { ...c, collisionIgnore: tags } : c
                          );
                          updateGameObject(selectedObj.id, { components: updated });
                        }}
                      />
                    </div>
                        
                        <div className="propertyGroup">
                          <label className="propertyLabel">Restitution (Bounciness)</label>
                          <input
                            className="propertyInput"
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={component.restitution ?? 0}
                            onChange={(e) => {
                              const updated = selectedObj.components.map(c =>
                                c.type === 'Area' ? { ...c, restitution: parseFloat(e.target.value) } : c
                              );
                              updateGameObject(selectedObj.id, { components: updated });
                            }}
                          />
                          <div style={{ fontSize: '10px', color: '#666' }}>0 = no bounce, 1 = perfect bounce</div>
                        </div>
                        
                        <div className="propertyGroup">
                          <label className="propertyLabel">Friction</label>
                          <input
                            className="propertyInput"
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={component.friction ?? 1}
                            onChange={(e) => {
                              const updated = selectedObj.components.map(c =>
                                c.type === 'Area' ? { ...c, friction: parseFloat(e.target.value) } : c
                              );
                              updateGameObject(selectedObj.id, { components: updated });
                            }}
                          />
                          <div style={{ fontSize: '10px', color: '#666' }}>0 = ice, 1 = normal friction</div>
                        </div>
                        
                        <div style={{ fontSize: '11px', color: '#888', padding: '8px' }}>
                          💡 Tip: Click the 🐛 Debug button to see collision area outline (green)
                        </div>
                      </>
                    )}

                    {component.type === 'Physics' && (
                      <>
                        <div className="propertyGroup">
                          <label className="propertyLabel">Mass</label>
                          <input
                            className="propertyInput"
                            type="number"
                            step="0.1"
                            value={component.mass}
                            onChange={(e) => {
                              const updated = selectedObj.components.map(c =>
                                c.type === 'Physics' ? { ...c, mass: parseFloat(e.target.value) } : c
                              );
                              updateGameObject(selectedObj.id, { components: updated });
                            }}
                          />
                        </div>
                        <div className="propertyGroup">
                          <label className="propertyLabel">
                            <input
                              type="checkbox"
                              checked={component.gravity}
                              onChange={(e) => {
                                const updated = selectedObj.components.map(c =>
                                  c.type === 'Physics' ? { ...c, gravity: e.target.checked } : c
                                );
                                updateGameObject(selectedObj.id, { components: updated });
                              }}
                            />
                            {' '}Gravity
                          </label>
                        </div>
                      </>
                    )}

                    {component.type === 'Script' && (
                      <div className="propertyGroup">
                        <button
                          className="editScriptBtn"
                          onClick={() => openScriptEditor(selectedObj.id)}
                        >
                          📝 Edit Script Code
                        </button>
                        {component.code && (
                          <div className="scriptPreview">
                            <code>{component.code.slice(0, 100)}...</code>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Component Buttons */}
                <div className="addComponentSection">
                  <p className="componentSectionTitle">Add Component</p>
                  <div className="componentButtonGrid">
                    <button 
                      className="componentBtn"
                      onClick={() => addComponent(selectedObj.id, 'Rectangle')}
                      title="Add Rectangle Shape"
                    >
                      ▭ Rectangle
                    </button>
                    <button 
                      className="componentBtn"
                      onClick={() => addComponent(selectedObj.id, 'Circle')}
                      title="Add Circle Shape"
                    >
                      ● Circle
                    </button>
                    <button 
                      className="componentBtn"
                      onClick={() => addComponent(selectedObj.id, 'Sprite')}
                      title="Add Sprite (Image)"
                    >
                      🖼️ Sprite
                    </button>
                    <button 
                      className="componentBtn"
                      onClick={() => addComponent(selectedObj.id, 'Area')}
                      title="Add Area (Collision Detection)"
                    >
                      ▢ Area
                    </button>
                    <button 
                      className="componentBtn"
                      onClick={() => addComponent(selectedObj.id, 'Physics')}
                      title="Add Physics (Gravity, Velocity)"
                    >
                      ⚡ Physics
                    </button>
                    <button 
                      className="componentBtn"
                      onClick={() => addComponent(selectedObj.id, 'Script')}
                      title="Add Script Component"
                    >
                      📜 Script
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Game Console (always visible, permanent like GameMaker) */}
      {gameConsoleOutput.length > 0 && (
        <div className="gameConsole">
          <div className="consoleHeader">
            <span>Output</span>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button 
                className="consoleClearBtn"
                onClick={() => setGameConsoleOutput([])}
                title="Clear Console"
              >
                Clear
              </button>
              {isGameRunning && (
                <button 
                  className="consoleCloseBtn"
                  onClick={handleStopGame}
                  title="Stop Game"
                >
                  Stop
                </button>
              )}
            </div>
          </div>
          <div className="consoleOutput">
            {gameConsoleOutput.map((line, idx) => (
              <div key={idx} className="consoleLine">{line}</div>
            ))}
            <div ref={consoleEndRef} />
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="contextMenu"
          style={{ 
            position: 'fixed', 
            left: contextMenu.x, 
            top: contextMenu.y,
            zIndex: 10000 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="contextMenuItem" onClick={() => {
            const obj = gameObjects.find(o => o.id === contextMenu.objectId);
            if (obj) {
              const newName = prompt('Rename node:', obj.name);
              if (newName && newName.trim()) {
                updateGameObject(obj.id, { name: newName.trim() });
              }
            }
            setContextMenu(null);
          }}>
            <span>Rename</span>
            <span className="contextShortcut">F2</span>
          </div>
          
          <div className="contextMenuItem" onClick={() => {
            const obj = gameObjects.find(o => o.id === contextMenu.objectId);
            if (obj) {
              // Duplicate object
              const newObj = {
                ...obj,
                id: `obj_${Date.now()}`,
                name: `${obj.name}_copy`,
                transform: {
                  ...obj.transform,
                  x: obj.transform.x + 20,
                  y: obj.transform.y + 20
                }
              };
              setGameObjects(normalizeGameObjects([...gameObjects, newObj]));
            }
            setContextMenu(null);
          }}>
            <span>Duplicate</span>
            <span className="contextShortcut">Ctrl+D</span>
          </div>
          
          <div className="contextMenuSeparator"></div>
          
          <div 
            className="contextMenuItem" 
            onMouseEnter={() => setShowComponentMenu(true)}
            onMouseLeave={() => setShowComponentMenu(false)}
            style={{ position: 'relative' }}
          >
            <span>Add Component</span>
            <span style={{ marginLeft: 'auto', fontSize: '10px' }}>▶</span>
            
            {showComponentMenu && (
              <div className="contextSubmenu">
                <div className="contextMenuItem" onClick={() => {
                  addComponent(contextMenu.objectId, 'Shape');
                  setContextMenu(null);
                  setShowComponentMenu(false);
                }}>
                  <span>Shape (Rectangle)</span>
                </div>
                <div className="contextMenuItem" onClick={() => {
                  addComponent(contextMenu.objectId, 'Circle');
                  setContextMenu(null);
                  setShowComponentMenu(false);
                }}>
                  <span>Shape (Circle)</span>
                </div>
                <div className="contextMenuItem" onClick={() => {
                  addComponent(contextMenu.objectId, 'Sprite');
                  setContextMenu(null);
                  setShowComponentMenu(false);
                }}>
                  <span>Sprite</span>
                </div>
                <div className="contextMenuItem" onClick={() => {
                  addComponent(contextMenu.objectId, 'Physics');
                  setContextMenu(null);
                  setShowComponentMenu(false);
                }}>
                  <span>Physics</span>
                </div>
                <div className="contextMenuItem" onClick={() => {
                  openScriptEditor(contextMenu.objectId);
                  setContextMenu(null);
                  setShowComponentMenu(false);
                }}>
                  <span>Script</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="contextMenuSeparator"></div>
          
          <div className="contextMenuItem danger" onClick={() => {
            if (confirm('Delete this node?')) {
              deleteGameObject(contextMenu.objectId);
            }
            setContextMenu(null);
          }}>
            <span>Delete</span>
            <span className="contextShortcut">Del</span>
          </div>
        </div>
      )}

      {/* Script Editor Modal */}
      <ScriptEditor
        isOpen={scriptEditorOpen}
        onClose={() => setScriptEditorOpen(false)}
        onSave={saveScriptCode}
        scriptName={editingScript ? gameObjects.find(o => o.id === editingScript.objectId)?.name || 'Script' : 'Script'}
        initialCode={editingScript?.scriptCode || ''}
      />
    </div>
  );
}
