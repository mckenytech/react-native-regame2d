import React, { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import './ScriptEditor.css';
import { scriptTypeDefinitions } from '../monaco/scriptTypeDefinitions';

let extraLibRegistered = false;
let thisCompletionProvider = null;

export default function ScriptEditor({ isOpen, onClose, onSave, scriptName, initialCode }) {
  const createDefaultTemplate = (name = 'Script') => {
    const safeName = name || 'Script';
    return `// ${safeName}

// Variables declared at top level
let someVariable: any = null;

function ready() {
  // Initialization - runs AFTER all objects are created
  // Access this GameObject using 'this':
  //   - this.id (unique ID)
  //   - this.tags (array of tags)  
  //   - this.get('transform') - gets the transform component
  //   - this.onCollide('tag', callback) - collision handler
  
  // Example: Get body component
  // const body = this.get('body');
}

function update(dt: number) {
  // Called every frame (dt = delta time)
  
  // Example: Animate position
  // const transform = this.get('transform');
  // if (transform && transform.pos) {
  //   transform.pos.x.value += 100 * dt;
  // }
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
    
    // Set up Monaco for TypeScript game scripting
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      allowJs: true,
      typeRoots: ["node_modules/@types"],
      strict: false,
      skipLibCheck: true
    });

    if (!extraLibRegistered) {
      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        scriptTypeDefinitions,
        'file:///regame-script.d.ts'
      );
      extraLibRegistered = true;
    }

    if (!thisCompletionProvider) {
      const suggestions = [
        {
          label: 'id',
          kind: monaco.languages.CompletionItemKind.Field,
          insertText: 'id',
          detail: 'string',
          documentation: 'Unique identifier for this GameObject.',
        },
        {
          label: 'tags',
          kind: monaco.languages.CompletionItemKind.Field,
          insertText: 'tags',
          detail: 'string[]',
          documentation: 'Readonly array of tags applied to this GameObject.',
        },
        {
          label: 'components',
          kind: monaco.languages.CompletionItemKind.Field,
          insertText: 'components',
          detail: 'Map<string, Component>',
          documentation: 'Map of components currently attached to this GameObject.',
        },
        {
          label: 'get',
          kind: monaco.languages.CompletionItemKind.Method,
          insertText: "get('${1:componentId}')",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: "(id) => component",
          documentation: 'Retrieve a component by id (e.g. this.get("body")).',
        },
        {
          label: 'has',
          kind: monaco.languages.CompletionItemKind.Method,
          insertText: "has('${1:componentId}')",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '(id) => boolean',
          documentation: 'Check if this GameObject has a component by id.',
        },
        {
          label: 'add',
          kind: monaco.languages.CompletionItemKind.Method,
          insertText: 'add(${1:component})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '(component) => GameObject',
          documentation: 'Attach a new component to this GameObject.',
        },
        {
          label: 'addTag',
          kind: monaco.languages.CompletionItemKind.Method,
          insertText: "addTag('${1:tag}')",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '(tag) => GameObject',
          documentation: 'Apply a tag to this GameObject.',
        },
        {
          label: 'hasTag',
          kind: monaco.languages.CompletionItemKind.Method,
          insertText: "hasTag('${1:tag}')",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '(tag) => boolean',
          documentation: 'Check whether this GameObject has a given tag.',
        },
        {
          label: 'onCollide',
          kind: monaco.languages.CompletionItemKind.Method,
          insertText: "onCollide('${1:tag}', (${2:other}) => {\n  ${0}\n})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '(tag, handler) => void',
          documentation: 'Register a one-time collision start handler against a tag.',
        },
        {
          label: 'onCollideUpdate',
          kind: monaco.languages.CompletionItemKind.Method,
          insertText: "onCollideUpdate('${1:tag}', (${2:other}) => {\n  ${0}\n})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '(tag, handler) => void',
          documentation: 'Register a per-frame collision update handler against a tag.',
        },
        {
          label: 'onCollideEnd',
          kind: monaco.languages.CompletionItemKind.Method,
          insertText: "onCollideEnd('${1:tag}', (${2:other}) => {\n  ${0}\n})",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '(tag, handler) => void',
          documentation: 'Register a collision end handler against a tag.',
        },
        {
          label: 'destroy',
          kind: monaco.languages.CompletionItemKind.Method,
          insertText: 'destroy()',
          detail: '() => void',
          documentation: 'Destroy this GameObject and clean up its components.',
        },
        {
          label: 'update',
          kind: monaco.languages.CompletionItemKind.Method,
          insertText: 'update(${1:dt})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: '(dt) => void',
          documentation: 'Invoke the GameObject update loop manually.',
        },
      ];

      thisCompletionProvider = monaco.languages.registerCompletionItemProvider('typescript', {
        triggerCharacters: ['.'],
        provideCompletionItems(model, position) {
          const lineContent = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
          if (!/this\.\w*$/.test(lineContent)) {
            return { suggestions: [] };
          }

          const wordInfo = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: wordInfo.startColumn,
            endColumn: wordInfo.endColumn,
          };

          return {
            suggestions: suggestions.map((item) => ({
              ...item,
              range,
            })),
          };
        },
      });
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
            defaultLanguage="typescript"
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
            💡 Tip: Use <code>this</code> to access the GameObject, <code>ctx</code> for game context helpers
          </span>
        </div>
      </div>
    </div>
  );
}

