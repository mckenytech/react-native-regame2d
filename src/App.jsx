import React, { useCallback, useEffect, useRef, useState } from 'react';
import './App-compact.css';
import ScriptEditor from './components/ScriptEditor';
import { generateSceneCode } from './utils/codeGenerator';

const DEFAULT_SCRIPT_TEMPLATE_OPTIONS = {
  includeReady: true,
  includeUpdate: true,
  references: [],
};

const MIN_CANVAS_ZOOM = 0.25;
const MAX_CANVAS_ZOOM = 3;
const CANVAS_ZOOM_STEP = 0.2;

function InputModalComponent({ title, message, defaultValue, onConfirm, onCancel }) {
  const inputRef = useRef(null);
  const [value, setValue] = useState(defaultValue ?? '');

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  useEffect(() => {
    setValue(defaultValue ?? '');
  }, [defaultValue]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onConfirm(value);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="modalOverlay" onClick={onCancel}>
      <div className="inputModal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h3 className="modalTitle">{title}</h3>
        </div>
        <div className="modalBody">
          <p className="modalMessage">{message}</p>
          <input
            ref={inputRef}
            type="text"
            className="modalInput"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="modalFooter">
          <button className="modalButton modalButtonCancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="modalButton modalButtonConfirm"
            onClick={() => onConfirm(value)}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

function ScriptTemplateModalComponent({ scriptName, onConfirm, onCancel }) {
  const [references, setReferences] = useState('');

  const handleSubmit = () => {
    const refs = references
      .split(',')
      .map((ref) => ref.trim())
      .filter((ref) => ref.length > 0);
    onConfirm({
      includeReady: true,
      includeUpdate: true,
      references: refs,
    });
  };

  return (
    <div className="modalOverlay" onClick={onCancel}>
      <div className="inputModal scriptTemplateModal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h3 className="modalTitle">Create GameObject Script</h3>
          <div className="modalSubtitle">{scriptName}</div>
        </div>
        <div className="modalBody">
          <div className="modalSection">
            <label className="modalLabel">Lifecycle hooks</label>
            <div className="modalCheckboxRow">
              <label className="modalCheckbox">
                <input type="checkbox" checked readOnly />
                <span>ready()</span>
              </label>
              <label className="modalCheckbox">
                <input type="checkbox" checked readOnly />
                <span>update(dt)</span>
              </label>
            </div>
            <div className="modalHelp">
              Both hooks are included automatically. We'll stub them out in the script file.
            </div>
          </div>
          <div className="modalSection">
            <label className="modalLabel">Reference tags (optional)</label>
            <input
              type="text"
              className="modalInput"
              value={references}
              placeholder="walls_1, enemy, platform"
              onChange={(e) => setReferences(e.target.value)}
            />
            <div className="modalHelp">
              We'll generate <code>let</code> declarations plus <code>ctx.get(tag)</code> calls in ready()/update().
            </div>
          </div>
        </div>
        <div className="modalFooter">
          <button className="modalButton modalButtonCancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="modalButton modalButtonConfirm" onClick={handleSubmit}>
            Create Script
          </button>
        </div>
      </div>
    </div>
  );
}

function AddObjectModal({ onSelect, onCancel }) {
  const options = [
    {
      id: 'rect',
      label: 'Rectangle',
      description: 'Solid colored block',
      icon: '▭',
    },
    {
      id: 'circle',
      label: 'Circle',
      description: 'Simple circle shape',
      icon: '⚪',
    },
    {
      id: 'text',
      label: 'Text',
      description: 'Text label',
      icon: '📝',
    },
    {
      id: 'sprite',
      label: 'Sprite',
      description: 'Draw or import pixel art',
      icon: '🖼️',
    },
    {
      id: 'empty',
      label: 'Empty',
      description: 'Placeholder node',
      icon: '⬚',
    },
  ];

  return (
    <div className="modalOverlay" onClick={onCancel}>
      <div className="inputModal addObjectModal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h3 className="modalTitle">Add Game Object</h3>
          <p className="modalSubtitle">Choose what type of object to insert</p>
        </div>
        <div className="modalBody addObjectBody">
          {options.map((option) => (
            <button
              key={option.id}
              className="addObjectOption"
              onClick={() => onSelect(option.id)}
            >
              <span className="addObjectIcon">{option.icon}</span>
              <span className="addObjectContent">
                <span className="addObjectLabel">{option.label}</span>
                <span className="addObjectDescription">{option.description}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="modalFooter">
          <button className="modalButton modalButtonCancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const SPRITE_EDITOR_DEFAULT_COLORS = ['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff'];

const hexToRgba = (hex) => {
  if (!hex) return [0, 0, 0, 0];
  let normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }
  if (normalized.length === 6) {
    normalized += 'ff';
  }
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const a = parseInt(normalized.slice(6, 8), 16);
  return [r, g, b, a];
};

const rgbaToHex = (r, g, b, a = 255) => {
  const toHex = (value) => value.toString(16).padStart(2, '0');
  if (a === 255) {
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`;
};

const pixelsMatch = (data, index, color) => {
  return (
    data[index] === color[0] &&
    data[index + 1] === color[1] &&
    data[index + 2] === color[2] &&
    data[index + 3] === color[3]
  );
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function SpriteEditorModal({
  isOpen,
  defaultName,
  defaultWidth = 32,
  defaultHeight = 32,
  onSave,
  onCancel,
}) {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const shapeStartRef = useRef(null);
  const snapshotRef = useRef(null);
  const lastPosRef = useRef(null);
  const [name, setName] = useState(defaultName ?? 'Sprite');
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(1);
  const [activeTool, setActiveTool] = useState('brush');
  const [isDrawing, setIsDrawing] = useState(false);
  const [recentColors, setRecentColors] = useState([...SPRITE_EDITOR_DEFAULT_COLORS]);
  const [spriteWidth, setSpriteWidth] = useState(defaultWidth);
  const [spriteHeight, setSpriteHeight] = useState(defaultHeight);
  const pixelScale = Math.max(4, Math.min(24, Math.floor(512 / Math.max(spriteWidth, spriteHeight)) || 16));

  const selectColor = useCallback((color) => {
    if (!color) return;
    const normalized = color.startsWith('#') ? color.toLowerCase() : `#${color.toLowerCase()}`;
    setBrushColor(normalized);
    setRecentColors((prev) => {
      const filtered = prev.filter((c) => c.toLowerCase() !== normalized);
      return [normalized, ...filtered].slice(0, 12);
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setName(defaultName ?? 'Sprite');
    setBrushSize(1);
    setActiveTool('brush');
    setRecentColors(() => [...SPRITE_EDITOR_DEFAULT_COLORS]);
    setBrushColor('#ffffff');
    setSpriteWidth(defaultWidth);
    setSpriteHeight(defaultHeight);
    shapeStartRef.current = null;
    snapshotRef.current = null;
    lastPosRef.current = null;
  }, [isOpen, defaultName, defaultWidth, defaultHeight]);

  const resizeCanvas = useCallback((newWidth, newHeight, preserve = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.width === newWidth && canvas.height === newHeight) return;
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let imageBitmap = null;
    if (preserve && oldWidth > 0 && oldHeight > 0) {
      const offscreen = document.createElement('canvas');
      offscreen.width = oldWidth;
      offscreen.height = oldHeight;
      const offCtx = offscreen.getContext('2d');
      if (offCtx) {
        const imageData = ctx.getImageData(0, 0, oldWidth, oldHeight);
        offCtx.putImageData(imageData, 0, 0);
        imageBitmap = offscreen;
      }
    }

    canvas.width = newWidth;
    canvas.height = newHeight;
    const nextCtx = canvas.getContext('2d');
    if (!nextCtx) return;
    nextCtx.clearRect(0, 0, newWidth, newHeight);
    nextCtx.imageSmoothingEnabled = false;

    if (imageBitmap) {
      nextCtx.drawImage(
        imageBitmap,
        0,
        0,
        imageBitmap.width,
        imageBitmap.height,
        0,
        0,
        newWidth,
        newHeight,
      );
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    resizeCanvas(defaultWidth, defaultHeight, false);
  }, [isOpen, defaultWidth, defaultHeight, resizeCanvas]);

  useEffect(() => {
    if (!isOpen) return;
    resizeCanvas(spriteWidth, spriteHeight, true);
  }, [spriteWidth, spriteHeight, isOpen, resizeCanvas]);

  const getCanvasPos = useCallback(
    (event) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((event.clientX - rect.left) / pixelScale);
      const y = Math.floor((event.clientY - rect.top) / pixelScale);
      return {
        x: clamp(x, 0, spriteWidth - 1),
        y: clamp(y, 0, spriteHeight - 1),
      };
    },
    [spriteWidth, spriteHeight, pixelScale]
  );

  const drawBrushStroke = useCallback(
    (pos) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const clampedWidth = Math.min(brushSize, spriteWidth - pos.x);
      const clampedHeight = Math.min(brushSize, spriteHeight - pos.y);
      ctx.fillStyle = brushColor;
      ctx.fillRect(pos.x, pos.y, clampedWidth, clampedHeight);
    },
    [brushColor, brushSize, spriteWidth, spriteHeight]
  );

  const eraseStroke = useCallback(
    (pos) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const clampedWidth = Math.min(brushSize, spriteWidth - pos.x);
      const clampedHeight = Math.min(brushSize, spriteHeight - pos.y);
      ctx.clearRect(pos.x, pos.y, clampedWidth, clampedHeight);
    },
    [brushSize, spriteWidth, spriteHeight]
  );

  const drawRectangleShape = (ctx, start, end, color) => {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x) + 1;
    const h = Math.abs(end.y - start.y) + 1;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  const drawCircleShape = (ctx, start, end, color) => {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    const radius = Math.max(maxX - minX, maxY - minY) / 2;
    const centerX = minX + (maxX - minX) / 2;
    const centerY = minY + (maxY - minY) / 2;
    const startX = Math.floor(Math.max(0, minX));
    const endX = Math.floor(Math.min(spriteWidth - 1, maxX));
    const startY = Math.floor(Math.max(0, minY));
    const endY = Math.floor(Math.min(spriteHeight - 1, maxY));
    ctx.fillStyle = color;
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const dist = Math.hypot(x + 0.5 - centerX, y + 0.5 - centerY);
        if (dist <= radius) {
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  };

  const bucketFill = useCallback(
    (startPos) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const startIndex = (startPos.y * width + startPos.x) * 4;
      const targetColor = [
        data[startIndex],
        data[startIndex + 1],
        data[startIndex + 2],
        data[startIndex + 3],
      ];
      const replacement = hexToRgba(brushColor);
      if (
        targetColor[0] === replacement[0] &&
        targetColor[1] === replacement[1] &&
        targetColor[2] === replacement[2] &&
        targetColor[3] === replacement[3]
      ) {
        return;
      }

      const stack = [[startPos.x, startPos.y]];
      while (stack.length > 0) {
        const [x, y] = stack.pop();
        if (x < 0 || y < 0 || x >= spriteWidth || y >= spriteHeight) continue;
        const idx = (y * spriteWidth + x) * 4;
        if (!pixelsMatch(data, idx, targetColor)) continue;

        data[idx] = replacement[0];
        data[idx + 1] = replacement[1];
        data[idx + 2] = replacement[2];
        data[idx + 3] = replacement[3];

        stack.push([x + 1, y]);
        stack.push([x - 1, y]);
        stack.push([x, y + 1]);
        stack.push([x, y - 1]);
      }

      ctx.putImageData(imageData, 0, 0);
    },
    [brushColor, spriteWidth, spriteHeight]
  );

  const tools = [
    { id: 'brush', label: 'Brush', icon: '✏️' },
    { id: 'eraser', label: 'Eraser', icon: '🧽' },
    { id: 'rectangle', label: 'Rectangle', icon: '▭' },
    { id: 'circle', label: 'Circle', icon: '⚪' },
    { id: 'fill', label: 'Fill', icon: '🪣' },
    { id: 'eyedropper', label: 'Eyedropper', icon: '🎯' },
  ];

  const getContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  };

  const handleMouseDown = (event) => {
    event.preventDefault();
    const ctx = getContext();
    if (!ctx) return;
    const pos = getCanvasPos(event);

    if (activeTool === 'fill') {
      setIsDrawing(false);
      bucketFill(pos);
      return;
    }

    if (activeTool === 'eyedropper') {
      setIsDrawing(false);
      const pixel = ctx.getImageData(pos.x, pos.y, 1, 1).data;
      selectColor(rgbaToHex(pixel[0], pixel[1], pixel[2], pixel[3]));
      setActiveTool('brush');
      return;
    }

    setIsDrawing(true);
    lastPosRef.current = pos;

    if (activeTool === 'rectangle' || activeTool === 'circle') {
      shapeStartRef.current = pos;
      snapshotRef.current = ctx.getImageData(0, 0, width, height);
      return;
    }

    if (activeTool === 'eraser') {
      eraseStroke(pos);
    } else {
      drawBrushStroke(pos);
    }
  };

  const handleMouseMove = (event) => {
    if (!isDrawing) return;
    const ctx = getContext();
    if (!ctx) return;
    const pos = getCanvasPos(event);

    if (activeTool === 'rectangle' || activeTool === 'circle') {
      if (!shapeStartRef.current || !snapshotRef.current) return;
      ctx.putImageData(snapshotRef.current, 0, 0);
      if (activeTool === 'rectangle') {
        drawRectangleShape(ctx, shapeStartRef.current, pos, brushColor);
      } else {
        drawCircleShape(ctx, shapeStartRef.current, pos, brushColor);
      }
      return;
    }

    if (activeTool === 'eraser') {
      eraseStroke(pos);
    } else {
      drawBrushStroke(pos);
    }
    lastPosRef.current = pos;
  };

  const handleMouseUp = (event) => {
    const ctx = getContext();
    if (ctx && (activeTool === 'rectangle' || activeTool === 'circle') && snapshotRef.current && shapeStartRef.current) {
      const pos = event ? getCanvasPos(event) : shapeStartRef.current;
      ctx.putImageData(snapshotRef.current, 0, 0);
      if (activeTool === 'rectangle') {
        drawRectangleShape(ctx, shapeStartRef.current, pos, brushColor);
      } else {
        drawCircleShape(ctx, shapeStartRef.current, pos, brushColor);
      }
    }
    setIsDrawing(false);
    shapeStartRef.current = null;
    snapshotRef.current = null;
    lastPosRef.current = null;
  };

  const handleClear = () => {
    const ctx = getContext();
    if (!ctx) return;
    ctx.clearRect(0, 0, spriteWidth, spriteHeight);
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const img = new Image();
      img.onload = () => {
        const ctx = getContext();
        if (!ctx) return;
        ctx.clearRect(0, 0, spriteWidth, spriteHeight);
        const scale = Math.min(spriteWidth / img.width, spriteHeight / img.height);
        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        const offsetX = (spriteWidth - drawWidth) / 2;
        const offsetY = (spriteHeight - drawHeight) / 2;
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      };
      img.src = loadEvent.target?.result || '';
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const trimmedName = name.trim() || 'Sprite';
    const dataUrl = canvas.toDataURL('image/png');
    onSave({
      name: trimmedName,
      width: spriteWidth,
      height: spriteHeight,
      dataUrl,
    });
  };

  const handleBrushColorChange = (color) => {
    selectColor(color);
    setActiveTool('brush');
  };

  const handleBrushSizeChange = (value) => {
    const next = clamp(Number(value) || 1, 1, 16);
    setBrushSize(next);
  };

  if (!isOpen) return null;

  return (
    <div className="modalOverlay" onClick={onCancel}>
      <div className="spriteEditorModal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h3 className="modalTitle">Sprite Editor</h3>
          <p className="modalSubtitle">Draw pixel art or import an image</p>
        </div>
        <div className="modalBody spriteEditorBody">
          <div className="spriteEditorSidebar">
            <label className="modalLabel">Sprite Name</label>
            <input
              className="modalInput"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <div className="spriteEditorControls">
              <label className="modalLabel">Brush Color</label>
              <input
                type="color"
                value={brushColor}
                onChange={(e) => handleBrushColorChange(e.target.value)}
              />

              {recentColors.length > 0 && (
                <>
                  <span className="modalLabel">Recent Colors</span>
                  <div className="spriteEditorRecent">
                    {recentColors.map((color) => {
                      const isActive = color.toLowerCase() === brushColor.toLowerCase();
                      const isTransparent = color.length === 9 && color.slice(7, 9) === '00';
                      return (
                        <button
                          key={color}
                          type="button"
                          className={`spriteRecentSwatch${isActive ? ' active' : ''}`}
                          data-transparent={isTransparent}
                          style={{
                            backgroundColor: color,
                          }}
                          onClick={() => {
                            selectColor(color);
                            setActiveTool('brush');
                          }}
                          title={color.toUpperCase()}
                        />
                      );
                    })}
                  </div>
                </>
              )}

              <label className="modalLabel">Brush Size</label>
              <div className="spriteEditorBrushControls">
                <input
                  type="range"
                  min={1}
                  max={16}
                  value={brushSize}
                  onChange={(e) => handleBrushSizeChange(e.target.value)}
                />
                <span className="spriteEditorBrushValue">{brushSize}px</span>
              </div>

              <div className="spriteEditorToolSection">
                <span className="modalLabel">Tools</span>
                <div className="spriteEditorToolRow">
                  {tools.map((tool) => (
                    <button
                      key={tool.id}
                      type="button"
                      className={`spriteToolButton${activeTool === tool.id ? ' active' : ''}`}
                      onClick={() => setActiveTool(tool.id)}
                    >
                      <span className="spriteToolIcon">{tool.icon}</span>
                      {tool.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="spriteEditorSizeSection">
                <span className="modalLabel">Sprite Size</span>
                <div className="spriteEditorSizeGrid">
                  <label>
                    W
                    <input
                      type="number"
                      min={4}
                      max={256}
                      value={spriteWidth}
                      onChange={(e) => {
                        const next = clamp(parseInt(e.target.value, 10) || 1, 4, 256);
                        setSpriteWidth(next);
                      }}
                    />
                  </label>
                  <label>
                    H
                    <input
                      type="number"
                      min={4}
                      max={256}
                      value={spriteHeight}
                      onChange={(e) => {
                        const next = clamp(parseInt(e.target.value, 10) || 1, 4, 256);
                        setSpriteHeight(next);
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="spriteEditorButtons">
                <button className="modalButton" type="button" onClick={() => fileInputRef.current?.click()}>
                  Import Image
                </button>
                <button className="modalButton" type="button" onClick={handleClear}>
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="spriteEditorCanvasWrapper">
            <canvas
              ref={canvasRef}
              className="spriteEditorCanvas"
              width={spriteWidth}
              height={spriteHeight}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ width: spriteWidth * pixelScale, height: spriteHeight * pixelScale }}
            />
            <div className="spriteEditorDimensions">
              {spriteWidth} × {spriteHeight}
            </div>
          </div>
        </div>
        <div className="modalFooter spriteEditorFooter">
          <button className="modalButton modalButtonCancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="modalButton modalButtonConfirm" onClick={handleSave}>
            Save Sprite
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImport}
        />
      </div>
    </div>
  );
}

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
  const sceneCanvasRef = useRef(null);
  const previousToolRef = useRef(null);
  
  // Editor state
  const [gameObjects, setGameObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  // Game running state
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [runMode, setRunMode] = useState('dev-build'); // 'dev-build' or 'soft'
  const [gameConsoleOutput, setGameConsoleOutput] = useState([]);
  const [showPlatformDialog, setShowPlatformDialog] = useState(false);
  const [showDeviceDialog, setShowDeviceDialog] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const externalRunWarningShown = useRef(false);
  
  // Scene tools
  const [activeTool, setActiveTool] = useState('move');
  const [isResizing, setIsResizing] = useState(false);
  const resizeStateRef = useRef(null);
  const [isRotating, setIsRotating] = useState(false);
  const rotateStateRef = useRef(null);
  
  // Scene management
  const [availableScenes, setAvailableScenes] = useState(['MainScene']);
  const [currentSceneName, setCurrentSceneName] = useState('MainScene');
  
  // Script editor
  const [scriptEditorOpen, setScriptEditorOpen] = useState(false);
  const [editingScript, setEditingScript] = useState(null); // { objectId, scriptCode }
  
  // Context menu
  const [contextMenu, setContextMenu] = useState(null); // { x, y, objectId }
  const [showComponentMenu, setShowComponentMenu] = useState(false);
  const [showAddNodeMenu, setShowAddNodeMenu] = useState(false);
  
  // Inspector section collapse state
  const [expandedSections, setExpandedSections] = useState(new Set(['transform', 'name']));
  const [draggedObjectId, setDraggedObjectId] = useState(null);
  const [dragOverObjectId, setDragOverObjectId] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  
  // File explorer state
  const [fileTree, setFileTree] = useState([]);
  const [expandedFileNodes, setExpandedFileNodes] = useState(new Set());
  const [selectedFilePath, setSelectedFilePath] = useState(null);
  
  // Input modal state
  const [inputModal, setInputModal] = useState(null); // { title, message, defaultValue, onConfirm, onCancel }
  const [scriptTemplateModal, setScriptTemplateModal] = useState(null); // { scriptName, resolve }
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [addObjectModalOpen, setAddObjectModalOpen] = useState(false);
  const [spriteEditorState, setSpriteEditorState] = useState({
    open: false,
    initialName: 'Sprite',
    initialWidth: 32,
    initialHeight: 32,
  });

  const clampZoom = useCallback(
    (value) => Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, value)),
    []
  );

  const updateZoom = useCallback(
    (direction, focusPoint = null) => {
      const canvas = sceneCanvasRef.current;
      const factor = direction === 'in' ? 1 + CANVAS_ZOOM_STEP : 1 / (1 + CANVAS_ZOOM_STEP);
      setCanvasZoom((prevZoom) => {
        const nextZoom = clampZoom(parseFloat((prevZoom * factor).toFixed(4)));
        if (nextZoom === prevZoom) {
          return prevZoom;
        }
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const focus =
            focusPoint ?? {
              x: (canvas.scrollLeft + rect.width / 2) / prevZoom,
              y: (canvas.scrollTop + rect.height / 2) / prevZoom,
            };
          requestAnimationFrame(() => {
            canvas.scrollLeft = focus.x * nextZoom - rect.width / 2;
            canvas.scrollTop = focus.y * nextZoom - rect.height / 2;
          });
        }
        return nextZoom;
      });
    },
    [clampZoom]
  );

  const handleZoomIn = useCallback(() => updateZoom('in'), [updateZoom]);
  const handleZoomOut = useCallback(() => updateZoom('out'), [updateZoom]);

  const handleZoomReset = useCallback(() => {
    const canvas = sceneCanvasRef.current;
    if (!canvas) {
      setCanvasZoom(1);
      return;
    }
    const rect = canvas.getBoundingClientRect();
    setCanvasZoom((prevZoom) => {
      if (prevZoom === 1) {
        return prevZoom;
      }
      const focus = {
        x: (canvas.scrollLeft + rect.width / 2) / prevZoom,
        y: (canvas.scrollTop + rect.height / 2) / prevZoom,
      };
      requestAnimationFrame(() => {
        canvas.scrollLeft = focus.x - rect.width / 2;
        canvas.scrollTop = focus.y - rect.height / 2;
      });
      return 1;
    });
  }, [sceneCanvasRef]);

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  useEffect(() => {
    setExpandedNodes((prev) => {
      if (gameObjects.length === 0) {
        return new Set();
      }
      if (prev.size === 0 && gameObjects.length > 0) {
        return new Set(gameObjects.map((obj) => obj.id));
      }
      return prev;
    });
  }, [gameObjects]);

  // Input modal helper - replaces prompt()
  const showInputModal = (title, message, defaultValue = '') => {
    return new Promise((resolve) => {
      setInputModal({
        title,
        message,
        defaultValue,
        onConfirm: (value) => {
          setInputModal(null);
          resolve(value);
        },
        onCancel: () => {
          setInputModal(null);
          resolve(null);
        },
      });
    });
  };

  const showScriptTemplateModal = (scriptName) => {
    return new Promise((resolve) => {
      setScriptTemplateModal({
        scriptName,
        resolve,
      });
    });
  };
  
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

  const selectedObj = selectedObject ? findObjectById(gameObjects, selectedObject) : null;

  const handleSpriteEditorClose = useCallback(() => {
    setSpriteEditorState({
      open: false,
      initialName: 'Sprite',
      initialWidth: 32,
      initialHeight: 32,
    });
  }, []);

  const handleSpriteEditorSave = useCallback(
    async ({ name, width, height, dataUrl }) => {
      let imagePath = '';
      let previewDataUrl = dataUrl;

      if (currentProject?.path && window.electronAPI?.saveSpriteAsset) {
        try {
          const saveResult = await window.electronAPI.saveSpriteAsset({
            projectPath: currentProject.path,
            name,
            dataUrl,
          });
          if (saveResult?.success) {
            imagePath = saveResult.imagePath;
            if (saveResult.previewDataUrl) {
              previewDataUrl = saveResult.previewDataUrl;
            }
          } else if (saveResult?.message) {
            console.warn('Failed to save sprite asset:', saveResult.message);
          }
        } catch (error) {
          console.error('Failed to save sprite asset:', error);
        }
      }

      const id = generateObjectId();
      const spriteObject = normalizeGameObjects([
        {
          id,
          name,
          type: 'sprite',
          transform: {
            x: 10, // Top-left of viewport
            y: 10,
            width,
            height,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
          },
          components: [
            {
              type: 'Sprite',
              properties: {
                name,
                imagePath,
                dataUrl: previewDataUrl,
                previewDataUrl,
                width,
                height,
                originX: 0, // Top-left anchor by default
                originY: 0,
              },
            },
          ],
          tags: [],
          visible: true,
          children: [],
        },
      ])[0];

      setGameObjects((prev) =>
        normalizeGameObjects([...prev, {
          ...spriteObject,
          components: spriteObject.components.map((component) =>
            component.type === 'Sprite'
              ? {
                  ...component,
                  properties: {
                    ...component.properties,
                    width,
                    height,
                    previewDataUrl,
                  },
                }
              : component
          ),
        }])
      );
      setExpandedNodes((prev) => {
        const next = new Set(prev);
        next.add(spriteObject.id);
        return next;
      });
      setSelectedObject(spriteObject.id);
      handleSpriteEditorClose();
    },
    [currentProject?.path, viewportWidth, viewportHeight, handleSpriteEditorClose]
  );

  const flatGameObjects = flattenGameObjects(gameObjects);

  // Determine scene canvas bounds - allow scrolling in all directions (including negative coords)
  const workspacePadding = 2000; // Large padding to allow panning in all directions
  const renderableObjects = flatGameObjects.filter((obj) => obj.visible !== false);

  // Calculate bounds including negative coordinates
  const minObjectLeft = flatGameObjects.reduce((min, obj) => {
    const x = obj?.transform?.x ?? 0;
    return Math.min(min, x);
  }, 0);
  const maxObjectRight = flatGameObjects.reduce((max, obj) => {
    const x = obj?.transform?.x ?? 0;
    const width = obj?.transform?.width ?? 0;
    return Math.max(max, x + width);
  }, 0);
  const minObjectTop = flatGameObjects.reduce((min, obj) => {
    const y = obj?.transform?.y ?? 0;
    return Math.min(min, y);
  }, 0);
  const maxObjectBottom = flatGameObjects.reduce((max, obj) => {
    const y = obj?.transform?.y ?? 0;
    const height = obj?.transform?.height ?? 0;
    return Math.max(max, y + height);
  }, 0);

  // Canvas content spans from min to max with padding on all sides
  // Center is at (0,0) in world space, but canvas origin is at top-left
  // Make canvas large enough to contain all objects with padding, centered on (0,0)
  // Ensure minimum size for scrolling in all directions (always at least 4000x4000)
  const objectRangeX = Math.max(2000, maxObjectRight - minObjectLeft, viewportWidth * 3);
  const objectRangeY = Math.max(2000, maxObjectBottom - minObjectTop, viewportHeight * 3);
  const canvasContentWidth = Math.max(4000, objectRangeX + workspacePadding * 2);
  const canvasContentHeight = Math.max(4000, objectRangeY + workspacePadding * 2);
  // Position world (0,0) in the middle of the canvas content
  const canvasCenterOffsetX = canvasContentWidth / 2;
  const canvasCenterOffsetY = canvasContentHeight / 2;

  const handleRecenter = useCallback(() => {
    const canvas = sceneCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // Center on world (0,0) which is at canvasCenterOffsetX, canvasCenterOffsetY
    const targetScrollLeft = canvasCenterOffsetX * canvasZoom - rect.width / 2;
    const targetScrollTop = canvasCenterOffsetY * canvasZoom - rect.height / 2;
    requestAnimationFrame(() => {
      canvas.scrollLeft = Math.max(0, targetScrollLeft);
      canvas.scrollTop = Math.max(0, targetScrollTop);
    });
  }, [canvasZoom, canvasCenterOffsetX, canvasCenterOffsetY]);

  // Center scroll position on mount so (0,0) is visible in the middle
  useEffect(() => {
    const canvas = sceneCanvasRef.current;
    if (!canvas) return;
    
    // Wait for layout to complete
    const centerScroll = () => {
      const rect = canvas.getBoundingClientRect();
      // Center on world (0,0) which is at canvasCenterOffsetX, canvasCenterOffsetY
      // Account for zoom
      const targetScrollLeft = canvasCenterOffsetX * canvasZoom - rect.width / 2;
      const targetScrollTop = canvasCenterOffsetY * canvasZoom - rect.height / 2;
      canvas.scrollLeft = Math.max(0, targetScrollLeft);
      canvas.scrollTop = Math.max(0, targetScrollTop);
    };
    
    // Try immediately and after a short delay to ensure layout is complete
    requestAnimationFrame(() => {
      centerScroll();
      setTimeout(centerScroll, 100);
    });
  }, [canvasZoom, canvasCenterOffsetX, canvasCenterOffsetY]);

  const getCanvasCoordinates = useCallback(
    (event) => {
      const canvas = sceneCanvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      // Convert screen coordinates to world coordinates
      // Screen coords include the offset, so subtract it to get world coords
      return {
        x: (event.clientX - rect.left + canvas.scrollLeft) / canvasZoom - canvasCenterOffsetX,
        y: (event.clientY - rect.top + canvas.scrollTop) / canvasZoom - canvasCenterOffsetY,
      };
    },
    [canvasZoom, canvasCenterOffsetX, canvasCenterOffsetY]
  );

  const handleCanvasWheel = useCallback(
    (event) => {
      if (!(event.ctrlKey || event.metaKey)) {
        return;
      }
      event.preventDefault();
      const focusPoint = getCanvasCoordinates(event);
      const direction = event.deltaY > 0 ? 'out' : 'in';
      updateZoom(direction, focusPoint);
    },
    [getCanvasCoordinates, updateZoom]
  );

  const handleResizePointerMove = useCallback((event) => {
    if (!resizeStateRef.current) return;
    event.preventDefault();

    const {
      objectId,
      handle,
      startX,
      startY,
      startWidth,
      startHeight,
      startMouseX,
      startMouseY,
    } = resizeStateRef.current;

    const { x: mouseX, y: mouseY } = getCanvasCoordinates(event);
    let deltaX = mouseX - startMouseX;
    let deltaY = mouseY - startMouseY;

    const MIN_SIZE = 8;
    
    // Get the current object to check its anchor and rotation
    const currentObj = gameObjects.find(obj => obj.id === objectId);
    const anchor = currentObj?.transform?.anchor || 'center';
    const rotation = currentObj?.transform?.rotation || 0;
    
    // If object is rotated, transform mouse delta from screen space to local space
    if (rotation && Math.abs(rotation) > 0.01) {
      const rad = -(rotation * Math.PI / 180); // Negative for inverse rotation
      const rotatedDeltaX = deltaX * Math.cos(rad) - deltaY * Math.sin(rad);
      const rotatedDeltaY = deltaX * Math.sin(rad) + deltaY * Math.cos(rad);
      deltaX = rotatedDeltaX;
      deltaY = rotatedDeltaY;
    }

    // Calculate anchor offset as fraction of width/height
    // For "topleft": anchorOffsetX=0, anchorOffsetY=0 (anchor at left/top edge)
    // For "center": anchorOffsetX=0.5, anchorOffsetY=0.5 (anchor at center)
    // For "botright": anchorOffsetX=1, anchorOffsetY=1 (anchor at right/bottom edge)
    const getAnchorOffsets = (anchor) => {
      switch (anchor) {
        case 'topleft': return { x: 0, y: 0 };
        case 'top': return { x: 0.5, y: 0 };
        case 'topright': return { x: 1, y: 0 };
        case 'left': return { x: 0, y: 0.5 };
        case 'center': return { x: 0.5, y: 0.5 };
        case 'right': return { x: 1, y: 0.5 };
        case 'botleft': return { x: 0, y: 1 };
        case 'bot': return { x: 0.5, y: 1 };
        case 'botright': return { x: 1, y: 1 };
        default: return { x: 0.5, y: 0.5 };
      }
    };

    const anchorOffsets = getAnchorOffsets(anchor);

    // Calculate the world position of the opposite corner/edge that should stay fixed
    // Opposite corner offset is (1 - anchorOffset) for each dimension
    let fixedPointX = startX;
    let fixedPointY = startY;

    if (handle.includes('w')) {
      // Dragging from west (left), so east (right) edge should stay fixed
      fixedPointX = startX + (1 - anchorOffsets.x) * startWidth;
    } else if (handle.includes('e')) {
      // Dragging from east (right), so west (left) edge should stay fixed
      fixedPointX = startX - anchorOffsets.x * startWidth;
    }

    if (handle.includes('n')) {
      // Dragging from north (top), so south (bottom) edge should stay fixed
      fixedPointY = startY + (1 - anchorOffsets.y) * startHeight;
    } else if (handle.includes('s')) {
      // Dragging from south (bottom), so north (top) edge should stay fixed
      fixedPointY = startY - anchorOffsets.y * startHeight;
    }

    // Calculate new size based on mouse delta
    let newWidth = startWidth;
    let newHeight = startHeight;

    if (handle.includes('e')) {
      newWidth = Math.max(MIN_SIZE, startWidth + deltaX);
    } else if (handle.includes('w')) {
      newWidth = Math.max(MIN_SIZE, startWidth - deltaX);
    }

    if (handle.includes('s')) {
      newHeight = Math.max(MIN_SIZE, startHeight + deltaY);
    } else if (handle.includes('n')) {
      newHeight = Math.max(MIN_SIZE, startHeight - deltaY);
    }

    // Calculate new anchor position to keep the fixed point at the same location
    let newX = startX;
    let newY = startY;

    // For rotated objects, keep the anchor point fixed (resize from anchor)
    // For non-rotated objects, keep the opposite edge/corner fixed
    if (!rotation || Math.abs(rotation) < 0.01) {
      if (handle.includes('w') || handle.includes('e')) {
        // Horizontal resize: calculate new anchor X to keep fixed point in place
        if (handle.includes('w')) {
          newX = fixedPointX - (1 - anchorOffsets.x) * newWidth;
        } else {
          newX = fixedPointX + anchorOffsets.x * newWidth;
        }
      }

      if (handle.includes('n') || handle.includes('s')) {
        // Vertical resize: calculate new anchor Y to keep fixed point in place
        if (handle.includes('n')) {
          newY = fixedPointY - (1 - anchorOffsets.y) * newHeight;
        } else {
          newY = fixedPointY + anchorOffsets.y * newHeight;
        }
      }
    }
    // else: keep newX = startX, newY = startY (anchor point stays fixed)

    setGameObjects((prev) =>
      prev.map((obj) =>
        obj.id === objectId
          ? {
              ...obj,
              transform: {
                ...obj.transform,
                x: Math.round(newX),
                y: Math.round(newY),
                width: Math.round(newWidth),
                height: Math.round(newHeight),
              },
            }
          : obj
      )
    );
  }, [getCanvasCoordinates]);

  const handleResizePointerUp = useCallback(() => {
    if (!resizeStateRef.current) return;
    resizeStateRef.current = null;
    setIsResizing(false);
    window.removeEventListener('mousemove', handleResizePointerMove);
    window.removeEventListener('mouseup', handleResizePointerUp);
    if (previousToolRef.current && previousToolRef.current !== 'resize') {
      setActiveTool(previousToolRef.current);
    }
    previousToolRef.current = null;
  }, [handleResizePointerMove, setActiveTool]);

  const handleResizeStart = useCallback((event, handle, object) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    const { x, y } = getCanvasCoordinates(event);
    resizeStateRef.current = {
      objectId: object.id,
      handle,
      startX: object.transform.x,
      startY: object.transform.y,
      startWidth: object.transform.width,
      startHeight: object.transform.height,
      startMouseX: x,
      startMouseY: y,
    };
    setSelectedObject(object.id);
    setIsDragging(false);
    if (activeTool !== 'resize') {
      previousToolRef.current = activeTool;
      setActiveTool('resize');
    } else {
      previousToolRef.current = null;
    }
    setIsResizing(true);
    window.addEventListener('mousemove', handleResizePointerMove);
    window.addEventListener('mouseup', handleResizePointerUp);
  }, [activeTool, getCanvasCoordinates, handleResizePointerMove, handleResizePointerUp, setActiveTool]);

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleResizePointerMove);
      window.removeEventListener('mouseup', handleResizePointerUp);
    };
  }, [handleResizePointerMove, handleResizePointerUp]);

  // Rotation handlers
  const handleRotatePointerMove = useCallback((event) => {
    if (!rotateStateRef.current) return;
    const { x, y } = getCanvasCoordinates(event);
    const { objectId, anchorX, anchorY, startAngle } = rotateStateRef.current;
    
    // Calculate angle from anchor point to mouse
    const dx = x - anchorX;
    const dy = y - anchorY;
    const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    // Calculate rotation delta
    const deltaAngle = currentAngle - startAngle;
    
    // Update object rotation
    setGameObjects((prev) =>
      updateObjectInTree(prev, objectId, (target) => ({
        ...target,
        transform: {
          ...target.transform,
          rotation: Math.round(rotateStateRef.current.startRotation + deltaAngle),
        },
      }))
    );
  }, [getCanvasCoordinates]);

  const handleRotatePointerUp = useCallback(() => {
    if (!rotateStateRef.current) return;
    rotateStateRef.current = null;
    setIsRotating(false);
    window.removeEventListener('mousemove', handleRotatePointerMove);
    window.removeEventListener('mouseup', handleRotatePointerUp);
    if (previousToolRef.current && previousToolRef.current !== 'rotate') {
      setActiveTool(previousToolRef.current);
    }
    previousToolRef.current = null;
  }, [handleRotatePointerMove, setActiveTool]);

  const handleRotateStart = useCallback((event, object) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    const { x, y } = getCanvasCoordinates(event);
    
    // Anchor point is transform.x/y
    const anchorX = object.transform.x;
    const anchorY = object.transform.y;
    
    // Calculate initial angle from anchor to mouse
    const dx = x - anchorX;
    const dy = y - anchorY;
    const startAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    rotateStateRef.current = {
      objectId: object.id,
      anchorX,
      anchorY,
      startAngle,
      startRotation: object.transform.rotation || 0,
    };
    setSelectedObject(object.id);
    setIsDragging(false);
    if (activeTool !== 'rotate') {
      previousToolRef.current = activeTool;
      setActiveTool('rotate');
    } else {
      previousToolRef.current = null;
    }
    setIsRotating(true);
    window.addEventListener('mousemove', handleRotatePointerMove);
    window.addEventListener('mouseup', handleRotatePointerUp);
  }, [activeTool, getCanvasCoordinates, handleRotatePointerMove, handleRotatePointerUp, setActiveTool]);

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleRotatePointerMove);
      window.removeEventListener('mouseup', handleRotatePointerUp);
    };
  }, [handleRotatePointerMove, handleRotatePointerUp]);

  useEffect(() => {
    if (activeTool !== 'resize' && isResizing) {
      handleResizePointerUp();
    }
  }, [activeTool, isResizing, handleResizePointerUp]);

  useEffect(() => {
    if (activeTool !== 'move' && isDragging) {
      setIsDragging(false);
    }
    if (activeTool !== 'rotate' && isRotating) {
      handleRotatePointerUp();
    }
  }, [activeTool, isDragging, isRotating, handleRotatePointerUp]);

  // Handle viewport preset change
  const handleViewportPresetChange = (preset) => {
    setViewportPreset(preset);
    const dimensions = viewportPresets[preset];
    if (dimensions) {
      setViewportWidth(dimensions.width);
      setViewportHeight(dimensions.height);
    }
  };

  const handleMoveObject = useCallback((objectId, direction) => {
    setGameObjects((prev) => {
      const path = findNodePath(prev, objectId);
      if (!path) return prev;
      const { parentId, index, siblings } = path;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= siblings.length) return prev;
      const targetId = siblings[targetIndex].id;
      const position = direction === 'up' ? 'before' : 'after';
      return normalizeGameObjects(moveObjectInTree(prev, objectId, targetId, position));
    });
  }, []);

  const reorderGameObjectsById = useCallback((sourceId, targetId, position = 'before') => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    setGameObjects((prev) => normalizeGameObjects(moveObjectInTree(prev, sourceId, targetId, position)));
  }, []);

  // Check if drag event contains a file asset (use during onDragOver)
  function isDraggingAssetFile(event) {
    if (!event?.dataTransfer) return false;
    const types = event.dataTransfer.types;
    return types.includes('application/regame-asset');
  }

  // Extract script path from drag event (use during onDrop)
  function extractScriptPathFromDragEvent(event) {
    if (!event?.dataTransfer) return null;
    const assetPath =
      event.dataTransfer.getData('application/regame-asset') ||
      event.dataTransfer.getData('text/plain');
    if (!assetPath) return null;
    const normalized = toForwardSlashPath(assetPath);
    const node = findNodeByPath(fileTree, normalized);
    if (node && node.type === 'file' && node.category === 'scripts') {
      return node.path;
    }
    return null;
  }

  const handleHierarchyDragStart = (event, objectId) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', objectId);
    setDraggedObjectId(objectId);
    setDragOverObjectId(null);
  };

  const handleHierarchyDragOver = (event, targetId) => {
    // Check if dragging a file asset (can't read data during dragOver)
    if (isDraggingAssetFile(event)) {
      event.preventDefault();
      setDragOverObjectId(targetId);
      return;
    }
    // Otherwise check if dragging a hierarchy object
    if (!draggedObjectId || draggedObjectId === targetId) return;
    event.preventDefault();
    setDragOverObjectId(targetId);
  };

  const handleHierarchyDragLeave = (targetId) => {
    if (dragOverObjectId === targetId) {
      setDragOverObjectId(null);
    }
  };

  const handleHierarchyDrop = (event, targetId) => {
    event.preventDefault();
    event.stopPropagation();
    const scriptPath = extractScriptPathFromDragEvent(event);
    if (scriptPath && targetId) {
      setDraggedObjectId(null);
      setDragOverObjectId(null);
      attachScriptToObjectFromPath(targetId, scriptPath);
      return;
    }
    if (!draggedObjectId || draggedObjectId === targetId) {
      setDraggedObjectId(null);
      setDragOverObjectId(null);
      return;
    }
    if (event.shiftKey || event.ctrlKey || event.altKey) {
      setGameObjects((prev) => {
        const { updated, removed } = removeObjectInTree(prev, draggedObjectId);
        if (!removed) return prev;
        const normalizedChild = normalizeGameObjects([removed])[0];
        return normalizeGameObjects(appendChildInTree(updated, targetId, normalizedChild));
      });
      if (targetId) {
        setExpandedNodes((prev) => {
          const next = new Set(prev);
          next.add(targetId);
          return next;
        });
      }
    } else {
      reorderGameObjectsById(draggedObjectId, targetId);
    }
    setDraggedObjectId(null);
    setDragOverObjectId(null);
  };

  const handleHierarchyDropRoot = (event) => {
    // Check if dropping a file asset
    if (isDraggingAssetFile(event)) {
      const scriptPath = extractScriptPathFromDragEvent(event);
      if (scriptPath) {
        event.preventDefault();
        event.stopPropagation();
        // Scripts can't be dropped on root, only on objects
        return;
      }
    }
    if (!draggedObjectId) return;
    event.preventDefault();
    setGameObjects((prev) => normalizeGameObjects(moveObjectInTree(prev, draggedObjectId, null, 'after')));
    setDraggedObjectId(null);
    setDragOverObjectId(null);
  };

  const handleHierarchyDragEnd = () => {
    setDraggedObjectId(null);
    setDragOverObjectId(null);
  };

  async function attachScriptToObjectFromPath(objectId, relativeScriptPath, options = {}) {
    if (!objectId || !relativeScriptPath) return false;
    const normalizedPath = toForwardSlashPath(relativeScriptPath);
    if (!normalizedPath) return false;

    const targetObject = findObjectById(gameObjects, objectId);
    if (!targetObject) return false;

    const { code: providedCode = '', scriptMeta = null, openEditor = false } = options;

    let scriptCode = providedCode;
    if (!scriptCode) {
      const scriptResult = await readScriptFile(normalizedPath);
      if (!scriptResult.success) {
        alert(`Failed to read script "${normalizedPath}": ${scriptResult.message || 'Unknown error.'}`);
        return false;
      }
      scriptCode = scriptResult.content;
    }

    setGameObjects((prev) =>
      updateObjectInTree(prev, objectId, (node) => {
        const nextComponents = [...node.components];
        const existingIndex = nextComponents.findIndex((component) => component.type === 'Script');
        const previous = existingIndex >= 0 ? nextComponents[existingIndex] : { enabled: true };
        const updatedComponent = {
          ...previous,
          type: 'Script',
          enabled: previous.enabled !== false,
          scriptPath: normalizedPath,
          code: scriptCode,
          scriptMeta: scriptMeta ?? previous.scriptMeta ?? null,
        };
        if (existingIndex >= 0) {
          nextComponents[existingIndex] = updatedComponent;
        } else {
          nextComponents.push(updatedComponent);
        }
        return {
          ...node,
          components: nextComponents,
        };
      })
    );

    setExpandedNodes((prev) => {
      const next = new Set(prev);
      next.add(objectId);
      return next;
    });

    if (normalizedPath) {
      setSelectedFilePath(normalizedPath);
    }

    if (openEditor) {
      await openScriptEditor(objectId);
    }

    return true;
  }

  async function createNewScriptForObject(objectId) {
    const obj = findObjectById(gameObjects, objectId);
    if (!obj) return false;

    const defaultStem = sanitizeFileStem(`${obj.name || 'Node'}Script`);

    if (!currentProject?.path) {
      const modalResult = await showScriptTemplateModal(obj.name || 'Script');
      const templateOptions = {
        ...DEFAULT_SCRIPT_TEMPLATE_OPTIONS,
        ...(modalResult || {}),
      };
      const template = SCRIPT_TEMPLATE(obj.name || 'Script', templateOptions);

      setGameObjects((prev) =>
        updateObjectInTree(prev, objectId, (node) => {
          const nextComponents = [...node.components];
          const existingIndex = nextComponents.findIndex((component) => component.type === 'Script');
          const previous = existingIndex >= 0 ? nextComponents[existingIndex] : { enabled: true };
          const updatedComponent = {
            ...previous,
            type: 'Script',
            enabled: previous.enabled !== false,
            scriptPath: '',
            code: template,
            scriptMeta: templateOptions,
          };
          if (existingIndex >= 0) {
            nextComponents[existingIndex] = updatedComponent;
          } else {
            nextComponents.push(updatedComponent);
          }
          return {
            ...node,
            components: nextComponents,
          };
        })
      );

      setExpandedNodes((prev) => {
        const next = new Set(prev);
        next.add(objectId);
        return next;
      });

      await openScriptEditor(objectId);
      return true;
    }

    const userInput = await showInputModal(
      'Create Script File',
      'Enter script file name (relative to scripts/). You can use folders like player/move:',
      defaultStem
    );

    if (userInput === null) {
      return false;
    }

    const sanitizedRelative = sanitizeRelativeScriptPath(userInput);
    const fileStem = sanitizedRelative || defaultStem;
    const fileName = fileStem.toLowerCase().endsWith('.js') ? fileStem : `${fileStem}.js`;
    const relativeScriptPath = toForwardSlashPath(`scripts/${fileName}`);
    const absoluteScriptPath = getAbsolutePathFromRelative(relativeScriptPath, currentProject.path);

    if (!absoluteScriptPath) {
      alert('Unable to resolve script path on disk.');
      return false;
    }

    const checkResult = await window.electronAPI.checkPath(absoluteScriptPath);
    if (checkResult.success && checkResult.exists) {
      const overwrite = confirm(`${relativeScriptPath} already exists. Overwrite the file?`);
      if (!overwrite) {
        return false;
      }
    }

    await ensureDirectoryForFile(absoluteScriptPath);

    const modalResult = await showScriptTemplateModal(obj.name || 'Script');
    const templateOptions = {
      ...DEFAULT_SCRIPT_TEMPLATE_OPTIONS,
      ...(modalResult || {}),
    };
    const template = SCRIPT_TEMPLATE(obj.name || 'Script', templateOptions);

    const saveResult = await window.electronAPI.saveFile(absoluteScriptPath, template);
    if (!saveResult.success) {
      alert(`Failed to save script: ${saveResult.message || 'Unknown error.'}`);
      return false;
    }

    await refreshFileTree();

    await attachScriptToObjectFromPath(objectId, relativeScriptPath, {
      code: template,
      scriptMeta: templateOptions,
      openEditor: true,
    });

    return true;
  }

  async function handleAttachScript(objectId, options = {}) {
    if (!objectId) return false;
    const {
      scriptPath = null,
      openEditor = true,
      allowCreate = true,
      silentIfNone = false,
    } = options;

    const directPath = scriptPath ? toForwardSlashPath(scriptPath) : null;
    if (directPath) {
      return attachScriptToObjectFromPath(objectId, directPath, { openEditor });
    }

    const selectedNode =
      selectedFilePath && fileTree.length > 0 ? findNodeByPath(fileTree, selectedFilePath) : null;
    if (selectedNode && selectedNode.type === 'file' && selectedNode.category === 'scripts') {
      return attachScriptToObjectFromPath(objectId, selectedNode.path, { openEditor });
    }

    if (!allowCreate) {
      if (!silentIfNone) {
        alert('Select a script in the File System first, then try attaching again.');
      }
      return false;
    }

    const shouldCreate = confirm(
      'No script selected. Press OK to create a new script file, or Cancel to choose an existing script first.'
    );
    if (!shouldCreate) {
      return false;
    }

    return createNewScriptForObject(objectId);
  }

  useEffect(() => {
    const preventDefaultScriptDrop = (event) => {
      if (extractScriptPathFromDragEvent(event)) {
        event.preventDefault();
      }
    };

    window.addEventListener('dragover', preventDefaultScriptDrop);
    window.addEventListener('drop', preventDefaultScriptDrop);

    return () => {
      window.removeEventListener('dragover', preventDefaultScriptDrop);
      window.removeEventListener('drop', preventDefaultScriptDrop);
    };
  }, [fileTree]);

  const sceneToolButtons = [
    { id: 'move', icon: '⤨', label: 'Move' },
    { id: 'resize', icon: '⤡', label: 'Resize' },
    { id: 'rotate', icon: '⟳', label: 'Rotate' },
    { id: 'bounds', icon: '▢', label: 'Fit Bounds', disabled: true },
    { id: 'pan', icon: '🖐', label: 'Pan', disabled: true },
  ];

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

  const readSpriteDataUrl = async (imagePath, projectPathOverride) => {
    const absolutePath = getAbsolutePathFromRelative(imagePath, projectPathOverride);
    if (!absolutePath) return null;
    try {
      const result = await window.electronAPI.readBinaryFile(absolutePath);
      if (!result?.success || !result.content) return null;
      const lower = imagePath.toLowerCase();
      let mime = 'image/png';
      if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mime = 'image/jpeg';
      else if (lower.endsWith('.gif')) mime = 'image/gif';
      else if (lower.endsWith('.webp')) mime = 'image/webp';
      return `data:${mime};base64,${result.content}`;
    } catch (error) {
      console.warn('Failed to load sprite asset preview:', error);
      return null;
    }
  };

  const hydrateSpriteComponent = async (component, projectPathOverride) => {
    const props = { ...(component.properties ?? {}) };

    if (!props.previewDataUrl && props.dataUrl) {
      props.previewDataUrl = props.dataUrl;
    }

    if (props.imagePath && !props.previewDataUrl) {
      const preview = await readSpriteDataUrl(props.imagePath, projectPathOverride);
      if (preview) {
        props.previewDataUrl = preview;
        if (!props.dataUrl) {
          props.dataUrl = preview;
        }
        if (!props.width || !props.height) {
          try {
            const dims = await getImageDimensions(preview);
            props.width = dims.width;
            props.height = dims.height;
            props.originX = props.originX ?? 0; // Top-left anchor by default
            props.originY = props.originY ?? 0;
          } catch (error) {
            console.warn('Failed to compute sprite dimensions:', error);
          }
        }
      }
    }

    props.width = props.width ?? 32;
    props.height = props.height ?? 32;
    props.originX = props.originX ?? 0; // Top-left anchor by default
    props.originY = props.originY ?? 0;

    return {
      ...component,
      properties: props,
    };
  };

  const normalizeScriptComponent = (component) => {
    if (component.type !== 'Script') return component;
    return {
      ...component,
      scriptPath: component.scriptPath ? toForwardSlashPath(component.scriptPath) : '',
      code: component.code ?? '',
      scriptMeta: component.scriptMeta ?? null,
    };
  };

  const normalizeComponent = (component) => {
    const normalized = normalizeScriptComponent(normalizeAreaComponent(component));
    if (normalized.type === 'Sprite') {
      const props = {
        ...(normalized.properties ?? {}),
      };
      if (normalized.dataUrl && !props.dataUrl) {
        props.dataUrl = normalized.dataUrl;
      }
      if (normalized.imagePath && !props.imagePath) {
        props.imagePath = normalized.imagePath;
      }
      if (normalized.name && !props.name) {
        props.name = normalized.name;
      }
      return {
        ...normalized,
        properties: props,
        enabled: normalized.enabled !== false,
      };
    }
    return {
      ...normalized,
      enabled: normalized.enabled !== false,
    };
  };

  const normalizeGameObjects = (objects = []) =>
    objects.map((obj) => ({
      ...obj,
      transform: {
        width: obj.transform?.width ?? 100,
        height: obj.transform?.height ?? 100,
        anchor: obj.transform?.anchor ?? 'topleft', // Default to topleft anchor
        ...obj.transform,
      },
      visible: obj.visible ?? true,
      tags: obj.tags ?? [],
      components: obj.components?.map(normalizeComponent) ?? [],
      children: normalizeGameObjects(obj.children ?? []),
    }));

  // Migrate old GameObjects to have correct pre-attached components
  const migrateGameObjects = (objects = []) =>
    objects.map((obj) => {
      const components = [...(obj.components || [])];
      
      // If rect type and no Shape component, add one
      if (obj.type === 'rect' && !components.some(c => c.type === 'Shape')) {
        components.unshift({
          type: 'Shape',
          shapeType: 'Rectangle',
          color: '#6495ed',
          filled: true,
          enabled: true
        });
      }
      
      // If circle type and no Shape component, add one
      if (obj.type === 'circle' && !components.some(c => c.type === 'Shape')) {
        components.unshift({
          type: 'Shape',
          shapeType: 'Circle',
          color: '#ff6464',
          filled: true,
          enabled: true
        });
      }
      
      // If text type and no Text component, add one
      if (obj.type === 'text' && !components.some(c => c.type === 'Text')) {
        components.unshift({
          type: 'Text',
          text: obj.name || 'Text',
          textSize: 16,
          font: null,
          align: 'left',
          color: '#ffffff',
          enabled: true
        });
      }
      
      return {
        ...obj,
        components,
        children: migrateGameObjects(obj.children ?? [])
      };
    });

  function flattenGameObjects(objects = []) {
    const result = [];
    objects.forEach((obj) => {
      result.push(obj);
      if (obj.children && obj.children.length > 0) {
        result.push(...flattenGameObjects(obj.children));
      }
    });
    return result;
  }

  function findObjectById(objects, id) {
    for (const obj of objects) {
      if (obj.id === id) return obj;
      if (obj.children?.length) {
        const found = findObjectById(obj.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  const findNodePath = (objects, id, parentId = null) => {
    for (let index = 0; index < objects.length; index++) {
      const obj = objects[index];
      if (obj.id === id) {
        return { parentId, index, siblings: objects };
      }
      if (obj.children?.length) {
        const found = findNodePath(obj.children, id, obj.id);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };

  const updateObjectInTree = (objects, id, updater) => {
    let changed = false;
    const next = objects.map((obj) => {
      if (obj.id === id) {
        changed = true;
        return normalizeGameObjects([updater(obj)])[0];
      }
      if (obj.children?.length) {
        const updatedChildren = updateObjectInTree(obj.children, id, updater);
        if (updatedChildren !== obj.children) {
          changed = true;
          return { ...obj, children: updatedChildren };
        }
      }
      return obj;
    });
    return changed ? next : objects;
  };

  const removeObjectInTree = (objects, id) => {
    let removed = null;
    const result = [];
    let changed = false;

    for (const obj of objects) {
      if (obj.id === id) {
        removed = obj;
        changed = true;
        continue;
      }
      if (obj.children?.length) {
        const { updated, removed: childRemoved } = removeObjectInTree(obj.children, id);
        if (childRemoved) {
          removed = childRemoved;
          changed = true;
          result.push({ ...obj, children: updated });
          continue;
        }
      }
      result.push(obj);
    }

    return { updated: changed ? result : objects, removed };
  };

  const appendChildInTree = (objects, parentId, childNode) => {
    if (!parentId) {
      return [...objects, childNode];
    }
    let changed = false;
    const next = objects.map((obj) => {
      if (obj.id === parentId) {
        changed = true;
        return {
          ...obj,
          children: [...(obj.children ?? []), childNode],
        };
      }
      if (obj.children?.length) {
        const updatedChildren = appendChildInTree(obj.children, parentId, childNode);
        if (updatedChildren !== obj.children) {
          changed = true;
          return { ...obj, children: updatedChildren };
        }
      }
      return obj;
    });
    return changed ? next : objects;
  };

  const insertRelativeToNode = (objects, targetId, node, position) => {
    const targetIndex = objects.findIndex((obj) => obj.id === targetId);
    if (targetIndex !== -1) {
      const result = [...objects];
      const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
      result.splice(insertIndex, 0, node);
      return { inserted: true, nodes: result };
    }

    let inserted = false;
    const result = objects.map((obj) => {
      if (obj.children?.length) {
        const { inserted: childInserted, nodes: childNodes } = insertRelativeToNode(obj.children, targetId, node, position);
        if (childInserted) {
          inserted = true;
          return { ...obj, children: childNodes };
        }
      }
      return obj;
    });

    return { inserted, nodes: inserted ? result : objects };
  };

  const moveObjectInTree = (objects, sourceId, targetId, position = 'before') => {
    if (!sourceId || sourceId === targetId) return objects;
    const { updated: withoutSource, removed } = removeObjectInTree(objects, sourceId);
    if (!removed) return objects;
    if (!targetId) {
      return [...withoutSource, removed];
    }
    const { inserted, nodes } = insertRelativeToNode(withoutSource, targetId, removed, position);
    if (inserted) {
      return nodes;
    }
    // If target not found, append to root
    return [...withoutSource, removed];
  };

  const mapTree = (objects, mapper) =>
    objects.map((obj) => {
      const mappedChildren = obj.children?.length ? mapTree(obj.children, mapper) : [];
      return mapper({
        ...obj,
        children: mappedChildren,
      });
    });

  const generateObjectId = () => `obj_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  const cloneObjectWithNewIds = (obj) => ({
    ...obj,
    id: generateObjectId(),
    transform: { ...obj.transform },
    components: obj.components?.map((component) => JSON.parse(JSON.stringify(component))) ?? [],
    tags: [...(obj.tags ?? [])],
    visible: obj.visible ?? true,
    children: (obj.children ?? []).map((child) => cloneObjectWithNewIds(child)),
  });

  const toggleNodeExpansion = (nodeId) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const toggleNodeVisibility = (nodeId) => {
    setGameObjects((prev) =>
      updateObjectInTree(prev, nodeId, (node) => ({
        ...node,
        visible: node.visible === false ? true : !node.visible,
      }))
    );
  };

  const toggleComponentEnabled = (objectId, componentIndex) => {
    setGameObjects((prev) =>
      updateObjectInTree(prev, objectId, (node) => {
        const components = [...node.components];
        if (!components[componentIndex]) return node;
        components[componentIndex] = {
          ...components[componentIndex],
          enabled: components[componentIndex].enabled === false ? true : !components[componentIndex].enabled,
        };
        return {
          ...node,
          components,
        };
      })
    );
  };

  const createGameObjectWithType = (parentId, nodeType) => {
    const parent = parentId ? findObjectById(gameObjects, parentId) : null;
    const totalCount = flatGameObjects.length;
    const childIndex = parent?.children?.length ?? 0;
    
    let typeName = nodeType === 'rect' ? 'Rectangle' : nodeType === 'circle' ? 'Circle' : nodeType === 'text' ? 'Text' : 'Node';
    const childName = parent ? `${parent.name}_${childIndex + 1}` : `${typeName} ${totalCount + 1}`;
    
    const components = [];
    // Children are positioned at parent's position by default (like Kaplay)
    // This way child at (0,0) relative appears at parent's anchor point
    let transform = {
      x: parent ? parent.transform.x : 0,
      y: parent ? parent.transform.y : 0,
      width: 100,
      height: 100,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    };

    // Pre-attach appropriate component based on type
    if (nodeType === 'rect') {
      components.push({
        type: 'Shape',
        shapeType: 'Rectangle',
        color: '#6495ed',
        filled: true,
        enabled: true
      });
    } else if (nodeType === 'circle') {
      components.push({
        type: 'Shape',
        shapeType: 'Circle',
        color: '#ff6464',
        filled: true,
        enabled: true
      });
    } else if (nodeType === 'text') {
      components.push({
        type: 'Text',
        text: 'Text',
        textSize: 16,
        font: null,
        align: 'left',
        color: '#ffffff',
        enabled: true
      });
      transform.width = 200;
      transform.height = 40;
    }

    const newNode = normalizeGameObjects([
      {
        id: generateObjectId(),
        name: childName,
        type: nodeType,
        transform,
        components,
        tags: [],
        visible: true,
        children: [],
      },
    ])[0];
    
    setGameObjects((prev) => normalizeGameObjects(appendChildInTree(prev, parentId, newNode)));
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (parentId) next.add(parentId);
      next.add(newNode.id);
      return next;
    });
    setSelectedObject(newNode.id);
  };

  const addChildGameObject = (parentId) => {
    // Default to rectangle for backward compatibility
    createGameObjectWithType(parentId, 'rect');
  };

  const getNodeIcon = (node) => {
    if (node.type === 'circle') return '⚪';
    if (node.type === 'rect') return '▭';
    if (node.type === 'sprite') return '🖼️';
    if (node.type === 'text') return '📝';
    return '📦';
  };

  const getComponentIcon = (type) => {
    switch (type) {
      case 'Area':
        return '🛡️';
      case 'Physics':
        return '⚙️';
      case 'Sprite':
        return '🖼️';
      case 'Script':
        return '📜';
      case 'Shape':
        return '⬛';
      case 'Text':
        return '📝';
      default:
        return '🔹';
    }
  };

  const renderComponentNode = (parentNode, component, depth, index) => {
    const enabled = component.enabled !== false;
    return (
      <div
        key={`${parentNode.id}-component-${index}`}
        className={`treeNode componentNode ${!enabled ? 'disabled' : ''}`}
        style={{ paddingLeft: `${Math.max(0, 24 + depth * 16)}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="treeArrow invisible"></span>
        <span className="treeIcon">{getComponentIcon(component.type)}</span>
        <span className="treeName">{component.type}</span>
        <div className="treeActions">
          <button
            type="button"
            className="treeActionIcon"
            title={enabled ? 'Disable component' : 'Enable component'}
            onClick={(e) => {
              e.stopPropagation();
              toggleComponentEnabled(parentNode.id, index);
            }}
          >
            {enabled ? '✅' : '🚫'}
          </button>
          {component.type === 'Script' && (
            <button
              type="button"
              className="treeActionIcon"
              title="Edit script"
              onClick={(e) => {
                e.stopPropagation();
                openScriptEditor(parentNode.id);
              }}
            >
              📜
            </button>
          )}
          <button
            type="button"
            className="treeActionIcon"
            title="Remove component"
            onClick={(e) => {
              e.stopPropagation();
              removeComponent(parentNode.id, component.type, index);
            }}
          >
            ✕
          </button>
        </div>
      </div>
    );
  };

  const renderHierarchyTree = (nodes, depth = 0) =>
    nodes.flatMap((node) => {
      const hasChildren = node.children?.length > 0;
      const isExpanded = expandedNodes.has(node.id);
      const hasScript = node.components?.some((component) => component.type === 'Script');
      const row = (
        <div
          key={`node-${node.id}`}
          className={`treeNode childNode ${selectedObject === node.id ? 'selected' : ''} ${dragOverObjectId === node.id ? 'drag-over' : ''}`}
          style={{ paddingLeft: `${Math.max(0, 16 + depth * 16)}px` }}
          draggable
          onClick={(e) => {
            e.stopPropagation();
            setSelectedObject(node.id);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSelectedObject(node.id);
            setContextMenu({ x: e.clientX, y: e.clientY, objectId: node.id });
          }}
          onDragStart={(e) => handleHierarchyDragStart(e, node.id)}
          onDragOver={(e) => handleHierarchyDragOver(e, node.id)}
          onDragLeave={() => handleHierarchyDragLeave(node.id)}
          onDrop={(e) => handleHierarchyDrop(e, node.id)}
          onDragEnd={handleHierarchyDragEnd}
        >
          <span
            className={`treeArrow ${hasChildren ? '' : 'invisible'}`}
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) {
                toggleNodeExpansion(node.id);
              }
            }}
          >
            {hasChildren ? (isExpanded ? '▼' : '▶') : ''}
          </span>
          <span className="treeIcon">{getNodeIcon(node)}</span>
          <span className="treeName">{node.name}</span>
          {hasScript && <span className="treeBadge" title="Script attached">📜</span>}
          <div className="treeActions">
            <button
              type="button"
              className="treeActionIcon"
              title={node.visible === false ? 'Show node' : 'Hide node'}
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeVisibility(node.id);
              }}
            >
              {node.visible === false ? '🙈' : '👁️'}
            </button>
            <button
              type="button"
              className="treeActionIcon"
              title="Add child node"
              onClick={(e) => {
                e.stopPropagation();
                addChildGameObject(node.id);
              }}
            >
              ➕
            </button>
          </div>
        </div>
      );

      const children = [];

      if (isExpanded) {
        if (hasChildren) {
          children.push(...renderHierarchyTree(node.children, depth + 1));
        }
      }

      return [row, ...children];
    });

  const sanitizeIdentifier = (raw, fallback = 'ref') => {
    let cleaned = (raw || '')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+/, '')
      .replace(/_+$/, '');

    if (!cleaned) cleaned = fallback;
    if (!/^[A-Za-z_]/.test(cleaned)) {
      cleaned = `${fallback}_${cleaned}`;
    }

    return cleaned;
  };

  const SCRIPT_TEMPLATE = (name = 'Script', rawOptions = {}) => {
    const options = {
      ...DEFAULT_SCRIPT_TEMPLATE_OPTIONS,
      ...(rawOptions || {}),
    };

    const usedIdentifiers = new Set();
    const references = (options.references || [])
      .map((ref) => ref.trim())
      .filter((ref) => ref.length > 0)
      .map((tag, index) => {
        const baseIdentifier = sanitizeIdentifier(tag, `ref${index + 1}`);
        let identifier = baseIdentifier;
        let suffix = 1;
        while (usedIdentifiers.has(identifier)) {
          identifier = `${baseIdentifier}_${suffix++}`;
        }
        usedIdentifiers.add(identifier);
        return { tag, identifier };
      });

    const lines = [];

    lines.push(`// ${name}`);
    lines.push('// This is a Kaplay-style GameObject script. Use ready() for setup and update(dt) for the game loop.');

    if (references.length > 0) {
      lines.push(
        references
          .map(({ identifier }) => `let ${identifier} = null;`)
          .join('\n'),
      );
    }

    if (options.includeReady) {
      let readyBody = '  // Called once when the GameObject is added to the world';
      if (references.length > 0) {
        readyBody = references
          .map(({ identifier, tag }) => `  ${identifier} = ctx.get('${tag}')[0] ?? null;`)
          .join('\n');
        readyBody += '\n  // Initialize other state here';
      }

      lines.push(`export function ready() {\n${readyBody}\n}`);
    }

    if (options.includeUpdate) {
      let updateBody = '  // Runs every frame (dt = seconds since the last frame)';
      if (references.length > 0) {
        updateBody = references
          .map(({ identifier, tag }) => `  if (!${identifier}) {\n    ${identifier} = ctx.get('${tag}')[0] ?? null;\n  }`)
          .join('\n');
        updateBody += '\n  // Game loop logic goes here';
      }

      lines.push(`export function update(dt) {\n${updateBody}\n}`);
    }

    return `${lines.filter(Boolean).join('\n\n')}\n`;
  };

  const sanitizeFileStem = (name) => {
    if (!name) return 'Script';
    const sanitized = name.replace(/[^A-Za-z0-9_\-]/g, '');
    return sanitized.length > 0 ? sanitized : 'Script';
  };

  const sanitizeRelativeScriptPath = (input) => {
    if (!input) return '';
    const parts = input.split(/[\\/]+/).map(sanitizeFileStem).filter(Boolean);
    return parts.length > 0 ? parts.join('/') : '';
  };

  const toForwardSlashPath = (pathString) =>
    pathString ? pathString.replace(/\\/g, '/').replace(/\/{2,}/g, '/') : '';

  const combineProjectPath = (projectBase, relativePath) => {
    if (!projectBase || !relativePath) return null;
    const normalizedProject = projectBase.replace(/\\/g, '/');
    const normalizedRelative = relativePath.replace(/\\/g, '/').replace(/^\.?\//, '');
    return `${normalizedProject}/${normalizedRelative}`.replace(/\/{2,}/g, '/');
  };

  const getAbsolutePathFromRelative = (relativePath, projectPathOverride) => {
    const projectBase = projectPathOverride || currentProject?.path;
    if (!projectBase || !relativePath) return null;
    const normalized = combineProjectPath(projectBase, relativePath);
    return normalized ? normalized.replace(/\//g, '\\') : null;
  };

  const getRelativePathFromAbsolute = (absolutePath, projectPathOverride) => {
    const projectBase = (projectPathOverride || currentProject?.path) || '';
    if (!absolutePath || !projectBase) return null;
    const normalizedAbsolute = absolutePath.replace(/\\/g, '/');
    const normalizedProject = projectBase.replace(/\\/g, '/').replace(/\/$/, '');
    if (!normalizedAbsolute.startsWith(normalizedProject)) return null;
    const relative = normalizedAbsolute.slice(normalizedProject.length + 1);
    return toForwardSlashPath(relative);
  };

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const getImageDimensions = (dataUrl) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataUrl;
    });

  const ensureDirectoryForFile = async (absoluteFilePath) => {
    if (!absoluteFilePath) return;
    const normalized = absoluteFilePath.replace(/\\/g, '/');
    const lastSlash = normalized.lastIndexOf('/');
    if (lastSlash === -1) return;
    const dir = normalized.slice(0, lastSlash);
    if (!dir) return;
    await window.electronAPI.createDirectory(dir.replace(/\//g, '\\'));
  };

  const readScriptFile = async (relativePath, projectPathOverride) => {
    const absolute = getAbsolutePathFromRelative(relativePath, projectPathOverride);
    if (!absolute) return { success: false, content: '' };
    const result = await window.electronAPI.readFile(absolute);
    return result;
  };

  const hydrateGameObjects = async (objects = [], projectPathOverride) => {
    if (!objects || objects.length === 0) return [];
    const hydrated = await Promise.all(
      objects.map(async (obj) => {
        const updatedComponents = await Promise.all(
          (obj.components || []).map(async (component) => {
            if (component.type === 'Script') {
              const scriptPath = component.scriptPath ? toForwardSlashPath(component.scriptPath) : '';
              if (scriptPath && (projectPathOverride || currentProject?.path)) {
                const scriptResult = await readScriptFile(scriptPath, projectPathOverride);
                return {
                  ...component,
                  scriptPath,
                  code: scriptResult.success ? scriptResult.content : component.code ?? '',
                  scriptMeta: component.scriptMeta ?? null,
                };
              }

              return {
                ...component,
                scriptPath,
                code: component.code ?? '',
                scriptMeta: component.scriptMeta ?? null,
              };
            }

            if (component.type === 'Sprite') {
              return hydrateSpriteComponent(component, projectPathOverride);
            }

            return normalizeAreaComponent(component);
          })
        );

        return {
          ...obj,
          components: updatedComponents,
          children: await hydrateGameObjects(obj.children || [], projectPathOverride),
        };
      })
    );

    return normalizeGameObjects(hydrated);
  };

  const prepareObjectsForSave = (objects = []) =>
    objects.map((obj) => ({
      ...obj,
      components: (obj.components || []).map((component) => {
        if (component.type === 'Sprite') {
          const props = { ...(component.properties ?? {}) };
          if (props.imagePath) {
            delete props.dataUrl;
          }
          return {
            ...component,
            properties: props,
          };
        }
        if (component.type !== 'Script') return component;
        const { code, scriptPath, scriptMeta, ...rest } = component;
        const normalizedPath = scriptPath ? toForwardSlashPath(scriptPath) : '';
        if (normalizedPath) {
          return {
            ...rest,
            type: 'Script',
            scriptPath: normalizedPath,
            scriptMeta: scriptMeta ?? null,
          };
        }
        return {
          ...rest,
          type: 'Script',
          code: code ?? '',
          scriptMeta: scriptMeta ?? null,
        };
      }),
      children: prepareObjectsForSave(obj.children ?? []),
    }));

  const attachScriptCodeToObjects = async (objects = [], projectPathOverride) => {
    if (!objects || objects.length === 0) return [];
    return Promise.all(
      objects.map(async (obj) => ({
        ...obj,
        components: await Promise.all(
          (obj.components || []).map(async (component) => {
            if (component.type !== 'Script' || !component.scriptPath) {
              return component;
            }
            const scriptResult = await readScriptFile(component.scriptPath, projectPathOverride);
            return {
              ...component,
              code: scriptResult.success ? scriptResult.content : component.code ?? '',
              scriptMeta: component.scriptMeta ?? null,
            };
          })
        ),
        children: await attachScriptCodeToObjects(obj.children || [], projectPathOverride),
      }))
    );
  };

  const updateScriptCodeForPath = (relativePath, code) => {
    if (!relativePath) return;
    const normalizedPath = toForwardSlashPath(relativePath);
    setGameObjects((prev) =>
      normalizeGameObjects(
        mapTree(prev, (node) => ({
          ...node,
          components: node.components.map((component) =>
            component.type === 'Script' && toForwardSlashPath(component.scriptPath) === normalizedPath
              ? { ...component, code }
              : component
          ),
        }))
      )
    );
  };

  const FILE_CATEGORIES = [
    {
      id: 'scenes',
      label: 'Scenes',
      icon: '🎬',
      pathSegment: 'scenes',
      allowedExtensions: ['.json', '.js'],
    },
    {
      id: 'scripts',
      label: 'Scripts',
      icon: '📜',
      pathSegment: 'scripts',
      allowedExtensions: ['.js', '.ts'],
    },
    {
      id: 'assets',
      label: 'Assets',
      icon: '🖼️',
      pathSegment: 'assets',
      allowedExtensions: null,
    },
  ];

  const shouldIncludeFile = (categoryId, name, allowedExtensions) => {
    if (name.startsWith('.')) return false;
    if (name === 'node_modules') return false;
    if (!allowedExtensions || allowedExtensions.length === 0) return true;
    const lower = name.toLowerCase();
    return allowedExtensions.some((ext) => lower.endsWith(ext));
  };

  const buildDirectoryNode = useCallback(
    async (category, absolutePath, relativePath) => {
      const listResult = await window.electronAPI.listDirectory(absolutePath.replace(/\//g, '\\'));
      if (!listResult.success) {
        return {
          id: relativePath,
          name: relativePath.split('/').pop(),
          type: 'directory',
          path: relativePath,
          category: category.id,
          children: [],
        };
      }

      const children = [];
      for (const entry of listResult.contents) {
        const childRelative = `${relativePath}/${entry.name}`.replace(/\/{2,}/g, '/');
        const childAbsolute = `${absolutePath}/${entry.name}`.replace(/\/{2,}/g, '/');

        if (entry.type === 'directory') {
          const childNode = await buildDirectoryNode(category, childAbsolute, childRelative);
          children.push(childNode);
        } else if (shouldIncludeFile(category.id, entry.name, category.allowedExtensions)) {
          children.push({
            id: childRelative,
            name: entry.name,
            type: 'file',
            path: childRelative,
            category: category.id,
          });
        }
      }

      return {
        id: relativePath,
        name: relativePath.split('/').pop(),
        type: 'directory',
        path: relativePath,
        category: category.id,
        children: children.sort((a, b) => {
          if (a.type === b.type) {
            return a.name.localeCompare(b.name);
          }
          return a.type === 'directory' ? -1 : 1;
        }),
      };
    },
    []
  );

  const refreshFileTree = useCallback(async () => {
    if (!currentProject?.scenePath) {
      setFileTree([]);
      setExpandedFileNodes(new Set());
      setSelectedFilePath(null);
      return;
    }

    const tree = [];
    const defaultExpanded = new Set();

    for (const category of FILE_CATEGORIES) {
      const baseAbsolute = combineProjectPath(currentProject.path, category.pathSegment);
      if (!baseAbsolute) continue;
      const node = await buildDirectoryNode(category, baseAbsolute, category.pathSegment);
      tree.push({
        ...node,
        displayName: category.label,
        icon: category.icon,
        isCategory: true,
      });
      defaultExpanded.add(category.pathSegment);
    }

    setFileTree(tree);
    setExpandedFileNodes((prev) => {
      if (prev.size === 0) {
        return defaultExpanded;
      }
      const next = new Set(prev);
      defaultExpanded.forEach((value) => next.add(value));
      return next;
    });
  }, [currentProject?.path, buildDirectoryNode]);

  const findNodeByPath = (nodes, targetPath) => {
    for (const node of nodes) {
      if (node.path === targetPath) {
        return node;
      }
      if (node.children) {
        const found = findNodeByPath(node.children, targetPath);
        if (found) return found;
      }
    }
    return null;
  };

  const toggleFileNode = (path) => {
    setExpandedFileNodes((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleFileNodeClick = (node) => {
    setSelectedFilePath(node.path);
  };

  const handleFileNodeDoubleClick = async (node) => {
    if (node.type === 'directory') {
      toggleFileNode(node.path);
      return;
    }

    if (node.category === 'scripts') {
      await openScriptEditor(null, { relativePath: node.path });
      return;
    }

    if (node.category === 'scenes') {
      const lower = node.name.toLowerCase();
      if (lower.endsWith('.json')) {
        const sceneName = node.name.replace(/\.json$/i, '');
        await loadScene(sceneName);
      } else if (lower.endsWith('.js')) {
        await openScriptEditor(null, { relativePath: node.path });
      }
    }
  };

  const handleFileNodeDragStart = (event, node) => {
    if (node.type !== 'file') {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/regame-asset', node.path);
    event.dataTransfer.setData('text/plain', node.path);
  };

  const handleFileNodeDragEnd = (event) => {
    event.dataTransfer.clearData('application/regame-asset');
    event.dataTransfer.clearData('text/plain');
  };

  const renderFileNode = (node, depth = 0) => {
    const isDirectory = node.type === 'directory';
    const nodePath = node.path;
    const isExpanded = expandedFileNodes.has(nodePath);
    const isSelected = selectedFilePath === nodePath;
    const displayName = node.isCategory ? node.displayName : node.name;
    let icon = node.icon || '📁';
    if (!node.isCategory) {
      if (!isDirectory) {
        if (node.category === 'scripts') icon = '📜';
        else if (node.category === 'scenes') icon = node.name.toLowerCase().endsWith('.json') ? '🧩' : '📄';
        else icon = '📦';
      } else {
        icon = '📁';
      }
    }

    return (
      <div key={nodePath}>
        <div
          className={`fileNode ${isDirectory ? 'folder' : 'file'} ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          onClick={() => handleFileNodeClick(node)}
          onDoubleClick={() => handleFileNodeDoubleClick(node)}
          draggable={!isDirectory}
          onDragStart={(e) => handleFileNodeDragStart(e, node)}
          onDragEnd={handleFileNodeDragEnd}
        >
          {isDirectory ? (
            <span
              className="fileNodeArrow"
              onClick={(e) => {
                e.stopPropagation();
                toggleFileNode(nodePath);
              }}
            >
              {isExpanded ? '▾' : '▸'}
            </span>
          ) : (
            <span className="fileNodeArrow placeholder">•</span>
          )}
          <span className="fileNodeIcon">{icon}</span>
          <span className="fileNodeName">{displayName}</span>
        </div>
        {isDirectory && isExpanded && node.children && node.children.map((child) => renderFileNode(child, depth + 1))}
      </div>
    );
  };

  const determineScriptBaseFolder = () => {
    let baseFolder = 'scripts';
    if (!selectedFilePath) return baseFolder;
    const selectedNode = findNodeByPath(fileTree, selectedFilePath);
    if (!selectedNode) return baseFolder;
    if (selectedNode.type === 'directory' && selectedNode.category === 'scripts') {
      return selectedNode.path;
    }
    if (selectedNode.category === 'scripts') {
      const normalized = selectedNode.path.replace(/\\/g, '/');
      const idx = normalized.lastIndexOf('/');
      if (idx !== -1) {
        const parent = normalized.slice(0, idx);
        return parent || 'scripts';
      }
    }
    return baseFolder;
  };

  const handleCreateScriptFile = async () => {
    try {
      if (!currentProject?.path) {
        alert('Load or create a project before adding scripts.');
        return;
      }

      const baseFolder = determineScriptBaseFolder();
      const defaultStem = sanitizeFileStem('NewScript');
      const userInput = await showInputModal(
        'Create Script',
        `Create script inside ${baseFolder}/ (use optional subfolders like player/move):`,
        defaultStem
      );
      if (userInput === null || userInput === '') return;

      const sanitizedRelative = sanitizeRelativeScriptPath(userInput);
      const fileStem = sanitizedRelative || defaultStem;
      const fileSegments = fileStem.split('/');
      const scriptDisplayName = fileSegments[fileSegments.length - 1] || defaultStem;
      const relativePath = toForwardSlashPath(
        `${baseFolder}/${fileStem}${fileStem.toLowerCase().endsWith('.js') ? '' : '.js'}`
      );
      const absolutePath = getAbsolutePathFromRelative(relativePath);
      if (!absolutePath) {
        alert(`Failed to resolve script path. Project: ${currentProject?.path}, Relative: ${relativePath}`);
        return;
      }

      const checkResult = await window.electronAPI.checkPath(absolutePath);
      if (checkResult.success && checkResult.exists) {
        const overwrite = confirm(`${relativePath} already exists. Overwrite the file?`);
        if (!overwrite) return;
      }

      await ensureDirectoryForFile(absolutePath);
      const modalResult = await showScriptTemplateModal(scriptDisplayName);
      const templateOptions = {
        ...DEFAULT_SCRIPT_TEMPLATE_OPTIONS,
        ...(modalResult || {}),
      };
      const template = SCRIPT_TEMPLATE(scriptDisplayName, templateOptions);
      const saveResult = await window.electronAPI.saveFile(absolutePath, template);
      if (!saveResult.success) {
        alert(`Failed to save script: ${saveResult.message || 'Unknown error'}`);
        return;
      }
      await refreshFileTree();
      setExpandedFileNodes((prev) => {
        const next = new Set(prev);
        next.add(baseFolder);
        const folderSegments = relativePath.split('/').slice(0, -1);
        let current = '';
        folderSegments.forEach((segment) => {
          current = current ? `${current}/${segment}` : segment;
          next.add(current);
        });
        return next;
      });
      setSelectedFilePath(relativePath);
      await openScriptEditor(null, { relativePath });
    } catch (error) {
      console.error('Error creating script file:', error);
      alert(`Failed to create script: ${error.message || 'Unknown error'}`);
    }
  };

  const handleCreateFolder = async () => {
    if (!currentProject?.path) {
      alert('Load or create a project before adding folders.');
      return;
    }

    let baseFolder = 'scripts';
    let allowedCategory = 'scripts';

    if (selectedFilePath) {
      const selectedNode = findNodeByPath(fileTree, selectedFilePath);
      if (selectedNode) {
        if (selectedNode.type === 'directory' && ['scripts', 'assets'].includes(selectedNode.category)) {
          baseFolder = selectedNode.path;
          allowedCategory = selectedNode.category;
        } else if (['scripts', 'assets'].includes(selectedNode.category)) {
          const parentPath = selectedNode.path.split('/').slice(0, -1).join('/') || selectedNode.category;
          baseFolder = parentPath;
          allowedCategory = selectedNode.category;
        }
      }
    }

    if (!['scripts', 'assets'].includes(allowedCategory)) {
      baseFolder = 'scripts';
      allowedCategory = 'scripts';
    }

    const defaultName = sanitizeFileStem('NewFolder');
    const folderNameInput = await showInputModal(
      'Create Folder',
      `Create folder inside ${baseFolder}/:`,
      defaultName
    );
    if (folderNameInput === null || folderNameInput === '') return;

    const folderName = sanitizeFileStem(folderNameInput);
    if (!folderName) {
      alert('Invalid folder name.');
      return;
    }

    const relativePath = toForwardSlashPath(`${baseFolder}/${folderName}`);
    const absolutePath = combineProjectPath(currentProject.path, relativePath);
    if (!absolutePath) {
      alert('Failed to resolve folder path.');
      return;
    }

    await window.electronAPI.createDirectory(absolutePath.replace(/\//g, '\\'));
    await refreshFileTree();
    setExpandedFileNodes((prev) => {
      const next = new Set(prev);
      next.add(baseFolder);
      next.add(relativePath);
      return next;
    });
    setSelectedFilePath(relativePath);
  };

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


  // Reset expanded sections when selecting a different object
  useEffect(() => {
    if (selectedObject) {
      setExpandedSections(new Set(['transform', 'name']));
    }
  }, [selectedObject]);

  useEffect(() => {
    if (mode === 'editor' && currentProject?.scenePath) {
      refreshFileTree();
    } else if (mode !== 'editor') {
      setFileTree([]);
      setSelectedFilePath(null);
      setExpandedFileNodes(new Set());
    }
  }, [mode, currentProject?.scenePath, refreshFileTree]);

  useEffect(() => {
    if (mode === 'editor' && currentProject?.scenePath) {
      refreshFileTree();
    }
  }, [mode, currentProject?.scenePath, refreshFileTree]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Space key for panning
      if (e.key === ' ' && mode === 'editor') {
        e.preventDefault();
        setIsSpacePressed(true);
        return;
      }
      
      // Ctrl+S to save
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (mode === 'editor' && currentProject?.scenePath) {
          saveScene();
        }
      }
    };
    
    const handleKeyUp = (e) => {
      // Release space key
      if (e.key === ' ') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
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
        const hydratedObjects = await hydrateGameObjects(sceneData.objects || [], projectPath);
        // Migrate old objects to have correct components
        const migratedObjects = migrateGameObjects(hydratedObjects);
        setGameObjects(migratedObjects);
        
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

        await refreshFileTree();
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
    setAddObjectModalOpen(true);
  };

  const handleCreateObject = useCallback(
    (type) => {
      setAddObjectModalOpen(false);
      if (type === 'sprite') {
        const spriteCount = flatGameObjects.filter((obj) => obj.type === 'sprite').length;
        setSpriteEditorState({
          open: true,
          initialName: `Sprite ${spriteCount + 1}`,
          initialWidth: 32,
          initialHeight: 32,
        });
        return;
      }

      const id = generateObjectId();
      const baseNameMap = {
        rect: 'Rectangle',
        circle: 'Circle',
        text: 'Text',
        empty: 'Node',
      };
      const baseName = baseNameMap[type] || 'Node';
      const newIndex = flatGameObjects.length + 1;
      const defaultWidth = type === 'circle' ? 80 : type === 'text' ? 200 : 120;
      const defaultHeight = type === 'circle' ? 80 : type === 'text' ? 40 : 120;

      // Pre-attach appropriate component based on type
      const components = [];
      if (type === 'rect') {
        components.push({
          type: 'Shape',
          shapeType: 'Rectangle',
          color: '#6495ed',
          filled: true,
          enabled: true
        });
      } else if (type === 'circle') {
        components.push({
          type: 'Shape',
          shapeType: 'Circle',
          color: '#ff6464',
          filled: true,
          enabled: true
        });
      } else if (type === 'text') {
        components.push({
          type: 'Text',
          text: 'Text',
          textSize: 16,
          font: null,
          align: 'left',
          color: '#ffffff',
          enabled: true
        });
      }

      const newObject = normalizeGameObjects([
        {
          id,
          name: `${baseName} ${newIndex}`,
          type: type === 'circle' ? 'circle' : type === 'text' ? 'text' : 'rect',
          transform: {
            x: 10, // Top-left of viewport
            y: 10,
            width: defaultWidth,
            height: defaultHeight,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            anchor: 'topleft', // Top-left anchor by default
          },
          components,
          visible: true,
          tags: [],
          children: [],
        },
      ])[0];

      setGameObjects((prev) => normalizeGameObjects([...prev, newObject]));
      setExpandedNodes((prev) => {
        const next = new Set(prev);
        next.add(newObject.id);
        return next;
      });
      setSelectedObject(newObject.id);
    },
    [flatGameObjects, viewportWidth, viewportHeight]
  );

  const deleteGameObject = (id) => {
    setGameObjects((prev) => {
      const { updated } = removeObjectInTree(prev, id);
      const normalized = normalizeGameObjects(updated);
      const remainingIds = new Set(flattenGameObjects(normalized).map((node) => node.id));

      setExpandedNodes((prevExpanded) => {
        const next = new Set();
        prevExpanded.forEach((nodeId) => {
          if (remainingIds.has(nodeId)) {
            next.add(nodeId);
          }
        });
        return next;
      });

      if (selectedObject && !remainingIds.has(selectedObject)) {
        setSelectedObject(null);
      }

      return normalized;
    });
  };

  const updateGameObject = (id, updates) => {
    setGameObjects((prev) =>
      updateObjectInTree(prev, id, (obj) => ({
        ...obj,
        ...updates,
      }))
    );
  };

  const addComponent = async (objectId, componentType) => {
    if (componentType === 'Script') {
      await handleAttachScript(objectId, { openEditor: true });
      return;
    }

    const obj = findObjectById(gameObjects, objectId);
    if (!obj) return;

    // Check if component already exists
    if (obj.components.some(c => c.type === componentType)) {
      alert(`${componentType} component already exists!`);
      return;
    }

    const newComponent = { type: componentType, enabled: true };
    
    // Add default properties based on type
    if (componentType === 'Sprite') {
      alert('Use the Sprite Editor to create sprite objects.');
      return;
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
      newComponent.isStatic = false;
      newComponent.velocity = { x: 0, y: 0 };
      newComponent.acceleration = { x: 0, y: 0 };
    } else if (componentType === 'Text') {
      newComponent.text = 'Text';
      newComponent.textSize = 16;
      newComponent.font = null; // null = system default
      newComponent.align = 'left'; // 'left' | 'center' | 'right'
      newComponent.color = '#ffffff';
    }

    setGameObjects((prev) =>
      updateObjectInTree(prev, objectId, (target) => ({
        ...target,
        components: [...target.components, newComponent],
      }))
    );
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      next.add(objectId);
      return next;
    });

  };

  const removeComponent = (objectId, componentType, componentIndex = null) => {
    const obj = findObjectById(gameObjects, objectId);
    if (!obj) return;

    if (componentType === 'Transform') {
      alert('Cannot remove Transform component!');
      return;
    }

    setGameObjects((prev) =>
      updateObjectInTree(prev, objectId, (target) => {
        const nextComponents = [...target.components];
        let indexToRemove = componentIndex;
        if (indexToRemove === null) {
          indexToRemove = nextComponents.findIndex((component) => component.type === componentType);
        }
        if (indexToRemove === -1) {
          return target;
        }
        nextComponents.splice(indexToRemove, 1);
        return {
          ...target,
          components: nextComponents,
        };
      })
    );
  };

  const handleSpriteComponentReplace = useCallback(
    async (objectId, componentIndex, component, file) => {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        if (typeof dataUrl !== 'string') return;

        let previewDataUrl = dataUrl;
        let imagePath = component.properties?.imagePath ?? '';
        let dimensions = null;

        if (currentProject?.path && window.electronAPI?.saveSpriteAsset) {
          try {
            const saveResult = await window.electronAPI.saveSpriteAsset({
              projectPath: currentProject.path,
              name: component.properties?.name || 'Sprite',
              dataUrl,
            });
            if (saveResult?.success) {
              imagePath = saveResult.imagePath;
              if (saveResult.previewDataUrl) {
                previewDataUrl = saveResult.previewDataUrl;
              }
            } else if (saveResult?.message) {
              console.warn('Failed to save sprite asset:', saveResult.message);
            }
          } catch (error) {
            console.error('Failed to save sprite asset:', error);
          }
        }

        try {
          dimensions = await getImageDimensions(previewDataUrl);
        } catch (error) {
          console.warn('Failed to read sprite dimensions:', error);
        }

        setGameObjects((prev) =>
          updateObjectInTree(prev, objectId, (target) => {
            const components = target.components.map((comp, idx) => {
              if (idx !== componentIndex) return comp;
              return {
                ...comp,
                properties: {
                  ...comp.properties,
                  imagePath,
                  dataUrl: previewDataUrl,
                  previewDataUrl,
                },
              };
            });
            const nextTransform = dimensions
              ? {
                  ...target.transform,
                  width: dimensions.width,
                  height: dimensions.height,
                }
              : target.transform;
            return {
              ...target,
              transform: nextTransform,
              components,
            };
          })
        );
      } catch (error) {
        console.error('Failed to update sprite component:', error);
      }
    },
    [currentProject?.path]
  );

  const updateSpriteComponentProperties = useCallback(
    (objectId, componentIndex, propertiesPatch = {}) => {
      setGameObjects((prev) =>
        updateObjectInTree(prev, objectId, (target) => {
          const components = target.components.map((comp, idx) => {
            if (idx !== componentIndex || comp.type !== 'Sprite') return comp;
            const nextProps = {
              ...comp.properties,
              ...propertiesPatch,
            };
            if (propertiesPatch.width !== undefined) {
              nextProps.width = Math.max(1, Math.round(propertiesPatch.width ?? nextProps.width ?? target.transform.width));
              nextProps.originX = clamp(
                nextProps.originX ?? Math.floor(nextProps.width / 2),
                0,
                nextProps.width,
              );
            }
            if (propertiesPatch.height !== undefined) {
              nextProps.height = Math.max(1, Math.round(propertiesPatch.height ?? nextProps.height ?? target.transform.height));
              nextProps.originY = clamp(
                nextProps.originY ?? Math.floor(nextProps.height / 2),
                0,
                nextProps.height,
              );
            }
            return {
              ...comp,
              properties: nextProps,
            };
          });
          const nextTransform =
            propertiesPatch.width !== undefined || propertiesPatch.height !== undefined
              ? {
                  ...target.transform,
                  width: propertiesPatch.width ?? target.transform.width,
                  height: propertiesPatch.height ?? target.transform.height,
                }
              : target.transform;
          return {
            ...target,
            transform: nextTransform,
            components,
          };
        })
      );
    },
    []
  );

  const applySpriteAssetFromPath = useCallback(
    async (objectId, componentIndex, component, assetPath) => {
      if (!assetPath) return;
      const normalizedPath = toForwardSlashPath(assetPath);
      if (!normalizedPath.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp)$/)) {
        alert('Please select an image asset (png, jpg, gif, webp).');
        return;
      }

      try {
        const previewDataUrl = await readSpriteDataUrl(normalizedPath, currentProject?.path);
        if (!previewDataUrl) {
          alert('Failed to load sprite asset preview.');
          return;
        }

        let dimensions = null;
        try {
          dimensions = await getImageDimensions(previewDataUrl);
        } catch (error) {
          console.warn('Failed to read sprite dimensions:', error);
        }

        setGameObjects((prev) =>
          updateObjectInTree(prev, objectId, (target) => {
            const components = target.components.map((comp, idx) => {
              if (idx !== componentIndex) return comp;
              return {
                ...comp,
                properties: {
                  ...comp.properties,
                  imagePath: normalizedPath,
                  previewDataUrl,
                  dataUrl: previewDataUrl,
                  width: dimensions?.width ?? comp.properties?.width ?? target.transform.width,
                  height: dimensions?.height ?? comp.properties?.height ?? target.transform.height,
                  originX:
                    comp.properties?.originX ?? 0, // Top-left anchor by default
                  originY:
                    comp.properties?.originY ?? 0,
                },
              };
            });

            const nextTransform = dimensions
              ? {
                  ...target.transform,
                  width: dimensions.width,
                  height: dimensions.height,
                }
              : target.transform;

            return {
              ...target,
              transform: nextTransform,
              components,
            };
          })
        );
      } catch (error) {
        console.error('Failed to apply sprite asset:', error);
        alert('Failed to apply sprite asset. See console for details.');
      }
    },
    [currentProject?.path]
  );

  const handleSpriteApplySelectedAsset = useCallback(
    (objectId, componentIndex, component) => {
      if (!selectedFilePath) {
        alert('Select an asset in the File System first.');
        return;
      }
      const node = findNodeByPath(fileTree, selectedFilePath);
      if (!node || node.type !== 'file') {
        alert('Select an asset file in the File System to use as a texture.');
        return;
      }
      if (node.category !== 'assets') {
        alert('Only files from the Assets folder can be used as textures.');
        return;
      }
      applySpriteAssetFromPath(objectId, componentIndex, component, node.path);
    },
    [selectedFilePath, fileTree, applySpriteAssetFromPath]
  );

  const handleSceneMouseDown = (e, obj) => {
    const canvas = sceneCanvasRef.current;
    if (!canvas) return;
    
    // Handle panning: middle mouse button or space + left click
    const isMiddleButton = e.button === 1;
    const isPanGesture = isMiddleButton || (isSpacePressed && e.button === 0);
    
    if (isPanGesture) {
      e.preventDefault();
      e.stopPropagation();
      setIsPanning(true);
      setPanStart({
        x: e.clientX + canvas.scrollLeft,
        y: e.clientY + canvas.scrollTop,
      });
      return;
    }
    
    // Handle object interaction
    if (!e.target.closest('.game-object')) return;
    e.stopPropagation();
    setSelectedObject(obj.id);
    if (e.button !== 0) return;
    
    // Handle rotation
    if (activeTool === 'rotate') {
      handleRotateStart(e, obj);
      return;
    }
    
    // Handle dragging
    if (activeTool !== 'move') return;
    setIsDragging(true);
    const { x, y } = getCanvasCoordinates(e);
    // dragOffset is relative to the anchor point position (transform.x/y)
    setDragOffset({
      x: x - obj.transform.x,
      y: y - obj.transform.y,
    });
  };

  const handleSceneMouseMove = (e) => {
    const canvas = sceneCanvasRef.current;
    if (!canvas) return;
    
    // Handle panning
    if (isPanning) {
      e.preventDefault();
      canvas.scrollLeft = panStart.x - e.clientX;
      canvas.scrollTop = panStart.y - e.clientY;
      return;
    }
    
    // Handle object dragging
    if (!isDragging || !selectedObject || activeTool !== 'move' || isResizing || isRotating) return;
    const { x, y } = getCanvasCoordinates(e);
    const obj = findObjectById(gameObjects, selectedObject);
    if (!obj) return;
    // Update anchor point position (transform.x/y represents the anchor point)
    updateGameObject(selectedObject, {
      transform: {
        ...obj.transform,
        x: Math.round(x - dragOffset.x),
        y: Math.round(y - dragOffset.y),
      },
    });
  };

  const handleSceneMouseUp = () => {
    setIsDragging(false);
    setIsPanning(false);
  };
  
  const handleSceneMouseLeave = () => {
    setIsDragging(false);
    setIsPanning(false);
  };

  const handleSelectionDragStart = useCallback(
    (event, object) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      event.preventDefault();
      const { x, y } = getCanvasCoordinates(event);
      setSelectedObject(object.id);
      if (activeTool !== 'move') {
        setActiveTool('move');
      }
      setIsResizing(false);
      // dragOffset is relative to the anchor point position (transform.x/y)
      setDragOffset({
        x: x - object.transform.x,
        y: y - object.transform.y,
      });
      setIsDragging(true);
    },
    [activeTool, getCanvasCoordinates, setActiveTool]
  );

  // ===== SCENE MANAGEMENT =====
  const handleCreateNewScene = async () => {
    const sceneName = await showInputModal('Create Scene', 'Enter new scene name (e.g., Level1, GameOver):', '');
    if (!sceneName || sceneName.trim() === '') return;
    
    if (!currentProject?.scenePath) {
      alert('Load or create a project before adding scenes.');
      return;
    }
    
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
        // Create corresponding TS file
        const tsFilePath = `${currentProject.path}\\scenes\\${cleanName}.ts`;
        const sceneCode = `import type { GameContext } from '../engine';\nimport { pos, rect, circle, body, area } from '../engine';\n\n// ${cleanName} - Created with ReGame Editor\nexport function ${cleanName}(ctx: GameContext): void {\n  // Empty scene - Add GameObjects in the editor!\n}\n`;
        await window.electronAPI.saveFile(tsFilePath, sceneCode);
        
        // Update available scenes
        setAvailableScenes(prev => [...prev, cleanName]);
        alert(`✅ Scene "${cleanName}" created successfully!`);
        await refreshFileTree();
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
        const hydratedObjects = await hydrateGameObjects(sceneData.objects || [], currentProject.path);
        setGameObjects(hydratedObjects);
        
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
      objects: prepareObjectsForSave(gameObjects)
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
  const openScriptEditor = async (objectId, options = {}) => {
    if (objectId) {
      const obj = findObjectById(gameObjects, objectId);
      if (!obj) return;

      const scriptComponent = obj.components.find(c => c.type === 'Script');
      if (!scriptComponent) {
        alert('This object has no script component.');
        return;
      }

      let scriptCode = scriptComponent.code || '';
      const scriptPath = scriptComponent.scriptPath ? toForwardSlashPath(scriptComponent.scriptPath) : '';
      let absolutePath = null;

      if (scriptPath && currentProject?.path) {
        absolutePath = getAbsolutePathFromRelative(scriptPath);
        const scriptResult = await readScriptFile(scriptPath);
        if (scriptResult.success) {
          scriptCode = scriptResult.content;
        }
      }

      setEditingScript({
        objectId,
        scriptCode,
        scriptPath,
        filePath: absolutePath,
        relativePath: scriptPath,
      });
      if (scriptPath) {
        setExpandedFileNodes((prev) => {
          const next = new Set(prev);
          const parts = scriptPath.split('/');
          let current = '';
          parts.slice(0, -1).forEach((segment) => {
            current = current ? `${current}/${segment}` : segment;
            next.add(current);
          });
          return next;
        });
        setSelectedFilePath(scriptPath);
      }
      setScriptEditorOpen(true);
      return;
    }

    if (options.relativePath) {
      const scriptPath = toForwardSlashPath(options.relativePath);
      const absolutePath = getAbsolutePathFromRelative(scriptPath);
      if (!absolutePath) {
        alert('Unable to locate script file.');
        return;
      }
      const scriptResult = await readScriptFile(scriptPath);
      if (!scriptResult.success) {
        alert(`Failed to read script: ${scriptResult.message || 'Unknown error'}`);
        return;
      }
      setEditingScript({
        objectId: null,
        scriptCode: scriptResult.content,
        scriptPath,
        filePath: absolutePath,
        relativePath: scriptPath,
      });
      setExpandedFileNodes((prev) => {
        const next = new Set(prev);
        const parts = scriptPath.split('/');
        let current = '';
        parts.slice(0, -1).forEach((segment) => {
          current = current ? `${current}/${segment}` : segment;
          next.add(current);
        });
        return next;
      });
      setSelectedFilePath(scriptPath);
      setScriptEditorOpen(true);
    }
  };

  const saveScriptCode = async (code) => {
    if (!editingScript) return;

    // Saving a standalone file (opened via file explorer)
    if (!editingScript.objectId) {
      if (!editingScript.filePath) {
        alert('No file selected for saving.');
        return;
      }
      await ensureDirectoryForFile(editingScript.filePath);
      await window.electronAPI.saveFile(editingScript.filePath, code);
      if (editingScript.relativePath) {
        updateScriptCodeForPath(editingScript.relativePath, code);
      }
      setEditingScript(null);
      setScriptEditorOpen(false);
      await refreshFileTree();
      return;
    }
    
    const obj = findObjectById(gameObjects, editingScript.objectId);
    if (!obj) return;
    
    const existingScriptComponent = obj.components.find(c => c.type === 'Script');
    const existingPath = existingScriptComponent?.scriptPath ? toForwardSlashPath(existingScriptComponent.scriptPath) : '';
    let scriptPath = existingPath;

    if (currentProject?.scenePath && !scriptPath) {
      const defaultStem = sanitizeFileStem(`${obj.name || 'Script'}Script`);
      const userInput = await showInputModal(
        'Save Script File',
        'Enter script file name (relative to scripts/). You can use folders like player/move:',
        defaultStem
      );
      if (userInput === null || userInput === '') {
        return;
      }
      const sanitizedRelative = sanitizeRelativeScriptPath(userInput);
      const fileStem = sanitizedRelative || defaultStem;
      // Use .ts extension for TypeScript support
      const hasExtension = fileStem.toLowerCase().endsWith('.js') || fileStem.toLowerCase().endsWith('.ts');
      scriptPath = toForwardSlashPath(`scripts/${fileStem}${hasExtension ? '' : '.ts'}`);
    }

    if (currentProject?.scenePath && scriptPath) {
      const absolutePath = getAbsolutePathFromRelative(scriptPath);
      if (absolutePath) {
        await ensureDirectoryForFile(absolutePath);
        await window.electronAPI.saveFile(absolutePath, code);
      }
      await refreshFileTree();
    }

    const normalizedPath = scriptPath ? toForwardSlashPath(scriptPath) : '';

    let updatedTree = updateObjectInTree(gameObjects, editingScript.objectId, (target) => ({
      ...target,
      components: target.components.map((component) => {
        if (component.type !== 'Script') return component;
        const componentPath = component.scriptPath ? toForwardSlashPath(component.scriptPath) : '';
        const nextComponent = {
          ...component,
          code,
        };
        const finalPath = normalizedPath || componentPath;
        if (finalPath) {
          nextComponent.scriptPath = finalPath;
        }
        return nextComponent;
      }),
    }));

    if (normalizedPath) {
      updatedTree = mapTree(updatedTree, (node) => ({
        ...node,
        components: node.components.map((component) => {
          const componentPath = component.scriptPath ? toForwardSlashPath(component.scriptPath) : '';
          if (component.type === 'Script' && componentPath === normalizedPath) {
            return { ...component, code };
          }
          return component;
        }),
      }));
    }

    const normalizedUpdatedTree = normalizeGameObjects(updatedTree);
    setGameObjects(normalizedUpdatedTree);
    setEditingScript(null);
    
    if (!currentProject?.scenePath) {
      console.warn('No project loaded - cannot auto-save script');
      return;
    }
    
    try {
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
        objects: prepareObjectsForSave(normalizedUpdatedTree),
      };
      
      await window.electronAPI.saveFile(sceneFilePath, JSON.stringify(sceneData, null, 2));
      
      for (const sceneName of availableScenes) {
        const sceneJsonPath = `${currentProject.path}\\scenes\\${sceneName}.json`;
        const sceneTsPath = `${currentProject.path}\\scenes\\${sceneName === 'MainScene' ? 'Main' : sceneName}.ts`;
        
        const sceneResult = await window.electronAPI.readFile(sceneJsonPath);
        if (sceneResult.success) {
          const sceneDataForScript = JSON.parse(sceneResult.content);
          const sceneObjectsWithCode = await attachScriptCodeToObjects(sceneDataForScript.objects || [], currentProject.path);
          // Try to read .ts first, fallback to .js for backwards compatibility
          const existingSceneResult = await window.electronAPI.readFile(sceneTsPath);
          const existingSceneCode = existingSceneResult.success ? existingSceneResult.content : '';
          const gameCode = generateSceneCode(
            sceneName,
            sceneObjectsWithCode || [],
            sceneDataForScript.viewport || { width: viewportWidth, height: viewportHeight },
            existingSceneCode
          );
          await window.electronAPI.saveFile(sceneTsPath, gameCode);
          console.log(`✅ Generated ${sceneName}.ts`);
        }
      }
      
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
    if (!currentProject?.scenePath) {
      alert('No project loaded - cannot save!');
      return;
    }

    try {
      // Save current scene JSON
      await saveCurrentScene();
      
      // Generate TS files for ALL scenes
      for (const sceneName of availableScenes) {
        const sceneJsonPath = `${currentProject.path}\\scenes\\${sceneName}.json`;
        const sceneTsPath = `${currentProject.path}\\scenes\\${sceneName === 'MainScene' ? 'Main' : sceneName}.ts`;
        
        // Read scene data
        const sceneResult = await window.electronAPI.readFile(sceneJsonPath);
        if (sceneResult.success) {
          const sceneData = JSON.parse(sceneResult.content);
          const sceneObjectsWithCode = await attachScriptCodeToObjects(sceneData.objects || [], currentProject.path);
          // Try to read .ts first, fallback to .js for backwards compatibility
          const existingSceneResult = await window.electronAPI.readFile(sceneTsPath);
          const existingSceneCode = existingSceneResult.success ? existingSceneResult.content : '';
          const gameCode = generateSceneCode(
            sceneName,
            sceneObjectsWithCode || [],
            sceneData.viewport || { width: viewportWidth, height: viewportHeight },
            existingSceneCode
          );
          await window.electronAPI.saveFile(sceneTsPath, gameCode);
          console.log(`✅ Generated ${sceneName}.ts`);
        }
      }
      
      // Update App.js to register all scenes
      await generateAppJs();
      
      alert(`Scene saved successfully! ✅\n\nSaved:\n- ${currentSceneName}.json (editor data)\n- Generated TS files for all scenes\n- Updated App.js`);
      
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
      <div className="container menuContainer">
        <div className="menuBackdrop" />
        <div className="menuShell">
          <div className="header menuHeader">
            <div className="menuHeaderLeft">
              <div className="menuLogo">🎮</div>
              <div className="menuHeading">
                <h1 className="title menuTitle">ReGame Engine</h1>
                <p className="subtitle menuSubtitle">
                  Electron Edition · Visual Kaplay scene builder for Expo Dev Builds
                </p>
              </div>
            </div>
            <div className="menuHeaderRight">
              <span className="menuChip">Expo SDK 54</span>
              <span className="menuChip">Skia · Reanimated · Kaplay</span>
            </div>
          </div>

          <div className="content menuContent">
            {/* Create New Project Card */}
            <div className="card">
              <div className="cardHeader">
                <div className="cardIcon">📁</div>
                <div>
                  <h2 className="cardTitle">Create New Project</h2>
                  <p className="cardDesc">Set up a new game project with ReGame Engine</p>
                </div>
              </div>
              <div className="cardFooter">
                <button 
                  className="button buttonPrimary" 
                  onClick={() => setMode('create')}
                >
                  Create Project
                </button>
              </div>
            </div>

            {/* Quick Start Card */}
            <div className="card">
              <div className="cardHeader">
                <div className="cardIcon">⚡</div>
                <div>
                  <h2 className="cardTitle">Quick Start</h2>
                  <p className="cardDesc">Jump into the editor without saving files</p>
                </div>
              </div>
              <div className="cardBody">
                <input
                  className="input"
                  type="text"
                  placeholder="Project Name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
                <p className="cardHint">
                  We keep this session in memory only – perfect for rapid prototyping.
                </p>
              </div>
              <div className="cardFooter">
                <button 
                  className="button buttonSecondary" 
                  onClick={handleQuickStart}
                >
                  Open Editor
                </button>
              </div>
            </div>

            {/* Recent Projects */}
            <div className="card">
              <div className="cardHeader">
                <div className="cardIcon">📂</div>
                <div>
                  <h2 className="cardTitle">Recent Projects</h2>
                  <p className="cardDesc">Open a recently edited project</p>
                </div>
              </div>
              <div className="cardBody">
                {recentProjects.length === 0 ? (
                  <p className="emptyState">No recent projects yet</p>
                ) : (
                  <div className="recentProjectsList">
                    {recentProjects.slice(0, 5).map((project, idx) => (
                      <div key={idx} className="recentProjectItem">
                        <button
                          className="recentProjectInfo"
                          onClick={() => handleOpenRecentProject(project)}
                        >
                          <div className="recentProjectName">🎮 {project.name}</div>
                          <div className="recentProjectPath">{project.path}</div>
                        </button>
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
              </div>
              <div className="cardFooter">
                <button 
                  className="button buttonSecondary" 
                  onClick={handleBrowseExistingProject}
                >
                  📁 Browse for Project
                </button>
              </div>
            </div>
          </div>

          <footer className="menuFooter">
            <span>Tip: We mirror changes to both the template and your open project.</span>
            <span>Need to locate projects? Check <code>RegameProjects/</code> in your documents.</span>
          </footer>
        </div>
      </div>
    );
  }

  // Create Mode - Project Creator
  if (mode === 'create') {
    return (
      <div className="container createContainer">
        <div className="menuBackdrop" />
        <div className="createShell">
          <div className="createHeader">
            <button className="backButton" onClick={() => setMode('menu')}>
              ← Back
            </button>
            <div className="createHeading">
              <h1 className="title createTitle">Create New Project</h1>
              <p className="createSubtitle">
                Bootstrap an Expo Dev Build ready project with the latest ReGame engine template.
              </p>
            </div>
          </div>

          <div className="content createContent">
            <div className="form">
              <label className="label" htmlFor="project-name">
                Project Name
              </label>
              <input
                id="project-name"
                className="input"
                type="text"
                placeholder="MyAwesomeGame"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />

              <label className="label" htmlFor="project-path">
                Project Location
              </label>
              <div className="inputRow">
                <input
                  id="project-path"
                  className="input inputWithButton"
                  type="text"
                  placeholder="C:\\Users\\YourName\\Documents\\RegameProjects"
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
                We copy the engine template, sync the Expo config, and wire up the generator chain for you.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Editor Mode - Main Editor Interface
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
        {/* Left Panel: Scene Tree (top) + File System (bottom) */}
        <div className="hierarchy">
          {/* Scene Tree Panel */}
          <div className="leftPanelSection">
            <div className="panelHeader">
              <h3 className="panelTitle">Scene</h3>
              <button className="addTreeButton" onClick={addGameObject} title="Add Node">
                +
              </button>
            </div>
            <div className="panelContent treePanel">
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
                <div
                  className={`treeChildren ${draggedObjectId ? 'treeChildrenDropping' : ''}`}
                  onDragOver={(e) => {
                    if (!draggedObjectId) return;
                    e.preventDefault();
                  }}
                  onDrop={handleHierarchyDropRoot}
                >
                  {renderHierarchyTree(gameObjects)}
                  {draggedObjectId && <div className="treeDropHint">Drop here to send to back</div>}
                </div>
              )}
            </div>
          </div>

          {/* File System Panel */}
          <div className="leftPanelSection">
            <div className="panelHeader">
              <h3 className="panelTitle">FileSystem</h3>
              <div className="fileExplorerActions">
                <button className="tinyButton" onClick={handleCreateScriptFile} title="Create Script">📜</button>
                <button className="tinyButton" onClick={handleCreateFolder} title="Create Folder">📁</button>
              </div>
            </div>
            <div className="panelContent fileTree">
              {currentProject?.scenePath ? (
                fileTree.length === 0 ? (
                  <p className="emptyState" style={{ margin: '8px 0' }}>Loading files...</p>
                ) : (
                  fileTree.map((node) => renderFileNode(node))
                )
              ) : (
                <p className="emptyState" style={{ margin: '8px 0' }}>
                  Load a project to view files
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Center: Scene View */}
        <div className="sceneView">
          <div className="panelHeader">
            <h3 className="panelTitle">Scene</h3>
            <div className="sceneTools">
              {sceneToolButtons.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  className={`toolButton ${activeTool === tool.id ? 'active' : ''} ${tool.disabled ? 'disabled' : ''}`}
                  onClick={() => !tool.disabled && setActiveTool(tool.id)}
                  title={tool.label + (tool.disabled ? ' (coming soon)' : '')}
                  disabled={tool.disabled}
                >
                  <span className="toolIcon">{tool.icon}</span>
                </button>
              ))}
              <div className="zoomControls">
                <button
                  type="button"
                  className="toolButton zoomButton"
                  onClick={handleZoomOut}
                  title="Zoom Out (Ctrl + - / Cmd + -)"
                >
                  −
                </button>
                <span className="zoomValue">{Math.round(canvasZoom * 100)}%</span>
                <button
                  type="button"
                  className="toolButton zoomButton"
                  onClick={handleZoomIn}
                  title="Zoom In (Ctrl + + / Cmd + +)"
                >
                  +
                </button>
                <button
                  type="button"
                  className="zoomResetButton"
                  onClick={handleZoomReset}
                  title="Reset Zoom"
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="zoomResetButton"
                  onClick={handleRecenter}
                  title="Recenter Camera on (0,0)"
                >
                  Recenter
                </button>
              </div>
            </div>
          </div>
          <div className="sceneCanvasWrapper">
            <div
              ref={sceneCanvasRef}
              className={`sceneCanvas ${isPanning || isSpacePressed ? 'panning' : ''}`}
              onMouseMove={handleSceneMouseMove}
              onMouseUp={handleSceneMouseUp}
              onMouseLeave={handleSceneMouseLeave}
              onMouseDown={(e) => handleSceneMouseDown(e, null)}
              onWheel={handleCanvasWheel}
              onContextMenu={(e) => {
                // Prevent context menu on middle mouse button
                if (e.button === 1) {
                  e.preventDefault();
                }
              }}
            >
              <div
                className="sceneCanvasContent"
                style={{
                  width: `${canvasContentWidth}px`,
                  height: `${canvasContentHeight}px`,
                  minWidth: '4000px',
                  minHeight: '4000px',
                }}
              >
                <div
                  className="sceneCanvasScaleLayer"
                  style={{
                    width: `${canvasContentWidth}px`,
                    height: `${canvasContentHeight}px`,
                    transform: `scale(${canvasZoom})`,
                    transformOrigin: 'top left',
                  }}
                >
                  <div className="originGuides">
                    <div className="originAxis originAxisX" />
                    <div className="originAxis originAxisY" />
                    <div className="originLabel">0,0</div>
                  </div>

                  {renderableObjects.length === 0 ? (
                    <>
                      <div className="canvasText">🎨 Scene Canvas</div>
                      <div className="canvasHelp">Add GameObjects from the Hierarchy panel</div>
                    </>
                  ) : (
                    renderableObjects.map((obj) => {
                      const shapeComponent = obj.components.find((c) => c.type === 'Shape');
                      const spriteComponent = obj.components.find((c) => c.type === 'Sprite');
                      const textComponent = obj.components.find((c) => c.type === 'Text');
                      const areaComponent = obj.components.find((c) => c.type === 'Area');

                      const isSprite = obj.type === 'sprite' || Boolean(spriteComponent);
                      const spriteProps = spriteComponent?.properties ?? {};
                      const spriteSource = spriteProps.dataUrl || spriteProps.previewDataUrl || '';

                      const isCircle = obj.type === 'circle' || shapeComponent?.shapeType === 'Circle';

                      let fillColor = '#666666';
                      if (obj.type === 'rect') {
                        fillColor = '#6495ed';
                      } else if (obj.type === 'circle') {
                        fillColor = '#ff6464';
                      }
                      if (shapeComponent?.color) {
                        fillColor = shapeComponent.color;
                      }
                      if (isSprite || textComponent) {
                        fillColor = 'transparent';
                      }

                      // Calculate object dimensions - check sprite first, then shape, then transform, then default
                      const objectWidth = spriteComponent?.properties?.width 
                        ?? obj.transform.width 
                        ?? shapeComponent?.width 
                        ?? 100;
                      const objectHeight = spriteComponent?.properties?.height 
                        ?? obj.transform.height 
                        ?? shapeComponent?.height 
                        ?? 100;

                      const areaScaleX = areaComponent?.scale?.x ?? 1;
                      const areaScaleY = areaComponent?.scale?.y ?? 1;

                      const areaWidth = (() => {
                        if (!areaComponent) return objectWidth;
                        if (areaComponent.width != null) return areaComponent.width;
                        if (areaComponent.radius != null) return areaComponent.radius * 2;
                        // For sprites, use sprite dimensions (matching CollisionSystem behavior)
                        if (isSprite && spriteComponent?.properties?.width) {
                          return spriteComponent.properties.width;
                        }
                        return objectWidth;
                      })() * areaScaleX;

                      const areaHeight = (() => {
                        if (!areaComponent) return objectHeight;
                        if (areaComponent.height != null) return areaComponent.height;
                        if (areaComponent.radius != null) return areaComponent.radius * 2;
                        // For sprites, use sprite dimensions (matching CollisionSystem behavior)
                        if (isSprite && spriteComponent?.properties?.height) {
                          return spriteComponent.properties.height;
                        }
                        return objectHeight;
                      })() * areaScaleY;

                      const areaOffsetX = areaComponent?.offset?.x ?? 0;
                      const areaOffsetY = areaComponent?.offset?.y ?? 0;

                      // Calculate visual top-left position based on anchor
                      // transform.x/y represents the anchor point position
                      const getTopLeftFromAnchor = (anchor, anchorX, anchorY, w, h) => {
                        switch (anchor || 'topleft') {
                          case 'topleft': return { x: anchorX, y: anchorY };
                          case 'top': return { x: anchorX - w / 2, y: anchorY };
                          case 'topright': return { x: anchorX - w, y: anchorY };
                          case 'left': return { x: anchorX, y: anchorY - h / 2 };
                          case 'center': return { x: anchorX - w / 2, y: anchorY - h / 2 };
                          case 'right': return { x: anchorX - w, y: anchorY - h / 2 };
                          case 'botleft': return { x: anchorX, y: anchorY - h };
                          case 'bot': return { x: anchorX - w / 2, y: anchorY - h };
                          case 'botright': return { x: anchorX - w, y: anchorY - h };
                          default: return { x: anchorX - w / 2, y: anchorY - h / 2 };
                        }
                      };
                      
                      const visualTopLeft = isSprite 
                        ? { x: obj.transform.x, y: obj.transform.y } // Sprites use originX/originY, not anchor
                        : getTopLeftFromAnchor(
                            obj.transform.anchor,
                            obj.transform.x,
                            obj.transform.y,
                            objectWidth,
                            objectHeight
                          );
                      
                      return (
                        <React.Fragment key={obj.id}>
                          <div
                            className={`game-object ${selectedObject === obj.id ? 'selected-object' : ''} ${dragOverObjectId === obj.id ? 'drag-over-script' : ''}`}
                            style={{
                              position: 'absolute',
                              left: visualTopLeft.x + canvasCenterOffsetX,
                              top: visualTopLeft.y + canvasCenterOffsetY,
                              width: objectWidth,
                              height: objectHeight,
                              backgroundColor: fillColor,
                              borderRadius: isCircle ? '50%' : '6px',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          cursor:
                            selectedObject === obj.id && isDragging
                              ? 'grabbing'
                              : selectedObject === obj.id && isRotating
                              ? 'grabbing'
                              : activeTool === 'move'
                              ? 'grab'
                              : activeTool === 'rotate'
                              ? 'crosshair'
                              : 'default',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontSize: '12px',
                              userSelect: 'none',
                          boxShadow:
                            selectedObject === obj.id
                              ? '0 0 0 1px rgba(131, 157, 255, 0.75), 0 0 20px rgba(88, 110, 255, 0.35)'
                              : dragOverObjectId === obj.id
                              ? '0 0 0 2px rgba(0, 255, 136, 0.9), 0 0 25px rgba(0, 255, 136, 0.5)'
                              : 'none',
                              overflow: 'hidden',
                              transform: `rotate(${obj.transform.rotation || 0}deg)`,
                              transformOrigin: `${(obj.transform.x - visualTopLeft.x)}px ${(obj.transform.y - visualTopLeft.y)}px`,
                            }}
                            onMouseDown={(e) => handleSceneMouseDown(e, obj)}
                            onDragOver={(e) => {
                              if (isDraggingAssetFile(e)) {
                                e.preventDefault();
                                e.stopPropagation();
                                setDragOverObjectId(obj.id);
                              }
                            }}
                            onDrop={(e) => {
                              const scriptPath = extractScriptPathFromDragEvent(e);
                              if (scriptPath) {
                                e.preventDefault();
                                e.stopPropagation();
                                setDragOverObjectId(null);
                                attachScriptToObjectFromPath(obj.id, scriptPath);
                              }
                            }}
                            onDragLeave={() => {
                              setDragOverObjectId(null);
                            }}
                          >
                            {isSprite ? (
                              spriteSource ? (
                                <img
                                  src={spriteSource}
                                  alt={obj.name}
                                  className="sceneSpriteImage"
                                  draggable={false}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    imageRendering: 'pixelated',
                                    pointerEvents: 'none',
                                  }}
                                />
                              ) : (
                                <div className="sceneSpritePlaceholder">No Sprite</div>
                              )
                            ) : textComponent ? (
                              <div
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: textComponent.align === 'center' ? 'center' : textComponent.align === 'right' ? 'flex-end' : 'flex-start',
                                  fontSize: `${textComponent.textSize || 16}px`,
                                  color: textComponent.color || '#ffffff',
                                  fontFamily: 'system-ui, -apple-system, sans-serif',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  padding: '4px',
                                  pointerEvents: 'none',
                                }}
                              >
                                {textComponent.text || 'Text'}
                              </div>
                            ) : (
                              <span>{obj.name}</span>
                            )}
                          </div>

                      {selectedObject === obj.id && (
                        <div
                          className="selectionOverlay"
                          style={{
                            left: visualTopLeft.x + canvasCenterOffsetX,
                            top: visualTopLeft.y + canvasCenterOffsetY,
                            width: objectWidth,
                            height: objectHeight,
                            transform: `rotate(${obj.transform.rotation || 0}deg)`,
                            transformOrigin: `${(obj.transform.x - visualTopLeft.x)}px ${(obj.transform.y - visualTopLeft.y)}px`,
                          }}
                        >
                          <div className="selectionOutline" />

                          <div
                            className="selectionCenterHandle"
                            style={{
                              left: `${(obj.transform.x - visualTopLeft.x)}px`,
                              top: `${(obj.transform.y - visualTopLeft.y)}px`,
                            }}
                            onMouseDown={(e) => handleSelectionDragStart(e, obj)}
                            title={obj.transform.rotation && Math.abs(obj.transform.rotation) > 0.1 
                              ? `Anchor point (${Math.round(obj.transform.rotation)}° rotated)`
                              : "Drag to move (anchor point)"}
                          />

                          {(() => {
                            // Show resize handles even when rotated (like Godot/Unity)
                            const size = 12;
                            const half = size / 2;
                            const positions = {
                              nw: { left: -half, top: -half, cursor: 'nwse-resize' },
                              n: { left: objectWidth / 2 - half, top: -half, cursor: 'ns-resize' },
                              ne: { left: objectWidth - half, top: -half, cursor: 'nesw-resize' },
                              e: { left: objectWidth - half, top: objectHeight / 2 - half, cursor: 'ew-resize' },
                              se: { left: objectWidth - half, top: objectHeight - half, cursor: 'nwse-resize' },
                              s: { left: objectWidth / 2 - half, top: objectHeight - half, cursor: 'ns-resize' },
                              sw: { left: -half, top: objectHeight - half, cursor: 'nesw-resize' },
                              w: { left: -half, top: objectHeight / 2 - half, cursor: 'ew-resize' },
                            };

                            return Object.entries(positions).map(([handle, position]) => (
                              <div
                                key={`${obj.id}-${handle}`}
                                className="selectionHandle"
                                style={{
                                  left: position.left,
                                  top: position.top,
                                  cursor: position.cursor,
                                  width: size,
                                  height: size,
                                }}
                                onMouseDown={(e) => handleResizeStart(e, handle, obj)}
                                title="Drag to resize"
                              />
                            ));
                          })()}

                          <div
                            className="selectionAxis axisX"
                            style={{
                              left: `${(obj.transform.x - visualTopLeft.x)}px`,
                              top: `${(obj.transform.y - visualTopLeft.y) - 26}px`,
                              width: Math.max(objectWidth + 60, 110),
                            }}
                          >
                            <div className="axisLine" />
                            <div className="axisArrow" />
                            <span className="axisLabel">X</span>
                          </div>

                          <div
                            className="selectionAxis axisY"
                            style={{
                              left: `${(obj.transform.x - visualTopLeft.x) - 26}px`,
                              top: `${(obj.transform.y - visualTopLeft.y)}px`,
                              height: Math.max(objectHeight + 60, 110),
                            }}
                          >
                            <div className="axisLine" />
                            <div className="axisArrow" />
                            <span className="axisLabel">Y</span>
                          </div>
                        </div>
                      )}

                          {/* Debug Mode: Show Area Component */}
                          {debugMode && areaComponent && (
                            <div
                              style={{
                                position: 'absolute',
                                // Area is positioned relative to the visual top-left corner
                                left: visualTopLeft.x + areaOffsetX + canvasCenterOffsetX,
                                top: visualTopLeft.y + areaOffsetY + canvasCenterOffsetY,
                                width: areaWidth,
                                height: areaHeight,
                                border: '2px solid #00ff00',
                                borderRadius: isCircle || areaComponent.radius != null ? '50%' : '0',
                                pointerEvents: 'none',
                                zIndex: 999,
                                transform: `rotate(${obj.transform.rotation || 0}deg)`,
                                transformOrigin: `${(obj.transform.x - visualTopLeft.x - areaOffsetX)}px ${(obj.transform.y - visualTopLeft.y - areaOffsetY)}px`,
                              }}
                            />
                          )}

                          {/* Debug Mode: Show Anchor Point */}
                          {debugMode && (
                            <div
                              style={{
                                position: 'absolute',
                                left: obj.transform.x + canvasCenterOffsetX,
                                top: obj.transform.y + canvasCenterOffsetY,
                                pointerEvents: 'none',
                                zIndex: 1000,
                              }}
                            >
                              {/* Crosshair for anchor point */}
                              <div
                                style={{
                                  position: 'absolute',
                                  left: '-6px',
                                  top: '-1px',
                                  width: '12px',
                                  height: '2px',
                                  backgroundColor: '#ff00ff',
                                }}
                              />
                              <div
                                style={{
                                  position: 'absolute',
                                  left: '-1px',
                                  top: '-6px',
                                  width: '2px',
                                  height: '12px',
                                  backgroundColor: '#ff00ff',
                                }}
                              />
                              {/* Center dot */}
                              <div
                                style={{
                                  position: 'absolute',
                                  left: '-2px',
                                  top: '-2px',
                                  width: '4px',
                                  height: '4px',
                                  backgroundColor: '#ffff00',
                                  borderRadius: '50%',
                                  border: '1px solid #ff00ff',
                                }}
                              />
                            </div>
                          )}

                        </React.Fragment>
                      );
                    })
                  )}

                  <div
                    className="cameraViewport"
                    style={{
                      position: 'absolute',
                      left: canvasCenterOffsetX,
                      top: canvasCenterOffsetY,
                      width: `${viewportWidth}px`,
                      height: `${viewportHeight}px`,
                      border: '2px solid #00ff88',
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                      pointerEvents: 'none',
                      zIndex: 1000,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: '-24px',
                        left: '0',
                        fontSize: '11px',
                        color: '#00ff88',
                        fontWeight: 'bold',
                        background: '#1a1a2e',
                        padding: '2px 6px',
                        borderRadius: '3px',
                      }}
                    >
                      📷 {viewportWidth} × {viewportHeight}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="rightSidebar">
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
                  <div className="componentSection">
                    <div className="componentHeader" onClick={() => toggleSection('name')}>
                      <span className="sectionToggle">{expandedSections.has('name') ? '▾' : '▸'}</span>
                      <strong>Name</strong>
                    </div>
                    {expandedSections.has('name') && (
                      <div className="propertyGroup">
                        <label className="propertyLabel">Name</label>
                        <input
                          className="propertyInput"
                          type="text"
                          value={selectedObj.name}
                          onChange={(e) => updateGameObject(selectedObj.id, { name: e.target.value })}
                        />
                      </div>
                    )}
                  </div>

                  {/* Transform Component */}
                  <div className="componentSection">
                    <div className="componentHeader" onClick={() => toggleSection('transform')}>
                      <span className="sectionToggle">{expandedSections.has('transform') ? '▾' : '▸'}</span>
                      <strong>Transform</strong>
                    </div>
                    {expandedSections.has('transform') && (
                      <>
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
                            onChange={(e) => {
                              const nextWidth = parseFloat(e.target.value) || 1;
                              updateGameObject(selectedObj.id, {
                                transform: { ...selectedObj.transform, width: nextWidth }
                              });
                              const spriteIndex = selectedObj.components.findIndex((comp) => comp.type === 'Sprite');
                              if (spriteIndex !== -1) {
                                updateSpriteComponentProperties(selectedObj.id, spriteIndex, { width: nextWidth });
                              }
                            }}
                          />
                        </div>
                        <div className="propertyGroup">
                          <label className="propertyLabel">Height</label>
                          <input
                            className="propertyInput"
                            type="number"
                            value={selectedObj.transform.height}
                            onChange={(e) => {
                              const nextHeight = parseFloat(e.target.value) || 1;
                              updateGameObject(selectedObj.id, {
                                transform: { ...selectedObj.transform, height: nextHeight }
                              });
                              const spriteIndex = selectedObj.components.findIndex((comp) => comp.type === 'Sprite');
                              if (spriteIndex !== -1) {
                                updateSpriteComponentProperties(selectedObj.id, spriteIndex, { height: nextHeight });
                              }
                            }}
                          />
                        </div>
                        <div className="propertyGroup">
                          <label className="propertyLabel">Rotation (°)</label>
                          <input
                            className="propertyInput"
                            type="number"
                            value={Math.round(selectedObj.transform.rotation || 0)}
                            onChange={(e) => updateGameObject(selectedObj.id, {
                              transform: { ...selectedObj.transform, rotation: parseFloat(e.target.value) || 0 }
                            })}
                            step="15"
                            min="-180"
                            max="180"
                          />
                        </div>
                        {(() => {
                          // Anchor selector for all objects
                          const spriteComponent = selectedObj.components.find((c) => c.type === 'Sprite');
                          const shapeComponent = selectedObj.components.find((c) => c.type === 'Shape');
                          const isCircle = selectedObj.type === 'circle' || shapeComponent?.shapeType === 'Circle';
                          
                          // Get object dimensions
                          const objWidth = spriteComponent?.properties?.width 
                            ?? selectedObj.transform.width 
                            ?? shapeComponent?.width 
                            ?? (isCircle ? selectedObj.transform.width * 2 : 100);
                          const objHeight = spriteComponent?.properties?.height 
                            ?? selectedObj.transform.height 
                            ?? shapeComponent?.height 
                            ?? (isCircle ? selectedObj.transform.width * 2 : 100);
                          
                          // For sprites, use originX/originY; for others, use transform.anchor or default to center
                          let originX, originY;
                          if (spriteComponent) {
                            const spriteProps = spriteComponent.properties ?? {};
                            originX = spriteProps.originX ?? 0;
                            originY = spriteProps.originY ?? 0;
                          } else {
                            // For non-sprites, check if transform has anchor, otherwise default to center
                            const anchor = selectedObj.transform.anchor;
                            if (anchor) {
                              // Convert anchor string to originX/originY
                              const anchorMap = {
                                'topleft': { x: 0, y: 0 },
                                'top': { x: Math.floor(objWidth / 2), y: 0 },
                                'topright': { x: objWidth, y: 0 },
                                'left': { x: 0, y: Math.floor(objHeight / 2) },
                                'center': { x: Math.floor(objWidth / 2), y: Math.floor(objHeight / 2) },
                                'right': { x: objWidth, y: Math.floor(objHeight / 2) },
                                'botleft': { x: 0, y: objHeight },
                                'bot': { x: Math.floor(objWidth / 2), y: objHeight },
                                'botright': { x: objWidth, y: objHeight },
                              };
                              const mapped = anchorMap[anchor] || anchorMap['center'];
                              originX = mapped.x;
                              originY = mapped.y;
                            } else {
                              // Default to center for non-sprites
                              originX = Math.floor(objWidth / 2);
                              originY = Math.floor(objHeight / 2);
                            }
                          }
                          
                          // Convert originX/originY to anchor string (exact matching)
                          const getAnchorFromOrigin = (ox, oy, w, h) => {
                            const centerX = Math.floor(w / 2);
                            const centerY = Math.floor(h / 2);
                            
                            // Exact matches for standard anchor positions
                            if (ox === 0 && oy === 0) return 'topleft';
                            if (ox === centerX && oy === 0) return 'top';
                            if (ox === w && oy === 0) return 'topright';
                            if (ox === 0 && oy === centerY) return 'left';
                            if (ox === centerX && oy === centerY) return 'center';
                            if (ox === w && oy === centerY) return 'right';
                            if (ox === 0 && oy === h) return 'botleft';
                            if (ox === centerX && oy === h) return 'bot';
                            if (ox === w && oy === h) return 'botright';
                            
                            // Approximate matching for custom positions
                            const tolerance = Math.max(1, Math.min(w, h) / 10);
                            const isLeft = Math.abs(ox - 0) < tolerance;
                            const isRight = Math.abs(ox - w) < tolerance;
                            const isTop = Math.abs(oy - 0) < tolerance;
                            const isBottom = Math.abs(oy - h) < tolerance;
                            const isCenterX = Math.abs(ox - centerX) < tolerance;
                            const isCenterY = Math.abs(oy - centerY) < tolerance;
                            
                            if (isTop && isLeft) return 'topleft';
                            if (isTop && isCenterX) return 'top';
                            if (isTop && isRight) return 'topright';
                            if (isCenterY && isLeft) return 'left';
                            if (isCenterY && isCenterX) return 'center';
                            if (isCenterY && isRight) return 'right';
                            if (isBottom && isLeft) return 'botleft';
                            if (isBottom && isCenterY) return 'bot';
                            if (isBottom && isRight) return 'botright';
                            return 'center';
                          };
                          
                          // Convert anchor string to originX/originY
                          // Runtime uses: x = -width/2 + originX, so:
                          // - originX = 0 → left edge at transform
                          // - originX = width/2 → center at transform  
                          // - originX = width → right edge at transform
                          // For "topleft" anchor, we want top-left corner at transform, so originX = width/2
                          const getOriginFromAnchor = (anchor, w, h) => {
                            switch (anchor) {
                              case 'topleft': return { x: 0, y: 0 }; // Left-top edge at transform
                              case 'top': return { x: Math.floor(w / 2), y: 0 }; // Top-center at transform
                              case 'topright': return { x: w, y: 0 }; // Right-top edge at transform
                              case 'left': return { x: 0, y: Math.floor(h / 2) }; // Left-center at transform
                              case 'center': return { x: Math.floor(w / 2), y: Math.floor(h / 2) }; // Center at transform
                              case 'right': return { x: w, y: Math.floor(h / 2) }; // Right-center at transform
                              case 'botleft': return { x: 0, y: h }; // Left-bottom edge at transform
                              case 'bot': return { x: Math.floor(w / 2), y: h }; // Bottom-center at transform
                              case 'botright': return { x: w, y: h }; // Right-bottom edge at transform
                              default: return { x: Math.floor(w / 2), y: Math.floor(h / 2) };
                            }
                          };
                          
                          const currentAnchor = getAnchorFromOrigin(originX, originY, objWidth, objHeight);
                          
                          return (
                            <div className="propertyGroup">
                              <label className="propertyLabel">Anchor</label>
                              <select
                                className="propertyInput"
                                value={currentAnchor}
                                onChange={(e) => {
                                  const newAnchor = e.target.value;
                                  const spriteIndex = selectedObj.components.findIndex((c) => c.type === 'Sprite');
                                  if (spriteIndex !== -1) {
                                    // For sprites, update originX/originY
                                    const { x, y } = getOriginFromAnchor(newAnchor, objWidth, objHeight);
                                    updateSpriteComponentProperties(selectedObj.id, spriteIndex, {
                                      originX: x,
                                      originY: y,
                                    });
                                  } else {
                                    // For non-sprites, just update the anchor - transform.x/y stays the same
                                    // (transform.x/y represents the anchor point position)
                                    updateGameObject(selectedObj.id, {
                                      transform: { 
                                        ...selectedObj.transform, 
                                        anchor: newAnchor
                                      }
                                    });
                                  }
                                }}
                              >
                                <option value="topleft">Top Left</option>
                                <option value="top">Top</option>
                                <option value="topright">Top Right</option>
                                <option value="left">Left</option>
                                <option value="center">Center</option>
                                <option value="right">Right</option>
                                <option value="botleft">Bottom Left</option>
                                <option value="bot">Bottom</option>
                                <option value="botright">Bottom Right</option>
                              </select>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>

                  {/* Other Components */}
                  {selectedObj.components.map((component, index) => {
                    if (component.type === 'Transform') {
                      return null;
                    }

                    if (component.type === 'Sprite') {
                      const sectionId = `${component.type}_${index}`;
                      const isExpanded = expandedSections.has(sectionId);
                      const spriteProps = component.properties ?? {};
                      const spriteSrc = spriteProps.dataUrl || spriteProps.previewDataUrl || '';
                      const fileInputId = `sprite-upload-${selectedObj.id}-${index}`;
                      const selectedAssetNode = selectedFilePath ? findNodeByPath(fileTree, selectedFilePath) : null;
                      const canUseSelectedAsset =
                        !!selectedAssetNode &&
                        selectedAssetNode.type === 'file' &&
                        selectedAssetNode.category === 'assets';
                      const handleSpriteDragOver = (event) => {
                        if (event.dataTransfer.types.includes('application/regame-asset') || event.dataTransfer.types.includes('text/plain')) {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = 'copy';
                          event.currentTarget.classList.add('drop-active');
                        }
                      };
                      const handleSpriteDragLeave = (event) => {
                        event.currentTarget.classList.remove('drop-active');
                      };
                      const handleSpriteDrop = (event) => {
                        event.preventDefault();
                        event.currentTarget.classList.remove('drop-active');
                        const assetPath =
                          event.dataTransfer.getData('application/regame-asset') ||
                          event.dataTransfer.getData('text/plain');
                        if (assetPath) {
                          applySpriteAssetFromPath(selectedObj.id, index, component, assetPath);
                        }
                      };

                      return (
                        <div key={sectionId} className="componentSection">
                          <div className="componentHeader" onClick={() => toggleSection(sectionId)}>
                            <span className="sectionToggle">{isExpanded ? '▾' : '▸'}</span>
                            <strong>Sprite</strong>
                            <button
                              className="removeComponentBtn"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeComponent(selectedObj.id, component.type, index);
                              }}
                              title="Remove component"
                            >
                              ✕
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="spriteInspector">
                              <div className="propertyGroup">
                                <label className="propertyLabel">Sprite Name</label>
                                <input
                                  className="propertyInput"
                                  type="text"
                                  value={spriteProps.name || selectedObj.name || ''}
                                  onChange={(e) =>
                                    updateSpriteComponentProperties(selectedObj.id, index, {
                                      name: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div
                                className="spriteInspectorPreview"
                                onDragOver={handleSpriteDragOver}
                                onDragLeave={handleSpriteDragLeave}
                                onDrop={handleSpriteDrop}
                              >
                                {spriteSrc ? (
                                  <img
                                    src={spriteSrc}
                                    alt={spriteProps.name || selectedObj.name || 'Sprite'}
                                    className="spriteInspectorImage"
                                  />
                                ) : (
                                  <div className="spriteInspectorPlaceholder">No sprite image</div>
                                )}
                              </div>
                              <div className="propertyGroup spriteInspectorHint">
                                <small>Drag an image from Assets here to replace the texture.</small>
                              </div>
                              <div className="propertyGroup">
                                <label className="propertyLabel">Image Path</label>
                                <input
                                  className="propertyInput"
                                  type="text"
                                  value={spriteProps.imagePath || 'Embedded (not saved)'}
                                  readOnly
                                />
                              </div>
                              <div className="propertyGrid">
                                <div className="propertyGroup inline">
                                  <label className="propertyLabel">Origin X</label>
                                  <input
                                    className="propertyInput"
                                    type="number"
                                    value={spriteProps.originX ?? Math.floor((spriteProps.width ?? selectedObj.transform.width) / 2)}
                                    onChange={(e) =>
                                      updateSpriteComponentProperties(selectedObj.id, index, {
                                        originX: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                  />
                                </div>
                                <div className="propertyGroup inline">
                                  <label className="propertyLabel">Origin Y</label>
                                  <input
                                    className="propertyInput"
                                    type="number"
                                    value={spriteProps.originY ?? Math.floor((spriteProps.height ?? selectedObj.transform.height) / 2)}
                                    onChange={(e) =>
                                      updateSpriteComponentProperties(selectedObj.id, index, {
                                        originY: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                  />
                                </div>
                              </div>

                              <div className="spriteInspectorActions">
                                <button
                                  className="modalButton"
                                  onClick={() => document.getElementById(fileInputId)?.click()}
                                >
                                  Replace Image
                                </button>
                                <button
                                  className="modalButton"
                                  onClick={() => handleSpriteApplySelectedAsset(selectedObj.id, index, component)}
                                  disabled={!canUseSelectedAsset}
                                  title={
                                    canUseSelectedAsset
                                      ? 'Apply the currently selected asset'
                                      : 'Select an asset file in the File System to enable'
                                  }
                                >
                                  Use Selected Asset
                                </button>
                                {spriteSrc && (
                                  <a
                                    className="modalButton"
                                    download={`${(spriteProps.name || selectedObj.name || 'sprite').replace(/\s+/g, '_')}.png`}
                                    href={spriteSrc}
                                  >
                                    Download PNG
                                  </a>
                                )}
                              </div>
                              <input
                                id={fileInputId}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (!file) return;
                                  handleSpriteComponentReplace(selectedObj.id, index, component, file);
                                  event.target.value = '';
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    }

                    const sectionId = `${component.type}_${index}`;
                    const isExpanded = expandedSections.has(sectionId);

                    return (
                      <div key={sectionId} className="componentSection">
                        <div className="componentHeader" onClick={() => toggleSection(sectionId)}>
                          <span className="sectionToggle">{isExpanded ? '▾' : '▸'}</span>
                          <strong>{component.type === 'Shape' ? `${component.shapeType} Shape` : component.type}</strong>
                          <button
                            className="removeComponentBtn"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeComponent(selectedObj.id, component.type, index);
                            }}
                            title="Remove component"
                          >
                            ✕
                          </button>
                        </div>

                        {isExpanded && (
                          <>
                            {component.type === 'Shape' && (
                              <>
                                <div className="propertyGroup">
                                  <label className="propertyLabel">Shape Type</label>
                                  <select
                                    className="propertyInput"
                                    value={component.shapeType}
                                    onChange={(e) => {
                                      const updated = selectedObj.components.map((c, componentIndex) =>
                                        componentIndex === index ? { ...c, shapeType: e.target.value } : c
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
                                      const updated = selectedObj.components.map((c, componentIndex) =>
                                        componentIndex === index ? { ...c, color: e.target.value } : c
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
                                    const updated = selectedObj.components.map((c, componentIndex) =>
                                      componentIndex === index ? { ...c, color: e.target.value } : c
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
                                      const updated = selectedObj.components.map((c, componentIndex) =>
                                        componentIndex === index ? { ...c, shape: e.target.value } : c
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
                                      const updated = selectedObj.components.map((c, componentIndex) =>
                                        componentIndex === index
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
                                      const updated = selectedObj.components.map((c, componentIndex) =>
                                        componentIndex === index
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
                                      const updated = selectedObj.components.map((c, componentIndex) =>
                                        componentIndex === index
                                          ? {
                                              ...c,
                                              offset: {
                                                x: parseFloat(e.target.value),
                                                y: c.offset?.y ?? 0,
                                              },
                                            }
                                          : c
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
                                      const updated = selectedObj.components.map((c, componentIndex) =>
                                        componentIndex === index
                                          ? {
                                              ...c,
                                              offset: {
                                                x: c.offset?.x ?? 0,
                                                y: parseFloat(e.target.value),
                                              },
                                            }
                                          : c
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
                                      const updated = selectedObj.components.map((c, componentIndex) =>
                                        componentIndex === index ? { ...c, collisionIgnore: tags } : c
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
                                      const updated = selectedObj.components.map((c, componentIndex) =>
                                        componentIndex === index ? { ...c, restitution: parseFloat(e.target.value) } : c
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
                                      const updated = selectedObj.components.map((c, componentIndex) =>
                                        componentIndex === index ? { ...c, friction: parseFloat(e.target.value) } : c
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
                                      const updated = selectedObj.components.map((c, componentIndex) =>
                                        componentIndex === index ? { ...c, mass: parseFloat(e.target.value) } : c
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
                                        const updated = selectedObj.components.map((c, componentIndex) =>
                                          componentIndex === index ? { ...c, gravity: e.target.checked } : c
                                        );
                                        updateGameObject(selectedObj.id, { components: updated });
                                      }}
                                    />
                                    {' '}Gravity
                                  </label>
                                </div>
                                <div className="propertyGroup">
                                  <label className="propertyLabel">
                                    <input
                                      type="checkbox"
                                      checked={component.isStatic ?? false}
                                      onChange={(e) => {
                                        const updated = selectedObj.components.map((c, componentIndex) =>
                                          componentIndex === index ? { ...c, isStatic: e.target.checked } : c
                                        );
                                        updateGameObject(selectedObj.id, { components: updated });
                                      }}
                                    />
                                    {' '}Static Body
                                  </label>
                                  <div style={{ fontSize: '10px', color: '#666' }}>Static bodies don't move and block dynamic bodies.</div>
                                </div>
                                <div className="propertyGroup">
                                  <label className="propertyLabel">Velocity X</label>
                                  <input
                                    className="propertyInput"
                                    type="number"
                                    step="1"
                                    value={component.velocity?.x ?? 0}
                                    onChange={(e) => {
                                      const updated = selectedObj.components.map((c, componentIndex) =>
                                        componentIndex === index
                                          ? {
                                              ...c,
                                              velocity: {
                                                x: parseFloat(e.target.value) || 0,
                                                y: c.velocity?.y ?? 0,
                                              },
                                            }
                                          : c
                                      );
                                      updateGameObject(selectedObj.id, { components: updated });
                                    }}
                                  />
                                </div>
                                <div className="propertyGroup">
                                  <label className="propertyLabel">Velocity Y</label>
                                  <input
                                    className="propertyInput"
                                    type="number"
                                    step="1"
                                    value={component.velocity?.y ?? 0}
                                    onChange={(e) => {
                                      const updated = selectedObj.components.map((c, componentIndex) =>
                                        componentIndex === index
                                          ? {
                                              ...c,
                                              velocity: {
                                                x: c.velocity?.x ?? 0,
                                                y: parseFloat(e.target.value) || 0,
                                              },
                                            }
                                          : c
                                      );
                                      updateGameObject(selectedObj.id, { components: updated });
                                    }}
                                  />
                                </div>
                                <div className="propertyGroup">
                                  <label className="propertyLabel">Acceleration X</label>
                                  <input
                                    className="propertyInput"
                                    type="number"
                                    step="1"
                                    value={component.acceleration?.x ?? 0}
                                    onChange={(e) => {
                                      const updated = selectedObj.components.map((c, componentIndex) =>
                                        componentIndex === index
                                          ? {
                                              ...c,
                                              acceleration: {
                                                x: parseFloat(e.target.value) || 0,
                                                y: c.acceleration?.y ?? 0,
                                              },
                                            }
                                          : c
                                      );
                                      updateGameObject(selectedObj.id, { components: updated });
                                    }}
                                  />
                                </div>
                                <div className="propertyGroup">
                                  <label className="propertyLabel">Acceleration Y</label>
                                  <input
                                    className="propertyInput"
                                    type="number"
                                    step="1"
                                    value={component.acceleration?.y ?? 0}
                                    onChange={(e) => {
                                      const updated = selectedObj.components.map((c, componentIndex) =>
                                        componentIndex === index
                                          ? {
                                              ...c,
                                              acceleration: {
                                                x: c.acceleration?.x ?? 0,
                                                y: parseFloat(e.target.value) || 0,
                                              },
                                            }
                                          : c
                                      );
                                      updateGameObject(selectedObj.id, { components: updated });
                                    }}
                                  />
                                </div>
                              </>
                            )}

                            {component.type === 'Script' && (
                              <div
                                className="propertyGroup scriptDropTarget"
                                onDragOver={(e) => {
                                  if (extractScriptPathFromDragEvent(e)) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }
                                }}
                                onDrop={async (e) => {
                                  const scriptPath = extractScriptPathFromDragEvent(e);
                                  if (!scriptPath) return;
                                  e.preventDefault();
                                  e.stopPropagation();
                                  await attachScriptToObjectFromPath(selectedObj.id, scriptPath, {
                                    openEditor: true,
                                  });
                                }}
                              >
                                <label className="propertyLabel">Script File</label>
                                <div className="filePathRow">
                                  <span className="filePathText">
                                    {component.scriptPath
                                      ? component.scriptPath
                                      : currentProject?.path
                                      ? 'Embedded (click edit to save to file)'
                                      : 'Embedded (Quick Start)'}
                                  </span>
                                </div>
                                <div className="scriptInspectorActions">
                                  <button
                                    className="modalButton"
                                    onClick={() =>
                                      handleAttachScript(selectedObj.id, {
                                        openEditor: true,
                                        allowCreate: false,
                                      })
                                    }
                                  >
                                    Use Selected Script
                                  </button>
                                  <button
                                    className="modalButton"
                                    onClick={() => createNewScriptForObject(selectedObj.id)}
                                  >
                                    New Script
                                  </button>
                                </div>
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
                                <p className="scriptDropHint">Drag a script here to attach it</p>
                              </div>
                            )}

                            {component.type === 'Text' && (
                              <>
                                <div className="propertyGroup">
                                  <label className="propertyLabel">Text Content</label>
                                  <textarea
                                    className="propertyInput"
                                    style={{ minHeight: '60px', fontFamily: 'monospace' }}
                                    value={component.text || 'Text'}
                                    onChange={(e) => {
                                      const updated = selectedObj.components.map((c, componentIndex) =>
                                        componentIndex === index ? { ...c, text: e.target.value } : c
                                      );
                                      updateGameObject(selectedObj.id, { components: updated });
                                    }}
                                  />
                                </div>
                                <div className="propertyGroup">
                                  <label className="propertyLabel">Font Size</label>
                                  <input
                                    className="propertyInput"
                                    type="number"
                                    min="8"
                                    max="200"
                                    value={component.textSize || 16}
                                    onChange={(e) => {
                                      const updated = selectedObj.components.map((c, componentIndex) =>
                                        componentIndex === index ? { ...c, textSize: parseFloat(e.target.value) || 16 } : c
                                      );
                                      updateGameObject(selectedObj.id, { components: updated });
                                    }}
                                  />
                                </div>
                                <div className="propertyGroup">
                                  <label className="propertyLabel">Alignment</label>
                                  <select
                                    className="propertyInput"
                                    value={component.align || 'left'}
                                    onChange={(e) => {
                                      const updated = selectedObj.components.map((c, componentIndex) =>
                                        componentIndex === index ? { ...c, align: e.target.value } : c
                                      );
                                      updateGameObject(selectedObj.id, { components: updated });
                                    }}
                                  >
                                    <option value="left">Left</option>
                                    <option value="center">Center</option>
                                    <option value="right">Right</option>
                                  </select>
                                </div>
                                <div className="propertyGroup">
                                  <label className="propertyLabel">Color</label>
                                  <input
                                    className="propertyInput"
                                    type="color"
                                    value={component.color || '#ffffff'}
                                    onChange={(e) => {
                                      const updated = selectedObj.components.map((c, componentIndex) =>
                                        componentIndex === index ? { ...c, color: e.target.value } : c
                                      );
                                      updateGameObject(selectedObj.id, { components: updated });
                                    }}
                                  />
                                </div>
                                <div style={{ fontSize: '11px', color: '#888', padding: '8px' }}>
                                  💡 Text is rendered using React Native Skia's text rendering
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}

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
                        title="Add Collider"
                      >
                        🛡️ Area
                      </button>
                      <button 
                        className="componentBtn"
                        onClick={() => addComponent(selectedObj.id, 'Physics')}
                        title="Add Physics Body"
                      >
                        ⚙️ Physics
                      </button>
                      <button 
                        className="componentBtn"
                        onClick={() => addComponent(selectedObj.id, 'Script')}
                        title="Add Script"
                      >
                        📜 Script
                      </button>
                      <button 
                        className="componentBtn"
                        onClick={() => addComponent(selectedObj.id, 'Text')}
                        title="Add Text Label"
                      >
                        📝 Text
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
      {contextMenu && (() => {
        const contextNode = findObjectById(gameObjects, contextMenu.objectId);
        const hasScriptComponent = contextNode?.components.some((component) => component.type === 'Script');
        const scriptComponentIndex = hasScriptComponent
          ? contextNode.components.findIndex((component) => component.type === 'Script')
          : -1;

        return (
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
              showInputModal('Rename Node', 'Enter new name:', contextNode?.name ?? '').then((newName) => {
                if (newName && newName.trim()) {
                  updateGameObject(contextMenu.objectId, { name: newName.trim() });
                }
              });
              setContextMenu(null);
            }}>
              <span>Rename</span>
              <span className="contextShortcut">F2</span>
            </div>
            
            <div className="contextMenuItem" onClick={() => {
              const obj = contextNode;
              if (obj) {
                const newObj = cloneObjectWithNewIds(obj);
                newObj.name = `${obj.name}_copy`;
                newObj.transform = {
                  ...newObj.transform,
                  x: obj.transform.x + 20,
                  y: obj.transform.y + 20,
                };
                const normalizedClone = normalizeGameObjects([newObj])[0];
                setGameObjects((prev) => {
                  const { inserted, nodes } = insertRelativeToNode(prev, obj.id, normalizedClone, 'after');
                  const nextTree = inserted ? nodes : appendChildInTree(prev, null, normalizedClone);
                  return normalizeGameObjects(nextTree);
                });
                setExpandedNodes((prev) => {
                  const next = new Set(prev);
                  next.add(obj.id);
                  next.add(normalizedClone.id);
                  return next;
                });
                setSelectedObject(normalizedClone.id);
              }
              setContextMenu(null);
            }}>
              <span>Duplicate</span>
              <span className="contextShortcut">Ctrl+D</span>
            </div>
            
            <div className="contextMenuSeparator"></div>
            
            <div 
              className="contextMenuItem" 
              onMouseEnter={() => {
                setShowComponentMenu(false);
                setShowAddNodeMenu(true);
              }}
              onMouseLeave={() => setShowAddNodeMenu(false)}
              style={{ position: 'relative' }}
            >
              <span>Add Child Node</span>
              <span style={{ marginLeft: 'auto', fontSize: '10px' }}>▶</span>
              
              {showAddNodeMenu && (
                <div className="contextSubmenu">
                  <div className="contextMenuItem" onClick={() => {
                    createGameObjectWithType(contextMenu.objectId, 'rect');
                    setContextMenu(null);
                    setShowAddNodeMenu(false);
                  }}>
                    <span>▭ Rectangle</span>
                  </div>
                  <div className="contextMenuItem" onClick={() => {
                    createGameObjectWithType(contextMenu.objectId, 'circle');
                    setContextMenu(null);
                    setShowAddNodeMenu(false);
                  }}>
                    <span>● Circle</span>
                  </div>
                  <div className="contextMenuItem" onClick={() => {
                    createGameObjectWithType(contextMenu.objectId, 'text');
                    setContextMenu(null);
                    setShowAddNodeMenu(false);
                  }}>
                    <span>📝 Text</span>
                  </div>
                  <div className="contextMenuItem" onClick={() => {
                    createGameObjectWithType(contextMenu.objectId, 'empty');
                    setContextMenu(null);
                    setShowAddNodeMenu(false);
                  }}>
                    <span>📦 Empty Node</span>
                  </div>
                </div>
              )}
            </div>
            
            <div 
              className="contextMenuItem" 
              onMouseEnter={() => {
                setShowComponentMenu(true);
                setShowAddNodeMenu(false);
              }}
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
                    addComponent(contextMenu.objectId, 'Area');
                    setContextMenu(null);
                    setShowComponentMenu(false);
                  }}>
                    <span>Collider (Area)</span>
                  </div>
                  <div className="contextMenuItem" onClick={() => {
                    addComponent(contextMenu.objectId, 'Physics');
                    setContextMenu(null);
                    setShowComponentMenu(false);
                  }}>
                    <span>Physics</span>
                  </div>
                  {!hasScriptComponent && (
                    <div className="contextMenuItem" onClick={() => {
                      addComponent(contextMenu.objectId, 'Script');
                      setContextMenu(null);
                      setShowComponentMenu(false);
                    }}>
                      <span>Attach Script</span>
                    </div>
                  )}
                  <div
                    className="contextMenuItem"
                    onClick={async () => {
                      await handleAttachScript(contextMenu.objectId, { openEditor: true });
                      setContextMenu(null);
                      setShowComponentMenu(false);
                    }}
                  >
                    <span>{hasScriptComponent ? 'Replace Script' : 'Attach Script'}</span>
                  </div>
                  {hasScriptComponent && (
                    <div
                      className="contextMenuItem"
                      onClick={() => {
                        removeComponent(contextMenu.objectId, 'Script', scriptComponentIndex);
                        setContextMenu(null);
                        setShowComponentMenu(false);
                      }}
                    >
                      <span>Detach Script</span>
                    </div>
                  )}
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
        );
      })()}

      {addObjectModalOpen && (
        <AddObjectModal
          onSelect={handleCreateObject}
          onCancel={() => setAddObjectModalOpen(false)}
        />
      )}

      {spriteEditorState.open && (
        <SpriteEditorModal
          isOpen={spriteEditorState.open}
          defaultName={spriteEditorState.initialName}
          defaultWidth={spriteEditorState.initialWidth}
          defaultHeight={spriteEditorState.initialHeight}
          onSave={handleSpriteEditorSave}
          onCancel={handleSpriteEditorClose}
        />
      )}

      {/* Script Editor Modal */}
      <ScriptEditor
        isOpen={scriptEditorOpen}
        onClose={() => setScriptEditorOpen(false)}
        onSave={saveScriptCode}
        scriptName={editingScript ? (findObjectById(gameObjects, editingScript.objectId)?.name || 'Script') : 'Script'}
        initialCode={editingScript?.scriptCode || ''}
      />

      {/* Script Template Modal */}
      {scriptTemplateModal && (
        <ScriptTemplateModalComponent
          scriptName={scriptTemplateModal.scriptName}
          onConfirm={(options) => {
            setScriptTemplateModal(null);
            scriptTemplateModal.resolve(options);
          }}
          onCancel={() => {
            setScriptTemplateModal(null);
            scriptTemplateModal.resolve(null);
          }}
        />
      )}

      {/* Input Modal */}
      {inputModal && (
        <InputModalComponent
          title={inputModal.title}
          message={inputModal.message}
          defaultValue={inputModal.defaultValue}
          onConfirm={inputModal.onConfirm}
          onCancel={inputModal.onCancel}
        />
      )}
    </div>
  );
}
