import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EditorState, Scene, SceneObject } from '../types';
import './SceneView.css';

interface SceneViewProps {
  scene: Scene;
  editorState: EditorState;
  selectedObjectId: string | null;
  onObjectSelect: (id: string | null) => void;
  onObjectUpdate: (id: string, updates: Partial<SceneObject>) => void;
  onScriptDrop?: (objectId: string, scriptPath: string) => void;
}

export function SceneView({ 
  scene, 
  editorState, 
  selectedObjectId, 
  onObjectSelect,
  onObjectUpdate,
  onScriptDrop 
}: SceneViewProps) {
  const isPlaying = editorState.mode === 'play';
  const [dragOverObjectId, setDragOverObjectId] = useState<string | null>(null);

  // Editor camera
  const [cameraPos, setCameraPos] = useState<{ x: number; y: number }>({ x: -scene.width / 2, y: -scene.height / 2 });
  const [cameraZoom, setCameraZoom] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isSpacePressedRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Canvas size (world drawing surface)
  const canvasSize = useMemo(() => {
    return {
      width: Math.max(scene.width * 4, 4000),
      height: Math.max(scene.height * 4, 4000),
    };
  }, [scene.width, scene.height]);

  // Helpers
  const worldToScreen = useCallback((worldX: number, worldY: number) => {
    return {
      x: (worldX - cameraPos.x) * cameraZoom,
      y: (worldY - cameraPos.y) * cameraZoom,
    };
  }, [cameraPos.x, cameraPos.y, cameraZoom]);

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    return {
      x: screenX / cameraZoom + cameraPos.x,
      y: screenY / cameraZoom + cameraPos.y,
    };
  }, [cameraPos.x, cameraPos.y, cameraZoom]);

  // Initialize (and keep) camera so that (0,0) starts in the center of the visible area,
  // and center the scroll position on the middle of the big canvas.
  useEffect(() => {
    const el = containerRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;

    const centerCamera = () => {
      const w = el.clientWidth || el.getBoundingClientRect().width || 0;
      const h = el.clientHeight || el.getBoundingClientRect().height || 0;
      setCameraPos({ x: -w / (2 * cameraZoom), y: -h / (2 * cameraZoom) });

      // Center scroll to show the canvas middle (so we can pan to left/top as well)
      const midX = canvas.offsetWidth / 2 - w / 2;
      const midY = canvas.offsetHeight / 2 - h / 2;
      el.scrollLeft = Math.max(0, midX);
      el.scrollTop = Math.max(0, midY);
    };

    // Wait a frame for layout, then center
    const raf = requestAnimationFrame(centerCamera);

    const onResize = () => centerCamera();
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [cameraZoom]);

  // Mouse / keyboard handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle mouse or right mouse, or space+left
    if (e.button === 1 || e.button === 2 || (e.button === 0 && isSpacePressedRef.current)) {
      isPanningRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanningRef.current || !lastMouseRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    // Convert screen delta back to world space
    setCameraPos(prev => ({
      x: prev.x - dx / cameraZoom,
      y: prev.y - dy / cameraZoom,
    }));
  }, [cameraZoom]);

  const endPan = useCallback(() => {
    isPanningRef.current = false;
    lastMouseRef.current = null;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    // Zoom about cursor
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldBefore = screenToWorld(mouseX, mouseY);
    const delta = Math.sign(e.deltaY) * -0.1;
    const nextZoom = Math.min(4, Math.max(0.25, cameraZoom + delta));
    setCameraZoom(nextZoom);

    // Keep world point under cursor stable
    const worldAfter = worldBefore; // same world target
    const screenAfterX = (worldAfter.x - cameraPos.x) * nextZoom;
    const screenAfterY = (worldAfter.y - cameraPos.y) * nextZoom;
    const dxScreen = mouseX - screenAfterX;
    const dyScreen = mouseY - screenAfterY;
    setCameraPos(prev => ({
      x: prev.x - dxScreen / nextZoom,
      y: prev.y - dyScreen / nextZoom,
    }));
  }, [cameraZoom, cameraPos.x, cameraPos.y, screenToWorld]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') isSpacePressedRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') isSpacePressedRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Helper to extract script path from drag event
  const extractScriptPath = useCallback((event: React.DragEvent) => {
    if (!event?.dataTransfer) return null;
    const assetPath = 
      event.dataTransfer.getData('application/regame-asset') ||
      event.dataTransfer.getData('text/plain');
    if (!assetPath) return null;
    // Check if it's a script file (ends with .js)
    if (assetPath.endsWith('.js')) {
      return assetPath;
    }
    return null;
  }, []);

  // Handle drag events on objects
  const handleObjectDragOver = useCallback((event: React.DragEvent, objectId: string) => {
    const scriptPath = extractScriptPath(event);
    if (scriptPath && onScriptDrop) {
      event.preventDefault();
      event.stopPropagation();
      setDragOverObjectId(objectId);
    }
  }, [extractScriptPath, onScriptDrop]);

  const handleObjectDrop = useCallback((event: React.DragEvent, objectId: string) => {
    const scriptPath = extractScriptPath(event);
    if (scriptPath && onScriptDrop) {
      event.preventDefault();
      event.stopPropagation();
      setDragOverObjectId(null);
      onScriptDrop(objectId, scriptPath);
    }
  }, [extractScriptPath, onScriptDrop]);

  const handleObjectDragLeave = useCallback(() => {
    setDragOverObjectId(null);
  }, []);

  // Precompute screen-space for objects
  const objectsScreen = useMemo(() => {
    return scene.objects.map(obj => {
      const p = worldToScreen(obj.transform.x, obj.transform.y);
      return { obj, screenX: p.x, screenY: p.y };
    });
  }, [scene.objects, worldToScreen]);

  return (
    <div className="scene-view">
      <div className="scene-view-header">
        <span>Scene: {scene.name} {isPlaying && '▶️ PLAYING'}</span>
        <span className="scene-view-info">Viewport: {scene.width} × {scene.height} | Zoom {cameraZoom.toFixed(2)}x</span>
      </div>

      <div
        ref={containerRef}
        className="scene-view-canvas-container"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endPan}
        onMouseLeave={endPan}
        onWheel={onWheel}
      >
        {/* Large infinite-ish world canvas (use big min size) */}
        <div
          ref={canvasRef}
          className="scene-view-canvas"
          style={{
            width: canvasSize.width,
            height: canvasSize.height,
            backgroundColor: scene.backgroundColor,
          }}
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const world = screenToWorld(sx, sy);
            // hit test (simple bbox around each object in world space)
            for (let i = scene.objects.length - 1; i >= 0; i--) {
              const o = scene.objects[i];
              const isRect = o.type === 'rect';
              if (isRect) {
                const rectComp = o.components.find(c => c.type === 'rect');
                const w = rectComp?.properties.width || 50;
                const h = rectComp?.properties.height || 50;
                const minX = o.transform.x - w / 2;
                const minY = o.transform.y - h / 2;
                const maxX = minX + w;
                const maxY = minY + h;
                if (world.x >= minX && world.x <= maxX && world.y >= minY && world.y <= maxY) {
                  onObjectSelect(o.id);
                  return;
                }
              } else {
                const circleComp = o.components.find(c => c.type === 'circle');
                const r = circleComp?.properties.radius || 25;
                const dx = world.x - o.transform.x;
                const dy = world.y - o.transform.y;
                if (dx * dx + dy * dy <= r * r) {
                  onObjectSelect(o.id);
                  return;
                }
              }
            }
            onObjectSelect(null);
          }}
        >
          {/* World content positioned via camera (we already baked camera in to screen coords) */}

          {/* Camera frame (visual only) at world (0,0) */}
          {!isPlaying && (
            <div
              className="camera-frame"
              style={{
                position: 'absolute',
                left: worldToScreen(0, 0).x,
                top: worldToScreen(0, 0).y,
                width: scene.width * cameraZoom,
                height: scene.height * cameraZoom,
                transform: 'translate(-50%, -50%)',
              }}
            />
          )}

          {/* Objects */}
          {objectsScreen.map(({ obj, screenX, screenY }) => (
            <div
              key={obj.id}
              className={`scene-object ${selectedObjectId === obj.id ? 'selected' : ''} ${dragOverObjectId === obj.id ? 'drag-over' : ''}`}
              style={{
                position: 'absolute',
                left: screenX,
                top: screenY,
                transform: `translate(-50%, -50%) scale(${obj.transform.scaleX * cameraZoom}, ${obj.transform.scaleY * cameraZoom})`,
                cursor: 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onObjectSelect(obj.id);
              }}
              onDragOver={(e) => handleObjectDragOver(e, obj.id)}
              onDrop={(e) => handleObjectDrop(e, obj.id)}
              onDragLeave={handleObjectDragLeave}
            >
              {obj.type === 'rect' ? (
                <div
                  className="scene-rect"
                  style={{
                    width: (obj.components.find(c => c.type === 'rect')?.properties.width || 50) * cameraZoom,
                    height: (obj.components.find(c => c.type === 'rect')?.properties.height || 50) * cameraZoom,
                    backgroundColor: obj.components.find(c => c.type === 'rect')?.properties.color || '#6495ed',
                  }}
                />
              ) : (
                <div
                  className="scene-circle"
                  style={{
                    width: ((obj.components.find(c => c.type === 'circle')?.properties.radius || 25) * 2) * cameraZoom,
                    height: ((obj.components.find(c => c.type === 'circle')?.properties.radius || 25) * 2) * cameraZoom,
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





