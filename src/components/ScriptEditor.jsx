import React, { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import './ScriptEditor.css';
import { scriptTypeDefinitions } from '../monaco/scriptTypeDefinitions';

let extraLibRegistered = false;

export default function ScriptEditor({ isOpen, onClose, onSave, scriptName, initialCode }) {
  const createDefaultTemplate = (name = 'Script') => {
    const safeName = name || 'Script';
    return `// ${safeName}
// Write your game logic here!
// This is a KAPLAY-style component - use 'this' to access the GameObject!

export function update(dt) {
  // Called every frame on JS thread
  // dt: delta time (time since last frame)
  // Use 'this' to access this GameObject:
  //   - this.id (unique ID)
  //   - this.tags (array of tags)  
  //   - this.components (Map of components)
  //   - this.get('transform') - gets the transform component
  
  // Get the transform component to access position
  const transform = this.get('transform');
  if (transform && transform.pos) {
    // Animate position (Reanimated shared values)
    transform.pos.x.value += 100 * dt;
    // transform.pos.y.value += 50 * dt;
  }
}

export function onCollision(other) {
  // Called when colliding with another object
  // other: the object we collided with
  console.log("Collision with:", other.id);
}
`;
  };

  const [code, setCode] = useState(initialCode || createDefaultTemplate(scriptName));
  const editorRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setCode(initialCode || createDefaultTemplate(scriptName));
      if (editorRef.current) {
        editorRef.current.setValue(initialCode || createDefaultTemplate(scriptName));
        editorRef.current.focus();
      }
    }
  }, [initialCode, isOpen, scriptName]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Set up Monaco for JavaScript game scripting
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      allowJs: true,
      typeRoots: ["node_modules/@types"]
    });

    if (!extraLibRegistered) {
      monaco.languages.typescript.javascriptDefaults.addExtraLib(
        scriptTypeDefinitions,
        'file:///regame-script.d.ts'
      );
      extraLibRegistered = true;
    }

    editor.onKeyDown((event) => {
      if ((event.ctrlKey || event.metaKey) && event.keyCode === monaco.KeyCode.KEY_S) {
        event.preventDefault();
        handleSave();
      }
    });

    editor.focus();
  };

  const handleSave = () => {
    onSave(code);
    onClose();
  };

  const handleCancel = () => {
    setCode(initialCode || createDefaultTemplate(scriptName));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="scriptEditorOverlay" onClick={onClose}>
      <div className="scriptEditorModal" onClick={(e) => e.stopPropagation()}>
        <div className="scriptEditorHeader">
          <h3 className="scriptEditorTitle">📝 Script: {scriptName}</h3>
          <div className="scriptEditorActions">
            <button className="scriptEditorButton saveBtn" onClick={handleSave}>
              💾 Save
            </button>
            <button className="scriptEditorButton" onClick={handleCancel}>
              ✕ Close
            </button>
          </div>
        </div>
        
        <div className="scriptEditorBody">
          <Editor
            height="100%"
            defaultLanguage="javascript"
            value={code}
            onChange={(value) => {
              const next = value ?? '';
              setCode(next);
            }}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: true,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              formatOnPaste: true,
              formatOnType: true,
              suggestOnTriggerCharacters: true,
              acceptSuggestionOnEnter: 'on',
              quickSuggestions: true,
            }}
          />
        </div>

        <div className="scriptEditorFooter">
          <span className="scriptEditorHint">
            💡 Tip: Use <code>obj</code> to access this GameObject, <code>ctx</code> for game context
          </span>
        </div>
      </div>
    </div>
  );
}

