import { useEffect, useState } from 'react';
import { runProject, saveScene } from '../api/serverApi';
import type { EditorState, Project, SceneObject } from '../types';
import './EditorLayout.css';
import { Hierarchy } from './Hierarchy';
import { Inspector } from './Inspector';
import { SceneView } from './SceneView';
import { Toolbar } from './Toolbar';

interface EditorLayoutProps {
  project: Project;
  projectPath?: string;
  onProjectClose: () => void;
}

export function EditorLayout({ project, projectPath, onProjectClose }: EditorLayoutProps) {
  const [editorState, setEditorState] = useState<EditorState>({
    mode: 'edit',
    selectedObjectId: null,
    showGrid: true,
    gridSize: 20,
  });

  const [currentProject, setCurrentProject] = useState<Project>(project);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<string[]>([]);

  const handleObjectAdd = (object: SceneObject) => {
    setCurrentProject(prev => ({
      ...prev,
      scene: {
        ...prev.scene,
        objects: [...prev.scene.objects, object],
      },
    }));
  };

  const handleObjectUpdate = (id: string, updates: Partial<SceneObject>) => {
    setCurrentProject(prev => ({
      ...prev,
      scene: {
        ...prev.scene,
        objects: prev.scene.objects.map(obj =>
          obj.id === id ? { ...obj, ...updates } : obj
        ),
      },
    }));
  };

  const handleObjectDelete = (id: string) => {
    setCurrentProject(prev => ({
      ...prev,
      scene: {
        ...prev.scene,
        objects: prev.scene.objects.filter(obj => obj.id !== id),
      },
    }));
    setEditorState(prev => ({
      ...prev,
      selectedObjectId: prev.selectedObjectId === id ? null : prev.selectedObjectId,
    }));
  };

  const generateGameCode = (): string => {
    const { scene } = currentProject;
    
    let code = `import { Game, pos, rect, circle, body, area } from './engine';

export default function App() {
  return (
    <Game showGamePad>
      {(ctx) => {
`;

    scene.objects.forEach(obj => {
      const components = [`pos(${obj.transform.x}, ${obj.transform.y})`];
      
      const shapeComp = obj.components.find(c => c.type === obj.type);
      if (obj.type === 'rect' && shapeComp) {
        const { width, height, color: objColor } = shapeComp.properties;
        components.push(`rect(${width}, ${height}, '${objColor}')`);
      } else if (obj.type === 'circle' && shapeComp) {
        const { radius, color: objColor } = shapeComp.properties;
        components.push(`circle(${radius}, '${objColor}')`);
      }
      
      if (obj.tags.length > 0) {
        obj.tags.forEach(tag => components.push(`"${tag}"`));
      }
      
      code += `        const ${sanitizeVarName(obj.name)} = ctx.add([
          ${components.join(',\n          ')}
        ]);

`;
    });

    code += `        // Add your game logic here
      }}
    </Game>
  );
}
`;

    return code;
  };

  const handleSave = async () => {
    if (!projectPath) return;
    
    setIsSaving(true);
    try {
      const code = generateGameCode();
      const result = await saveScene(projectPath, code);
      
      if (result.success) {
        console.log('✅ Scene saved to App.js');
      } else {
        alert(`Failed to save: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error saving: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRun = async (platform: 'start' | 'android' | 'ios' | 'web') => {
    if (!projectPath) return;
    
    // Save first
    await handleSave();
    
    setIsRunning(true);
    setRunOutput([`🚀 Starting ${platform}...`]);
    
    try {
      await runProject(projectPath, platform, (message, type) => {
        setRunOutput(prev => [...prev, message]);
        
        if (message.includes('Metro') || message.includes('Expo') || message.includes('QR')) {
          setRunOutput(prev => [...prev, '\n✅ Project is running!']);
        }
      });
    } catch (error: any) {
      setRunOutput(prev => [...prev, `❌ Error: ${error.message}`]);
    }
  };

  // Auto-save when objects change (if we have a real project)
  useEffect(() => {
    if (projectPath && currentProject.scene.objects.length > 0) {
      const debounceTimer = setTimeout(() => {
        handleSave();
      }, 1000); // Save 1 second after changes stop
      
      return () => clearTimeout(debounceTimer);
    }
  }, [currentProject.scene.objects, projectPath]);

  const handleObjectSelect = (id: string | null) => {
    setEditorState(prev => ({ ...prev, selectedObjectId: id }));
  };

  const selectedObject = currentProject.scene.objects.find(
    obj => obj.id === editorState.selectedObjectId
  );

  return (
    <div className="editor-layout">
      <Toolbar
        project={currentProject}
        projectPath={projectPath}
        mode={editorState.mode}
        onModeChange={(mode) => setEditorState(prev => ({ ...prev, mode }))}
        onProjectClose={onProjectClose}
        onRun={projectPath ? handleRun : undefined}
        onSave={projectPath ? handleSave : undefined}
      />
      
      <div className="editor-content">
        <div className="editor-panel editor-panel-left">
          <Hierarchy
            objects={currentProject.scene.objects}
            selectedObjectId={editorState.selectedObjectId}
            onObjectSelect={handleObjectSelect}
            onObjectDelete={handleObjectDelete}
            onObjectAdd={handleObjectAdd}
          />
        </div>

        <div className="editor-panel editor-panel-center">
          <SceneView
            scene={currentProject.scene}
            editorState={editorState}
            selectedObjectId={editorState.selectedObjectId}
            onObjectSelect={handleObjectSelect}
            onObjectUpdate={handleObjectUpdate}
          />
        </div>

        <div className="editor-panel editor-panel-right">
          <Inspector
            selectedObject={selectedObject}
            onObjectUpdate={handleObjectUpdate}
          />
        </div>
      </div>

      {/* Run Output Modal */}
      {isRunning && runOutput.length > 0 && (
        <div className="run-output-modal">
          <div className="run-output-content">
            <div className="run-output-header">
              <h3>Running Project...</h3>
              <button onClick={() => setIsRunning(false)}>✕</button>
            </div>
            <div className="run-output-body">
              {runOutput.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function sanitizeVarName(name: string): string {
  return name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_') || 'object';
}
