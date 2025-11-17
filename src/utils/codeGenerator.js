/**
 * Generates JavaScript game code from editor GameObject data
 */

export function generateSceneCode(
  sceneName,
  gameObjects,
  existingOrViewport = '',
  maybeExistingCode = '',
) {
  const defaultViewport = { width: 360, height: 640 };
  let viewport = { ...defaultViewport };
  let existingCode = '';

  if (typeof existingOrViewport === 'string' || existingOrViewport === undefined) {
    existingCode = existingOrViewport || '';
  } else if (existingOrViewport && typeof existingOrViewport === 'object') {
    viewport = {
      width: existingOrViewport.width ?? defaultViewport.width,
      height: existingOrViewport.height ?? defaultViewport.height,
    };
    existingCode = typeof maybeExistingCode === 'string' ? maybeExistingCode : '';
  }

  if (!existingCode && typeof existingOrViewport === 'string' && typeof maybeExistingCode === 'string') {
    existingCode = maybeExistingCode;
  }

  const viewportWidth = viewport.width ?? defaultViewport.width;
  const viewportHeight = viewport.height ?? defaultViewport.height;
  const minViewportDimension = Math.min(viewportWidth, viewportHeight) || defaultViewport.width;

  const roundFactor = (value) => Math.round(value * 10000) / 10000;
  const isZero = (value) => Math.abs(value) < 1e-6;

  const formatDimensionExpr = (factor, axis, dimensionValue = null, baseDimension = null) => {
    const axisProp = axis === 'width' ? 'width' : 'height';
    if (dimensionValue != null && baseDimension) {
      if (dimensionValue === 0) return '0';
      if (dimensionValue === baseDimension) return `viewport.${axisProp}`;
      if (dimensionValue === -baseDimension) return `-viewport.${axisProp}`;
      return `(viewport.${axisProp} * ${dimensionValue} / ${baseDimension})`;
    }

    const rounded = roundFactor(factor);
    if (isZero(rounded)) return '0';
    if (Math.abs(rounded - 1) < 1e-6) return `viewport.${axisProp}`;
    if (Math.abs(rounded + 1) < 1e-6) return `-viewport.${axisProp}`;
    return `viewport.${axisProp} * ${rounded}`;
  };

  const formatRadiusExpr = (factor) => {
    const rounded = roundFactor(factor);
    if (isZero(rounded)) return '0';
    const baseExpr = 'Math.min(viewport.width, viewport.height)';
    if (Math.abs(rounded - 1) < 1e-6) return baseExpr;
    if (Math.abs(rounded + 1) < 1e-6) return `-${baseExpr}`;
    return `${baseExpr} * ${rounded}`;
  };

  const formatLiteral = (value) => {
    const rounded = roundFactor(value);
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
  };

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

  const flattenNodes = (nodes = []) => {
    const acc = [];
    const walk = (node) => {
      acc.push(node);
      if (node.children && node.children.length) {
        node.children.forEach(walk);
      }
    };
    (nodes || []).forEach(walk);
    return acc;
  };

  const flattenedObjects = flattenNodes(gameObjects || []);

  const imports = [];
  const components = new Set();
  components.add('pos');
  
  // Analyze what components are used
  flattenedObjects.forEach(obj => {
    (obj.components || []).forEach(comp => {
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
      } else if (comp.type === 'Sprite') {
        components.add('sprite');
      } else if (comp.type === 'Text') {
        components.add('text');
      }
    });
    // Always include area for collision if Physics is present
    if (obj.components.some(c => c.type === 'Physics')) {
      components.add('area');
    }
  });
  
  const usedIdentifiers = new Set();
  const usedTags = new Set();
  const identifierMap = new Map();
  const tagMap = new Map();
  const spriteAssetMap = new Map();
  const usedSpriteIdentifiers = new Set();

  const sanitizeBaseName = (name) =>
    (name || '')
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+/, '')
      .replace(/_+$/, '');

  const reserveIdentifier = (base, set) => {
    let candidate = base;
    if (!candidate || !/^[a-zA-Z_]/.test(candidate)) {
      candidate = `node${base ? `_${candidate}` : ''}`;
    }
    let suffix = 1;
    while (set.has(candidate)) {
      candidate = `${base || 'node'}_${suffix++}`;
    }
    set.add(candidate);
    return candidate;
  };

  const assignIdentifiers = (nodes = []) => {
    for (const node of nodes) {
      const baseName = sanitizeBaseName(node.name);
      const identifier = reserveIdentifier(baseName, usedIdentifiers);
      const tagName = reserveIdentifier(baseName, usedTags);
      identifierMap.set(node, identifier);
      tagMap.set(node, tagName);
      assignIdentifiers(node.children || []);
    }
  };

  const reserveSpriteIdentifier = (base) => reserveIdentifier(base, usedSpriteIdentifiers);

  const registerSpriteAsset = (imagePath = '') => {
    if (!imagePath) return null;
    let normalizedPath = imagePath.replace(/\\/g, '/');
    if (!normalizedPath.startsWith('.')) {
      normalizedPath = `../${normalizedPath.replace(/^\/+/, '')}`;
    }
    if (spriteAssetMap.has(normalizedPath)) {
      return spriteAssetMap.get(normalizedPath);
    }
    const fileName = normalizedPath.split('/').pop() || 'sprite';
    const baseName = sanitizeBaseName(fileName.replace(/\.[^/.]+$/, '')) || 'sprite';
    const identifier = reserveSpriteIdentifier(`${baseName}_sprite`);
    const info = { identifier, importPath: normalizedPath };
    spriteAssetMap.set(normalizedPath, info);
    return info;
  };

  assignIdentifiers(gameObjects || []);

  const buildComponentsForObject = (obj) => {
    const componentsList = [];
    const transform = obj.transform;
    const shapeComp = obj.components.find(c => c.type === 'Shape');
    const spriteComp = obj.components.find(c => c.type === 'Sprite');
    
    // transform.x/y represents the anchor point position (not top-left)
    // Use it directly - the RenderSystem will apply anchor offset
    const posX = transform.x;
    const posY = transform.y;

    // Use uniform scaling based on width to preserve aspect ratio
    const scaleFactorX = viewportWidth;
    const scaleFactorY = viewportWidth; // Use width for both to maintain aspect ratio
    
    const posXExpr = formatDimensionExpr(
      posX / scaleFactorX,
      'width',
      posX,
      scaleFactorX,
    );
    const posYExpr = formatDimensionExpr(
      posY / scaleFactorY,
      'width', // Use 'width' for Y too to get uniform scaling
      posY,
      scaleFactorY,
    );
    componentsList.push(`pos(${posXExpr}, ${posYExpr})`);
    
    // Add rotation if not zero
    if (transform.rotation && Math.abs(transform.rotation) > 0.01) {
      componentsList.push(`rotate(${formatLiteral(transform.rotation)})`);
      components.add('rotate');
    }
    
    // Add anchor component if transform has anchor property (only for non-sprites, sprites use originX/originY)
    if (!spriteComp && transform.anchor && transform.anchor !== 'center') {
      componentsList.push(`anchor("${transform.anchor}")`);
      components.add('anchor');
    }
    if (spriteComp) {
      const spriteProps = spriteComp.properties ?? {};
    // Use uniform scaling for sprite dimensions too
    const spriteWidthExpr = formatDimensionExpr(
      transform.width / scaleFactorX,
      'width',
      transform.width,
      scaleFactorX,
    );
    const spriteHeightExpr = formatDimensionExpr(
      transform.height / scaleFactorY,
      'width', // Use 'width' for uniform scaling
      transform.height,
      scaleFactorY,
    );
      const options = [];
      if (spriteProps.dataUrl) {
        options.push(`dataUri: ${JSON.stringify(spriteProps.dataUrl)}`);
      }
      // Note: previewDataUrl is editor-only, not used in runtime
      const originXExpr = formatDimensionExpr(
        (spriteProps.originX ?? transform.width / 2) / scaleFactorX,
        'width',
        spriteProps.originX ?? transform.width / 2,
        scaleFactorX,
      );
      const originYExpr = formatDimensionExpr(
        (spriteProps.originY ?? transform.height / 2) / scaleFactorY,
        'width', // Use 'width' for uniform scaling
        spriteProps.originY ?? transform.height / 2,
        scaleFactorY,
      );
      options.push(`origin: { x: ${originXExpr}, y: ${originYExpr} }`);
      let spriteCall = '';
      if (spriteProps.imagePath) {
        const assetInfo = registerSpriteAsset(spriteProps.imagePath);
        if (assetInfo) {
          spriteCall = `sprite(${assetInfo.identifier}, ${spriteWidthExpr}, ${spriteHeightExpr}${
            options.length ? `, { ${options.join(', ')} }` : ''
          })`;
        }
      }
      if (!spriteCall) {
        const dataUri = spriteProps.dataUrl ?? '';
        const fallbackOptions = spriteProps.dataUrl
          ? options
          : options.filter(opt => !opt.startsWith('dataUri'));
        spriteCall = `sprite(${JSON.stringify(dataUri)}, ${spriteWidthExpr}, ${spriteHeightExpr}${
          fallbackOptions.length ? `, { ${fallbackOptions.join(', ')} }` : ''
        })`;
      }
      componentsList.push(spriteCall);
    }
    if (shapeComp) {
      if (shapeComp.shapeType === 'Rectangle') {
        // Use uniform scaling for rectangles
        const rectWidthExpr = formatDimensionExpr(
          transform.width / scaleFactorX,
          'width',
          transform.width,
          scaleFactorX,
        );
        const rectHeightExpr = formatDimensionExpr(
          transform.height / scaleFactorY,
          'width', // Use 'width' for uniform scaling
          transform.height,
          scaleFactorY,
        );
        componentsList.push(`rect(${rectWidthExpr}, ${rectHeightExpr}, '${shapeComp.color}')`);
      } else if (shapeComp.shapeType === 'Circle') {
        const radiusFactor = Math.min(transform.width, transform.height) / 2 / minViewportDimension;
        const radiusExpr = formatRadiusExpr(radiusFactor);
        componentsList.push(`circle(${radiusExpr}, '${shapeComp.color}')`);
      }
    }

    const textComp = obj.components.find(c => c.type === 'Text');
    if (textComp) {
      const textContent = textComp.text || 'Text';
      const textOptions = [];
      if (textComp.textSize && textComp.textSize !== 16) {
        textOptions.push(`size: ${textComp.textSize}`);
      }
      if (textComp.align && textComp.align !== 'left') {
        textOptions.push(`align: '${textComp.align}'`);
      }
      if (textComp.color && textComp.color !== '#ffffff') {
        textOptions.push(`color: '${textComp.color}'`);
      }
      const textCall = textOptions.length > 0
        ? `text(${JSON.stringify(textContent)}, { ${textOptions.join(', ')} })`
        : `text(${JSON.stringify(textContent)})`;
      componentsList.push(textCall);
    }

    const areaComp = obj.components.find(c => c.type === 'Area');
    const needsArea = !!areaComp || obj.components.some(c => c.type === 'Physics');
    if (needsArea) {
      const areaOptions = [];
      if (areaComp) {
        const rawScale = areaComp.scale ?? { x: 1, y: 1 };
        const scaleObj = typeof rawScale === 'number' ? { x: rawScale, y: rawScale } : rawScale;
        const scaleX = scaleObj.x ?? 1;
        const scaleY = scaleObj.y ?? 1;
        const offset = areaComp.offset ?? { x: 0, y: 0 };
        const defaultWidth = transform.width;
        const defaultHeight = transform.height;
        const baseAreaWidth =
          areaComp.width != null
            ? areaComp.width
            : areaComp.radius != null
              ? areaComp.radius * 2
              : defaultWidth;
        const baseAreaHeight =
          areaComp.height != null
            ? areaComp.height
            : areaComp.radius != null
              ? areaComp.radius * 2
              : defaultHeight;
        const effectiveAreaWidth = baseAreaWidth * scaleX;
        const effectiveAreaHeight = baseAreaHeight * scaleY;
        const convertedOffsetX = offset.x + effectiveAreaWidth / 2 - defaultWidth / 2;
        const convertedOffsetY = offset.y + effectiveAreaHeight / 2 - defaultHeight / 2;

        const normalizedShape =
          typeof areaComp.shape === 'string'
            ? (areaComp.shape.toLowerCase() === 'auto' ? null : areaComp.shape)
            : areaComp.shape;
        if (normalizedShape) {
          areaOptions.push(`shape: '${normalizedShape}'`);
        }
        if (areaComp.width != null) {
          const widthExpr = formatDimensionExpr(
            areaComp.width / scaleFactorX,
            'width',
            areaComp.width,
            scaleFactorX,
          );
          areaOptions.push(`width: ${widthExpr}`);
        }
        if (areaComp.height != null) {
          const heightExpr = formatDimensionExpr(
            areaComp.height / scaleFactorY,
            'width', // Use 'width' for uniform scaling
            areaComp.height,
            scaleFactorY,
          );
          areaOptions.push(`height: ${heightExpr}`);
        }
        if (areaComp.radius != null) {
          const radiusExpr = formatRadiusExpr(areaComp.radius / minViewportDimension);
          areaOptions.push(`radius: ${radiusExpr}`);
        }
        if (scaleX !== 1 || scaleY !== 1) {
          areaOptions.push(`scale: { x: ${formatLiteral(scaleX)}, y: ${formatLiteral(scaleY)} }`);
        }
        if (areaComp.collisionIgnore && areaComp.collisionIgnore.length > 0) {
          const tags = areaComp.collisionIgnore.map(tag => `'${tag}'`).join(', ');
          areaOptions.push(`collisionIgnore: [${tags}]`);
        }
        if (areaComp.restitution != null && areaComp.restitution !== 0) {
          areaOptions.push(`restitution: ${formatLiteral(areaComp.restitution)}`);
        }
        if (areaComp.friction != null && areaComp.friction !== 1) {
          areaOptions.push(`friction: ${formatLiteral(areaComp.friction)}`);
        }
        const offsetXExpr = formatDimensionExpr(
          convertedOffsetX / scaleFactorX,
          'width',
          convertedOffsetX,
          scaleFactorX,
        );
        const offsetYExpr = formatDimensionExpr(
          convertedOffsetY / scaleFactorY,
          'width', // Use 'width' for uniform scaling
          convertedOffsetY,
          scaleFactorY,
        );
        if (offsetXExpr !== '0' || offsetYExpr !== '0') {
          areaOptions.push(`offset: { x: ${offsetXExpr}, y: ${offsetYExpr} }`);
        }
      }

      const areaCall =
        areaOptions.length > 0 ? `area({ ${areaOptions.join(', ')} })` : 'area()';
      componentsList.push(areaCall);
    }

    const physicsComp = obj.components.find(c => c.type === 'Physics');
    if (physicsComp) {
      const physicsProps = [];
      if (physicsComp.mass !== 1) {
        physicsProps.push(`mass: ${formatLiteral(physicsComp.mass)}`);
      }
      if (physicsComp.gravity === false) {
        physicsProps.push(`gravity: false`);
      }
      if (physicsComp.isStatic) {
        physicsProps.push(`isStatic: true`);
      }
      if (
        physicsComp.velocity &&
        (!isZero(physicsComp.velocity.x) || !isZero(physicsComp.velocity.y))
      ) {
        physicsProps.push(
          `velocity: { x: ${formatLiteral(physicsComp.velocity.x)}, y: ${formatLiteral(
            physicsComp.velocity.y,
          )} }`,
        );
      }
      if (
        physicsComp.acceleration &&
        (!isZero(physicsComp.acceleration.x) || !isZero(physicsComp.acceleration.y))
      ) {
        physicsProps.push(
          `acceleration: { x: ${formatLiteral(physicsComp.acceleration.x)}, y: ${formatLiteral(
            physicsComp.acceleration.y,
          )} }`,
        );
      }
      if (physicsProps.length > 0) {
        componentsList.push(`body({ ${physicsProps.join(', ')} })`);
      } else {
        componentsList.push('body()');
      }
    }

    const tag = tagMap.get(obj) || 'node';
    componentsList.push(`"${tag}"`);

    return componentsList;
  };

  const generateObjectBlock = (obj, parentVar, depth = 1) => {
    const indent = '  '.repeat(depth);
    const innerIndent = `${indent}  `;
    const varName = identifierMap.get(obj) || 'node';
    const tag = tagMap.get(obj) || 'node';
    const componentsList = buildComponentsForObject(obj);
    const componentsStr = componentsList.map(c => `${innerIndent}${c}`).join(',\n');
    const addCall = parentVar
      ? `${parentVar}.addChild([\n${componentsStr}\n${indent}])`
      : `ctx.add([\n${componentsStr}\n${indent}])`;

    const lines = [];

    const scriptComp = obj.components.find(c => c.type === 'Script');
    let scriptVarName = '';
    if (scriptComp && scriptComp.code) {
      const normalizedCode = scriptComp.code.replace(/\r/g, '');
      scriptVarName = `${varName}_script`;
      
      // Extract ready() function
      const readyMatch = normalizedCode.match(
        /function\s+ready\s*\(\s*\)\s*\{([\s\S]*?)\n\}/,
      );
      
      // Extract update() function
      const updateMatch = normalizedCode.match(
        /function\s+update\s*\(([^)]*)\)\s*\{([\s\S]*?)\n\}/,
      );

      // Extract setup code (everything outside ready/update functions)
      let setupCode = normalizedCode;
      if (readyMatch) {
        setupCode = setupCode.replace(readyMatch[0], '');
      }
      if (updateMatch) {
        setupCode = setupCode.replace(updateMatch[0], '');
      }
      
      const setupLines = setupCode
        .split('\n')
        .map(line => {
          const trimmed = line.trimEnd();
          // Add type annotations to common variables
          if (trimmed.match(/^(let|const)\s+body\s*=/)) {
            return trimmed.replace(/^(let|const)\s+body\s*=/, '$1 body: any =');
          }
          if (trimmed.match(/^(let|const)\s+playableBounds\s*=/)) {
            return trimmed.replace(/^(let|const)\s+playableBounds\s*=/, '$1 playableBounds: any =');
          }
          if (trimmed.match(/^(let|const)\s+(\w+Wall)\s*=/)) {
            return trimmed.replace(/^(let|const)\s+(\w+Wall)\s*=/, '$1 $2: any =');
          }
          return trimmed;
        })
        .filter(line => line.trim().length > 0 && !line.startsWith('// Script'));

      const setupBlock = setupLines.length
        ? `${setupLines.map(line => `${indent}  ${line}`).join('\n')}\n`
        : '';

      // Helper to add type annotations to callback parameters
      const addCallbackTypes = (code) => {
        // Add type to onCollide callbacks: (other) => becomes (other: any) =>
        return code.replace(/\((\w+)\)\s*=>/g, '($1: any) =>');
      };

      const readyBody = readyMatch && readyMatch[1].trim() ? addCallbackTypes(readyMatch[1].trim()) : '';
      const updateParams = updateMatch && updateMatch[1] ? updateMatch[1].trim() : '';
      const updateBody = updateMatch && updateMatch[2].trim() ? addCallbackTypes(updateMatch[2].trim()) : '';

      // Build component with ready() and update() methods
      const componentMethods = [];
      
      if (readyBody) {
        const readyBlock = indentBlock(readyBody, `${indent}      `);
        const readyMethod = [
          `${indent}    ready() {`,
          `${readyBlock}`,
          `${indent}    }`
        ].join('\n');
        componentMethods.push(readyMethod);
      }

      if (updateBody) {
        const updateBlock = indentBlock(updateBody, `${indent}      `);
        // Add type annotation to dt parameter if not present
        const typedParams = updateParams && !updateParams.includes(':')
          ? `${updateParams}: number`
          : updateParams || 'dt: number';
        const updateMethod = [
          `${indent}    update(${typedParams}) {`,
          `${updateBlock}`,
          `${indent}    }`
        ].join('\n');
        componentMethods.push(updateMethod);
      }

      if (componentMethods.length > 0 || setupBlock) {
        const methodsStr = componentMethods.join(',\n');
        const bindStatements = [];
        if (readyBody) {
          bindStatements.push(`${indent}  comp.ready = comp.ready.bind(this);`);
        }
        if (updateBody) {
          bindStatements.push(`${indent}  comp.update = comp.update.bind(this);`);
        }
        const bindBlock = bindStatements.length > 0 ? `\n${bindStatements.join('\n')}\n` : '';
        
        lines.push(
          `${indent}// Custom script component for ${obj.name}`,
          `${indent}const ${scriptVarName} = function(this: any) {`,
          `${setupBlock}${indent}  const comp = {`,
          `${indent}    id: "${tag}_script"${componentMethods.length ? ',' : ''}`,
          methodsStr,
          `${indent}  };`,
          bindBlock,
          `${indent}  return comp;`,
          `${indent}};`,
        );
      } else {
        scriptVarName = '';
      }
    }

    lines.push(`${indent}// ${obj.name}`);
    lines.push(`${indent}const ${varName} = ${addCall};`);
    if (scriptVarName) {
      const scriptComp = obj.components.find(c => c.type === 'Script');
      const hasReady = scriptComp && /function\s+ready\s*\(\s*\)\s*\{/.test(scriptComp.code);
      
      lines.push(`${indent}const ${varName}_comp = ${scriptVarName}.call(${varName});`);
      lines.push(`${indent}${varName}.add(${varName}_comp);`);
      
      if (hasReady) {
        lines.push(`${indent}readyComponents.push(${varName}_comp);`);
      }
    }

    for (const child of obj.children || []) {
      const childBlock = generateObjectBlock(child, varName, depth);
      if (childBlock) {
        lines.push('');
        lines.push(childBlock);
      }
    }

    return lines.join('\n');
  };

  // Track which objects have ready() functions for Phase 2 initialization
  const objectsWithReady = [];
  const collectObjectsWithReady = (nodes = []) => {
    for (const node of nodes) {
      const scriptComp = node.components.find(c => c.type === 'Script');
      if (scriptComp && scriptComp.code) {
        const hasReady = /function\s+ready\s*\(\s*\)\s*\{/.test(scriptComp.code);
        if (hasReady) {
          const varName = identifierMap.get(node);
          if (varName) {
            objectsWithReady.push(varName);
          }
        }
      }
      collectObjectsWithReady(node.children || []);
    }
  };
  collectObjectsWithReady(gameObjects || []);

  const gameObjectsCode = (gameObjects || [])
    .map(obj => generateObjectBlock(obj, null, 1))
    .filter(Boolean)
    .join('\n\n');
  
  // Phase 2: Generate ready() initialization calls
  const phase2InitCode = objectsWithReady.length > 0
    ? `\n\n  // ===== PHASE 2: Initialize all scripts (ready functions) =====\n  // Now all objects exist in the scene, safe to reference them\n  for (const comp of readyComponents) {\n    if (comp.ready) comp.ready();\n  }`
    : '';
  
  const importList = Array.from(components).join(', ');
  const importStatement = importList 
    ? `import { ${importList} } from '../engine';`
    : `// No components used yet`;
  const spriteImportLines = Array.from(spriteAssetMap.values()).map(
    ({ identifier, importPath }) => `import ${identifier} from '${importPath}';`
  );
  const autoImportsBlock = [importStatement, ...spriteImportLines].filter(Boolean).join('\n') || '';
  
  // Build complete scene function
  const viewportLine = '  const viewport = ctx.getViewport();';
  const readyArrayDeclaration = objectsWithReady.length > 0
    ? '\n  const readyComponents: any[] = [];'
    : '';

  const autoSceneBlock = flattenedObjects.length > 0
    ? `${viewportLine}${readyArrayDeclaration}\n\n  // ===== PHASE 1: Create all scene objects =====\n${gameObjectsCode}${phase2InitCode}`
    : '  // Add GameObjects using the editor!';

  const userImportsBlock =
    userImportsRaw || '// Add your own imports below. These will NOT be overwritten.';
  const userSceneBlock = userSceneRaw
    ? indentBlock(userSceneRaw, '  ')
    : '  // Add custom scene logic here (persisted across regenerations)';

  const code = `// ========================= REGAME LEVEL =========================
// Generated + user-safe regions for Cursor/Codegen

import type { GameContext } from '../engine';

/* <<<AUTO-GENERATED:IMPORTS:START>>> */
${autoImportsBlock}
/* <<<AUTO-GENERATED:IMPORTS:END>>> */

/* <<<USER-IMPORTS:START>>> */
${userImportsBlock}
/* <<<USER-IMPORTS:END>>> */

export function ${sceneName}(ctx: GameContext): void {
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


