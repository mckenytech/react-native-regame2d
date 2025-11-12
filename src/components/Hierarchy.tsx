import type { SceneObject } from '../types';
import './Hierarchy.css';

interface HierarchyProps {
  objects: SceneObject[];
  selectedObjectId: string | null;
  onObjectSelect: (id: string | null) => void;
  onObjectDelete: (id: string) => void;
  onObjectAdd: (object: SceneObject) => void;
}

export function Hierarchy({ 
  objects, 
  selectedObjectId, 
  onObjectSelect,
  onObjectDelete,
  onObjectAdd 
}: HierarchyProps) {
  const handleAddRect = () => {
    const newObject: SceneObject = {
      id: `obj_${Date.now()}`,
      name: `Rectangle ${objects.length + 1}`,
      type: 'rect',
      transform: { x: 200, y: 200, scaleX: 1, scaleY: 1, rotation: 0 },
      components: [
        { type: 'rect', properties: { width: 50, height: 50, color: '#6495ed' } },
      ],
      tags: [],
    };
    onObjectAdd(newObject);
  };

  const handleAddCircle = () => {
    const newObject: SceneObject = {
      id: `obj_${Date.now()}`,
      name: `Circle ${objects.length + 1}`,
      type: 'circle',
      transform: { x: 250, y: 250, scaleX: 1, scaleY: 1, rotation: 0 },
      components: [
        { type: 'circle', properties: { radius: 25, color: '#ff6464' } },
      ],
      tags: [],
    };
    onObjectAdd(newObject);
  };

  return (
    <div className="hierarchy">
      <div className="hierarchy-header">
        <h3>Hierarchy</h3>
      </div>

      <div className="hierarchy-add-buttons">
        <button onClick={handleAddRect}>+ Rect</button>
        <button onClick={handleAddCircle}>+ Circle</button>
      </div>

      <div className="hierarchy-list">
        {objects.map(obj => (
          <div
            key={obj.id}
            className={`hierarchy-item ${obj.id === selectedObjectId ? 'selected' : ''}`}
            onClick={() => onObjectSelect(obj.id)}
          >
            <div className="hierarchy-item-left">
              <span className="hierarchy-item-icon">
                {obj.type === 'circle' ? '⭕' : '🟦'}
              </span>
              <div>
                <div className="hierarchy-item-name">{obj.name}</div>
                <div className="hierarchy-item-type">{obj.type}</div>
              </div>
            </div>
            <button
              className="hierarchy-item-delete"
              onClick={(e) => {
                e.stopPropagation();
                onObjectDelete(obj.id);
              }}
            >
              🗑️
            </button>
          </div>
        ))}

        {objects.length === 0 && (
          <div className="hierarchy-empty">
            <p>No objects in scene</p>
            <small>Click + buttons to add objects</small>
          </div>
        )}
      </div>
    </div>
  );
}





