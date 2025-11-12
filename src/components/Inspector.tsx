import type { SceneObject } from '../types';
import './Inspector.css';

interface InspectorProps {
  selectedObject: SceneObject | undefined;
  onObjectUpdate: (id: string, updates: Partial<SceneObject>) => void;
}

export function Inspector({ selectedObject, onObjectUpdate }: InspectorProps) {
  if (!selectedObject) {
    return (
      <div className="inspector">
        <div className="inspector-header">
          <h3>Inspector</h3>
        </div>
        <div className="inspector-empty">
          <p>No object selected</p>
          <small>Select an object from Hierarchy or Scene</small>
        </div>
      </div>
    );
  }

  const handleNameChange = (name: string) => {
    onObjectUpdate(selectedObject.id, { name });
  };

  const handleTransformChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    onObjectUpdate(selectedObject.id, {
      transform: {
        ...selectedObject.transform,
        [field]: numValue,
      },
    });
  };

  const handleComponentPropertyChange = (componentType: string, property: string, value: any) => {
    const updatedComponents = selectedObject.components.map(comp =>
      comp.type === componentType
        ? { ...comp, properties: { ...comp.properties, [property]: value } }
        : comp
    );
    onObjectUpdate(selectedObject.id, { components: updatedComponents });
  };

  return (
    <div className="inspector">
      <div className="inspector-header">
        <h3>Inspector</h3>
      </div>

      <div className="inspector-content">
        {/* Object */}
        <div className="inspector-section">
          <div className="inspector-section-title">Object</div>
          <div className="inspector-property">
            <label>Name</label>
            <input
              type="text"
              value={selectedObject.name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>
          <div className="inspector-property">
            <label>Type</label>
            <span>{selectedObject.type}</span>
          </div>
        </div>

        {/* Transform */}
        <div className="inspector-section">
          <div className="inspector-section-title">Transform</div>
          <div className="inspector-property">
            <label>X</label>
            <input
              type="number"
              value={selectedObject.transform.x}
              onChange={(e) => handleTransformChange('x', e.target.value)}
            />
          </div>
          <div className="inspector-property">
            <label>Y</label>
            <input
              type="number"
              value={selectedObject.transform.y}
              onChange={(e) => handleTransformChange('y', e.target.value)}
            />
          </div>
          <div className="inspector-property">
            <label>Scale X</label>
            <input
              type="number"
              step="0.1"
              value={selectedObject.transform.scaleX}
              onChange={(e) => handleTransformChange('scaleX', e.target.value)}
            />
          </div>
          <div className="inspector-property">
            <label>Scale Y</label>
            <input
              type="number"
              step="0.1"
              value={selectedObject.transform.scaleY}
              onChange={(e) => handleTransformChange('scaleY', e.target.value)}
            />
          </div>
        </div>

        {/* Components */}
        {selectedObject.components.map((comp, index) => (
          <div key={`${comp.type}-${index}`} className="inspector-section">
            <div className="inspector-section-title">Component: {comp.type}</div>
            {Object.entries(comp.properties).map(([key, value]) => (
              <div key={key} className="inspector-property">
                <label>{key}</label>
                <input
                  type={typeof value === 'number' ? 'number' : key === 'color' ? 'color' : 'text'}
                  value={value}
                  onChange={(e) => handleComponentPropertyChange(comp.type, key, e.target.value)}
                />
              </div>
            ))}
          </div>
        ))}

        {/* Tags */}
        <div className="inspector-section">
          <div className="inspector-section-title">Tags</div>
          <div className="inspector-tags">
            {selectedObject.tags.length > 0 ? selectedObject.tags.join(', ') : 'No tags'}
          </div>
        </div>
      </div>
    </div>
  );
}





