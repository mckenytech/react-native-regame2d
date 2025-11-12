import { useState } from 'react';
import './App.css';
import { EditorLayout } from './components/EditorLayout';
import { ProjectCreator } from './components/ProjectCreator';
import { ProjectManager } from './components/ProjectManager';
import type { Project } from './types';

type AppMode = 'menu' | 'create' | 'editor';

function App() {
  const [mode, setMode] = useState<AppMode>('menu');
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentProjectPath, setCurrentProjectPath] = useState<string>('');

  const handleProjectReady = (project: Project, projectPath: string) => {
    setCurrentProject(project);
    setCurrentProjectPath(projectPath);
    setMode('editor');
  };

  const handleQuickStart = (project: Project) => {
    setCurrentProject(project);
    setMode('editor');
  };

  if (mode === 'menu') {
    return (
      <ProjectManager
        onCreateProject={() => setMode('create')}
        onQuickStart={handleQuickStart}
      />
    );
  }

  if (mode === 'create') {
    return (
      <ProjectCreator
        onProjectReady={handleProjectReady}
        onBack={() => setMode('menu')}
      />
    );
  }

  return (
    <div className="app-container">
      <EditorLayout 
        project={currentProject!}
        projectPath={currentProjectPath}
        onProjectClose={() => {
          setCurrentProject(null);
          setMode('menu');
        }}
      />
    </div>
  );
}

export default App;
