import type { EditorState, Scene, SceneObject } from '../types';
import './SceneView.css';

interface SceneViewProps {
  scene: Scene;
  editorState: EditorState;
  selectedObjectId: string | null;
  onObjectSelect: (id: string | null) => void;
  onObjectUpdate: (id: string, updates: Partial<SceneObject>) => void;
}

export function SceneView({ 
  scene, 
  editorState, 
  selectedObjectId, 
  onObjectSelect,
  onObjectUpdate 
}: SceneViewProps) {
  const isPlaying = editorState.mode === 'play';

  return (
    <div className="scene-view">
      <div className="scene-view-header">
        <span>Scene: {scene.name} {isPlaying && '▶️ PLAYING'}</span>
        <span className="scene-view-info">{scene.width} × {scene.height}</span>
      </div>

      <div className="scene-view-canvas-container">
        <div 
          className="scene-view-canvas"
          style={{
            width: scene.width,
            height: scene.height,
            backgroundColor: scene.backgroundColor,
          }}
        >
          {/* Grid */}
          {editorState.showGrid && !isPlaying && (
            <div className="scene-grid">
              <div className="scene-grid-label">Grid: {editorState.gridSize}px</div>
            </div>
          )}

          {/* Objects */}
          {scene.objects.map(obj => (
            <div
              key={obj.id}
              className={`scene-object ${selectedObjectId === obj.id ? 'selected' : ''}`}
              style={{
                position: 'absolute',
                left: obj.transform.x,
                top: obj.transform.y,
                transform: `translate(-50%, -50%) scale(${obj.transform.scaleX}, ${obj.transform.scaleY})`,
                cursor: 'pointer',
              }}
              onClick={() => onObjectSelect(obj.id)}
            >
              {obj.type === 'rect' ? (
                <div
                  className="scene-rect"
                  style={{
                    width: obj.components.find(c => c.type === 'rect')?.properties.width || 50,
                    height: obj.components.find(c => c.type === 'rect')?.properties.height || 50,
                    backgroundColor: obj.components.find(c => c.type === 'rect')?.properties.color || '#6495ed',
                  }}
                />
              ) : (
                <div
                  className="scene-circle"
                  style={{
                    width: (obj.components.find(c => c.type === 'circle')?.properties.radius || 25) * 2,
                    height: (obj.components.find(c => c.type === 'circle')?.properties.radius || 25) * 2,
                    backgroundColor: obj.components.find(c => c.type === 'circle')?.properties.color || '#ff6464',
                  }}
                />
              )}
              <div className="scene-object-label">{obj.name}</div>
            </div>
          ))}

          {!isPlaying && scene.objects.length === 0 && (
            <div className="scene-empty">
              <p>💡 Use Hierarchy panel to add objects</p>
            </div>
          )}
        </div>
      </div>

      <div className="scene-view-footer">
        <span>Objects: {scene.objects.length}</span>
        <span>Selected: {selectedObjectId ? `#${selectedObjectId.substring(4, 10)}` : 'None'}</span>
      </div>
    </div>
  );
}





