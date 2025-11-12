import { useEffect, useState } from 'react';
import { checkServerStatus, createProject, installDependencies, runProject } from '../api/serverApi';
import type { Project } from '../types';
import './ProjectCreator.css';

interface ProjectCreatorProps {
  onProjectReady: (project: Project, projectPath: string) => void;
  onBack: () => void;
}

type Step = 'setup' | 'creating' | 'installing' | 'ready' | 'running';

export function ProjectCreator({ onProjectReady, onBack }: ProjectCreatorProps) {
  const [projectName, setProjectName] = useState('MyGame');
  const [projectPath, setProjectPath] = useState('');
  const [step, setStep] = useState<Step>('setup');
  const [output, setOutput] = useState<string[]>([]);
  const [serverOnline, setServerOnline] = useState(false);
  const [fullProjectPath, setFullProjectPath] = useState('');

  useEffect(() => {
    checkServerStatus().then(setServerOnline);
  }, []);

  // Note: Browser File System Access API doesn't expose full paths for security
  // Users must type the full path manually

  const handleCreateProject = async () => {
    const trimmedName = projectName.trim();
    const trimmedPath = projectPath.trim();
    
    if (!trimmedName || !trimmedPath) {
      alert('Please enter project name and path');
      return;
    }

    try {
      // Step 1: Create project files
      setStep('creating');
      setOutput([]);
      addOutput('📁 Creating project files...');
      addOutput(`   Name: ${trimmedName}`);
      addOutput(`   Path: ${trimmedPath}`);
      
      const result = await createProject({
        projectName: trimmedName,
        projectPath: trimmedPath
      });

      if (!result.success) {
        addOutput(`\n❌ Error: ${result.error}`);
        addOutput(`\n💡 Troubleshooting:`);
        addOutput(`   1. Make sure the folder exists: ${trimmedPath}`);
        addOutput(`   2. Create it first: mkdir "${trimmedPath}"`);
        addOutput(`   3. Check for typos in the path`);
        addOutput(`\n⬅️ Click "Back" to try again`);
        // Don't reset to setup - stay on error screen
        return;
      }

      addOutput(`✅ Project files created successfully!`);
      addOutput(`📁 Location: ${result.path}`);
      addOutput(`\n💡 You can find your project at:`);
      addOutput(`   ${result.path}`);
      setFullProjectPath(result.path!);

      // Step 2: Install dependencies
      setStep('installing');
      addOutput('\n📦 Installing dependencies (this may take a few minutes)...');

       await installDependencies(result.path!, (message, type) => {
        if (type === 'output') {
          addOutput(message);
        } else if (type === 'error') {
          addOutput(`⚠️ ${message}`);
        } else if (type === 'complete') {
          addOutput('\n✅ Dependencies installed successfully!');
          addOutput('\n🎨 Opening editor...');
          
          // Immediately open the editor after installation
          const project: Project = {
            id: `proj_${Date.now()}`,
            name: projectName,
            path: result.path!,
            scene: {
              name: 'Main Scene',
              width: 800,
              height: 600,
              backgroundColor: '#2a2a2a',
              objects: [],
            },
          };
          
          setTimeout(() => onProjectReady(project, result.path!), 1000);
        }
      });

    } catch (error: any) {
      addOutput(`❌ Error: ${error.message}`);
    }
  };

  const handleRun = async (platform: 'start' | 'android' | 'ios' | 'web') => {
    setStep('running');
    setOutput([]);
    addOutput(`🚀 Starting ${platform === 'start' ? 'development server' : platform}...`);

    try {
      await runProject(fullProjectPath, platform, (message, type) => {
        if (message) addOutput(message);
        
        // Detect when server is ready
        if (message.includes('Metro') || message.includes('Expo')) {
          addOutput('\n✅ Development server is running!');
          
          // Now open the editor with this project
          const project: Project = {
            id: `proj_${Date.now()}`,
            name: projectName,
            path: fullProjectPath,
            scene: {
              name: 'Main Scene',
              width: 800,
              height: 600,
              backgroundColor: '#2a2a2a',
              objects: [],
            },
          };
          
          setTimeout(() => onProjectReady(project, fullProjectPath), 2000);
        }
      });
    } catch (error: any) {
      addOutput(`❌ Error: ${error.message}`);
    }
  };

  const addOutput = (message: string) => {
    setOutput(prev => [...prev, message]);
  };

  if (!serverOnline) {
    return (
      <div className="project-creator">
        <div className="project-creator-container">
          <div className="project-creator-error">
            <h2>⚠️ Server Not Running</h2>
            <p>The local development server is not running.</p>
            <div className="project-creator-instructions">
              <p>Please start the server:</p>
              <pre>cd editor/editor-web/server
npm install
npm start</pre>
            </div>
            <button className="btn-secondary" onClick={onBack}>
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }


  if (step === 'creating' || step === 'installing') {
    const hasError = output.some(line => line.includes('❌'));
    
    return (
      <div className="project-creator">
        <div className="project-creator-container">
          <h1>
            {hasError ? '❌ Error Creating Project' : 
             step === 'creating' ? '⏳ Creating Project...' : '📦 Installing Dependencies...'}
          </h1>
          <div className="project-creator-output">
            {output.map((line, i) => (
              <div key={i} className="output-line">{line}</div>
            ))}
          </div>
          {!hasError && <div className="project-creator-spinner"></div>}
          {hasError && (
            <button className="btn-secondary" onClick={() => {
              setStep('setup');
              setOutput([]);
            }}>
              ← Back to Setup
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="project-creator">
      <div className="project-creator-container">
        <h1>📁 Create New Project</h1>
        
        <div className="project-creator-form">
          <div className="form-group">
            <label>Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="MyAwesomeGame"
            />
          </div>

          <div className="form-group">
            <label>Project Location (Full Path)</label>
            <input
              type="text"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              placeholder="C:\Users\YourName\Documents\Games"
              style={{ width: '100%' }}
            />
            <small>⚠️ Type the FULL path where you want to create the project folder</small>
            <small>Example: C:\Users\mcken\Documents\devgame</small>
            <small>The project folder "{projectName}" will be created inside this location</small>
          </div>

          <button 
            className="btn-primary" 
            onClick={handleCreateProject}
            disabled={!projectName || !projectPath}
          >
            ✨ Create Project
          </button>

          <button className="btn-secondary" onClick={onBack}>
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}

