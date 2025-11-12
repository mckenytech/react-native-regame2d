/**
 * Generates JavaScript game code from editor GameObject data
 */

export function generateSceneCode(sceneName, gameObjects, existingCode = '') {
  const extractUserBlock = (startMarker, endMarker, fallback = '') => {
    if (!existingCode) return fallback;
    const startIndex = existingCode.indexOf(startMarker);
    const endIndex = existingCode.indexOf(endMarker);
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      const content = existingCode
        .slice(startIndex + startMarker.length, endIndex)
        .trim();
      return content.length ? content : fallback;
    }
    return fallback;
  };

  const indentBlock = (block, indent) =>
    block
      .split('\n')
      .map(line => (line.length ? `${indent}${line}` : ''))
      .join('\n');

  const userImportsRaw = extractUserBlock(
    '/* <<<USER-IMPORTS:START>>> */',
    '/* <<<USER-IMPORTS:END>>> */',
    ''
  );
  const userSceneRaw = extractUserBlock(
    '/* <<<USER-CODE:SCENE:START>>> */',
    '/* <<<USER-CODE:SCENE:END>>> */',
    ''
  );

  const imports = [];
  const components = new Set();
  
  // Analyze what components are used
  gameObjects.forEach(obj => {
    obj.components.forEach(comp => {
      if (comp.type === 'Transform') {
        components.add('pos');
      } else if (comp.type === 'Shape') {
        if (comp.shapeType === 'Rectangle') {
          components.add('rect');
        } else if (comp.shapeType === 'Circle') {
          components.add('circle');
        }
      } else if (comp.type === 'Physics') {
        components.add('body');
      } else if (comp.type === 'Area') {
        components.add('area');
      }
    });
    // Always include area for collision if Physics is present
    if (obj.components.some(c => c.type === 'Physics')) {
      components.add('area');
    }
  });
  
  // Build import statement
  const importList = Array.from(components).join(', ');
  const importStatement = importList 
    ? `import { ${importList} } from '../engine';`
    : `// No components used yet`;
  
  // Generate code for each GameObject
  const gameObjectsCode = gameObjects.map(obj => {
    const componentsList = [];
    const transform = obj.transform;
    
    // Position (Transform) - always first
    componentsList.push(`pos(${Math.round(transform.x)}, ${Math.round(transform.y)})`);
    
    // Shape components
    const shapeComp = obj.components.find(c => c.type === 'Shape');
    if (shapeComp) {
      if (shapeComp.shapeType === 'Rectangle') {
        componentsList.push(
          `rect(${transform.width}, ${transform.height}, '${shapeComp.color}')`
        );
      } else if (shapeComp.shapeType === 'Circle') {
        const radius = Math.round(Math.min(transform.width, transform.height) / 2);
        componentsList.push(`circle(${radius}, '${shapeComp.color}')`);
      }
    }
    
    // Area component (collision detection)
    const areaComp = obj.components.find(c => c.type === 'Area');
    if (areaComp || obj.components.some(c => c.type === 'Physics')) {
      const areaOptions = [];
      const scale = areaComp?.scale || { x: 1, y: 1 };
      const offset = areaComp?.offset || { x: 0, y: 0 };
      
      if (areaComp) {
        const normalizedShape =
          typeof areaComp.shape === 'string'
            ? (areaComp.shape.toLowerCase() === 'auto' ? null : areaComp.shape)
            : areaComp.shape;
        if (normalizedShape) {
          areaOptions.push(`shape: '${normalizedShape}'`);
        }
        if (areaComp.width != null && areaComp.height != null) {
          areaOptions.push(`width: ${areaComp.width}`);
          areaOptions.push(`height: ${areaComp.height}`);
        }
        if (areaComp.radius != null) {
          areaOptions.push(`radius: ${areaComp.radius}`);
        }
        if (scale.x !== 1 || scale.y !== 1) {
          areaOptions.push(`scale: { x: ${scale.x}, y: ${scale.y} }`);
        }
        if (offset.x !== 0 || offset.y !== 0) {
          areaOptions.push(`offset: { x: ${offset.x}, y: ${offset.y} }`);
        }
        if (areaComp.collisionIgnore && areaComp.collisionIgnore.length > 0) {
          const tags = areaComp.collisionIgnore.map(tag => `'${tag}'`).join(', ');
          areaOptions.push(`collisionIgnore: [${tags}]`);
        }
        if (areaComp.restitution != null && areaComp.restitution !== 0) {
          areaOptions.push(`restitution: ${areaComp.restitution}`);
        }
        if (areaComp.friction != null && areaComp.friction !== 1) {
          areaOptions.push(`friction: ${areaComp.friction}`);
        }
      }
      
      const areaCall = areaOptions.length > 0
        ? `area({ ${areaOptions.join(', ')} })`
        : 'area()';
      componentsList.push(areaCall);
    }
    
    // Physics component
    const physicsComp = obj.components.find(c => c.type === 'Physics');
    if (physicsComp) {
      const physicsProps = [];
      if (physicsComp.mass !== 1) {
        physicsProps.push(`mass: ${physicsComp.mass}`);
      }
      if (physicsComp.gravity === false) {
        physicsProps.push(`gravity: false`);
      }
      if (physicsProps.length > 0) {
        componentsList.push(`body({ ${physicsProps.join(', ')} })`);
      } else {
        componentsList.push('body()');
      }
    }
    
    // Tag (for identification)
    const tag = obj.name.toLowerCase().replace(/\s+/g, '_');
    componentsList.push(`"${tag}"`);
    
    const indent = '  ';
    const componentsStr = componentsList.map(c => `${indent}  ${c}`).join(',\n');
    
    let objectCode = `${indent}// ${obj.name}\n${indent}const ${tag} = ctx.add([\n${componentsStr}\n${indent}]);`;
    
    // Script component - add as a KAPLAY-style custom component!
    const scriptComp = obj.components.find(c => c.type === 'Script');
    if (scriptComp && scriptComp.code) {
      // Extract any code BEFORE the update() function (setup code, variables, etc.)
      const exportIndex = scriptComp.code.indexOf('export function update');
      const setupCodeRaw = exportIndex !== -1
        ? scriptComp.code.slice(0, exportIndex)
        : '';
      const setupCode = setupCodeRaw
        .split('\n')
        .map(line => line.replace(/\r$/, ''))
        .join('\n')
        .trim();
      
      // Extract the body of the update() function
      const updateMatch = scriptComp.code.match(/export\s+function\s+update\s*\(([^)]*)\)\s*\{([\s\S]*?)\r?\n\}/);
      if (updateMatch && updateMatch[2].trim()) {
        // Get the parameters (e.g., "dt" or "obj, ctx")
        const params = updateMatch[1].trim();
        const updateBody = updateMatch[2];
        
        // Create a KAPLAY-style custom component function
        // We need to use a regular function (not arrow) so we can bind 'this' to the GameObject
        const scriptComponentCode = `
${indent}// Custom script component for ${obj.name}
${indent}const ${tag}_script = function() {
${indent}  const self = this; // Capture reference to GameObject
${setupCode ? setupCode.split('\n').filter(line => line.trim() && !line.includes('// Script')).map(line => `${indent}  ${line.trim()}`).join('\n') + '\n' : ''}${indent}  return {
${indent}    id: "${tag}_script",
${indent}    // Bind update to the GameObject so 'this' refers to the GameObject
${indent}    update: function(${params}) {
${updateBody.split('\n').map(line => `${indent}    ${line}`).join('\n')}
${indent}    }.bind(self)
${indent}  };
${indent}};`;
        // Insert the component before the object creation
        objectCode = scriptComponentCode + '\n' + objectCode;
        
        // Add the script component to the object (before the closing bracket)
        // Call the script component AFTER creating the GameObject so we can bind 'this'
        const lastBracket = objectCode.lastIndexOf('\n' + indent + ']);');
        if (lastBracket !== -1) {
          // First, close the GameObject creation without the script
          objectCode = objectCode.substring(0, lastBracket) + `\n${indent}]);`;
          // Then add the script component with proper 'this' binding
          objectCode += `\n${indent}${tag}.add(${tag}_script.call(${tag}));`;
        }
      }
      
      // TODO: Handle onCollision() similarly when collision system is ready
    }
    
    return objectCode;
  }).join('\n\n');
  
  // Build complete scene function
  const autoSceneBlock = gameObjects.length > 0
    ? gameObjectsCode
    : '  // Add GameObjects using the editor!';

  const userImportsBlock =
    userImportsRaw || '// Add your own imports below. These will NOT be overwritten.';
  const userSceneBlock = userSceneRaw
    ? indentBlock(userSceneRaw, '  ')
    : '  // Add custom scene logic here (persisted across regenerations)';

  const code = `// ========================= REGAME LEVEL =========================
// Generated + user-safe regions for Cursor/Codegen

/* <<<AUTO-GENERATED:IMPORTS:START>>> */
${importStatement}
/* <<<AUTO-GENERATED:IMPORTS:END>>> */

/* <<<USER-IMPORTS:START>>> */
${userImportsBlock}
/* <<<USER-IMPORTS:END>>> */

export function ${sceneName}(ctx) {
  /* <<<AUTO-GENERATED:SCENE:START>>> */
${autoSceneBlock}
  /* <<<AUTO-GENERATED:SCENE:END>>> */

  /* <<<USER-CODE:SCENE:START>>> */
${userSceneBlock}
  /* <<<USER-CODE:SCENE:END>>> */
}
`;
  
  return code.trimEnd() + '\n';
}

export function generateProjectIndex(scenes) {
  const sceneImports = scenes.map(scene => 
    `import { ${scene.name} } from './scenes/${scene.name}';`
  ).join('\n');
  
  const code = `import { GameEngine } from './engine';
${sceneImports}

// Initialize the game engine
const engine = new GameEngine({
  width: 800,
  height: 600,
  background: '#2a2a2a',
  scenes: {
${scenes.map(s => `    ${s.name},`).join('\n')}
  }
});

// Start with the first scene
engine.start('${scenes[0]?.name || 'MainScene'}');
`;
  
  return code;
}


