import { useEffect, useState } from 'react';
import { scanProjects, type GameProject } from '../api/serverApi';
import type { Project } from '../types';
import './ProjectManager.css';

interface ProjectManagerProps {
  onCreateProject: () => void;
  onQuickStart: (project: Project) => void;
}

export function ProjectManager({ onCreateProject, onQuickStart }: ProjectManagerProps) {
  const [projectName, setProjectName] = useState('MyGame');
  const [scanPath, setScanPath] = useState('C:\\Users\\mcken\\Documents\\devgame');
  const [recentProjects, setRecentProjects] = useState<GameProject[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [showRecents, setShowRecents] = useState(false);

  useEffect(() => {
    // Auto-scan on mount
    handleScanProjects();
  }, []);

  const handleScanProjects = async () => {
    setIsScanning(true);
    try {
      const result = await scanProjects(scanPath);
      if (result.success && result.projects) {
        setRecentProjects(result.projects);
        setShowRecents(result.projects.length > 0);
      } else {
        console.error('Failed to scan:', result.error);
      }
    } catch (error) {
      console.error('Error scanning:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleOpenProject = (proj: GameProject) => {
    const project: Project = {
      id: `proj_${Date.now()}`,
      name: proj.name,
      path: proj.path,
      scene: {
        name: 'Main Scene',
        width: 800,
        height: 600,
        backgroundColor: '#2a2a2a',
        objects: [],
      },
    };
    onQuickStart(project);
  };

  const handleQuickStartClick = () => {
    // Open editor without creating files
    const project: Project = {
      id: `proj_${Date.now()}`,
      name: projectName,
      path: `./${projectName.toLowerCase().replace(/\s+/g, '-')}`,
      scene: {
        name: 'Main Scene',
        width: 800,
        height: 600,
        backgroundColor: '#2a2a2a',
        objects: [],
      },
    };
    onQuickStart(project);
  };

  return (
    <div className="project-manager">
      <div className="project-manager-header">
        <h1>🎮 ReGame Engine</h1>
      </div>

      <div className="project-manager-grid">
        {/* Create New Project */}
        <div className="project-card">
          <div className="project-card-icon">📁</div>
          <h2>Create New Project</h2>
          <button 
            className="project-card-btn primary" 
            onClick={onCreateProject}
          >
            Create Project
          </button>
        </div>

        {/* Recent Projects */}
        <div className="project-card recent-card">
          <div className="project-card-header">
            <div>
              <div className="project-card-icon-small">📂</div>
              <h2>Recent Projects</h2>
            </div>
            <button 
              className="scan-btn"
              onClick={handleScanProjects} 
              disabled={isScanning}
              title={scanPath}
            >
              {isScanning ? '⏳' : '🔍'}
            </button>
          </div>

          {showRecents && recentProjects.length > 0 ? (
            <div className="recent-list">
              {recentProjects.slice(0, 8).map((proj) => (
                <div 
                  key={proj.path} 
                  className="recent-item"
                  onClick={() => handleOpenProject(proj)}
                >
                  <div className="recent-icon">
                    {proj.hasEngine ? '🎮' : '📁'}
                  </div>
                  <div className="recent-info">
                    <div className="recent-name">{proj.name}</div>
                    <div className="recent-time">
                      {formatTimeAgo(proj.lastModified)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="recent-empty">
              {isScanning ? '⏳ Scanning...' : 'No projects found'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}
