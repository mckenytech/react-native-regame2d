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

    const posXExpr = formatDimensionExpr(
      posX / viewportWidth,
      'width',
      posX,
      viewportWidth,
    );
    const posYExpr = formatDimensionExpr(
      posY / viewportHeight,
      'height',
      posY,
      viewportHeight,
    );
    componentsList.push(`pos(${posXExpr}, ${posYExpr})`);
    
    // Add anchor component if transform has anchor property (only for non-sprites, sprites use originX/originY)
    if (!spriteComp && transform.anchor && transform.anchor !== 'center') {
      componentsList.push(`anchor("${transform.anchor}")`);
      components.add('anchor');
    }
    if (spriteComp) {
      const spriteProps = spriteComp.properties ?? {};
    const spriteWidthExpr = formatDimensionExpr(
      transform.width / viewportWidth,
      'width',
      transform.width,
      viewportWidth,
    );
    const spriteHeightExpr = formatDimensionExpr(
      transform.height / viewportHeight,
      'height',
      transform.height,
      viewportHeight,
    );
      const options = [];
      if (spriteProps.dataUrl) {
        options.push(`dataUri: ${JSON.stringify(spriteProps.dataUrl)}`);
      }
      if (spriteProps.previewDataUrl) {
        options.push(`previewDataUrl: ${JSON.stringify(spriteProps.previewDataUrl)}`);
      }
      const originXExpr = formatDimensionExpr(
        (spriteProps.originX ?? transform.width / 2) / viewportWidth,
        'width',
        spriteProps.originX ?? transform.width / 2,
        viewportWidth,
      );
      const originYExpr = formatDimensionExpr(
        (spriteProps.originY ?? transform.height / 2) / viewportHeight,
        'height',
        spriteProps.originY ?? transform.height / 2,
        viewportHeight,
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
        const dataUri = spriteProps.dataUrl ?? spriteProps.previewDataUrl ?? '';
        const fallbackOptions = spriteProps.dataUrl || spriteProps.previewDataUrl
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
        const rectWidthExpr = formatDimensionExpr(
          transform.width / viewportWidth,
          'width',
          transform.width,
          viewportWidth,
        );
        const rectHeightExpr = formatDimensionExpr(
          transform.height / viewportHeight,
          'height',
          transform.height,
          viewportHeight,
        );
        componentsList.push(`rect(${rectWidthExpr}, ${rectHeightExpr}, '${shapeComp.color}')`);
      } else if (shapeComp.shapeType === 'Circle') {
        const radiusFactor = Math.min(transform.width, transform.height) / 2 / minViewportDimension;
        const radiusExpr = formatRadiusExpr(radiusFactor);
        componentsList.push(`circle(${radiusExpr}, '${shapeComp.color}')`);
      }
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
            areaComp.width / viewportWidth,
            'width',
            areaComp.width,
            viewportWidth,
          );
          areaOptions.push(`width: ${widthExpr}`);
        }
        if (areaComp.height != null) {
          const heightExpr = formatDimensionExpr(
            areaComp.height / viewportHeight,
            'height',
            areaComp.height,
            viewportHeight,
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
          convertedOffsetX / viewportWidth,
          'width',
          convertedOffsetX,
          viewportWidth,
        );
        const offsetYExpr = formatDimensionExpr(
          convertedOffsetY / viewportHeight,
          'height',
          convertedOffsetY,
          viewportHeight,
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
      const updateMatch = normalizedCode.match(
        /export\s+function\s+update\s*\(([^)]*)\)\s*\{([\s\S]*?)\n\}/,
      );

      if (updateMatch && updateMatch[2].trim()) {
        const params = updateMatch[1].trim();
        const updateBody = updateMatch[2].trim();
        const setupLines = normalizedCode
          .slice(0, updateMatch.index)
          .split('\n')
          .map(line => line.trimEnd())
          .filter(line => line.trim().length > 0 && !line.includes('// Script'));
        const setupBlock = setupLines.length
          ? `${setupLines.map(line => `${indent}  ${line}`).join('\n')}\n`
          : '';
        const updateBlock = indentBlock(updateBody, `${indent}      `);
        lines.push(
          `${indent}// Custom script component for ${obj.name}`,
          `${indent}const ${scriptVarName} = function() {`,
          `${indent}  const self = this; // Capture reference to GameObject`,
          `${setupBlock}${indent}  return {`,
          `${indent}    id: "${tag}_script",`,
          `${indent}    // Bind update to the GameObject so 'this' refers to the GameObject`,
          `${indent}    update: function(${params}) {`,
          `${updateBlock}`,
          `${indent}    }.bind(self)`,
          `${indent}  };`,
          `${indent}};`,
        );
      } else if (normalizedCode.trim().length) {
        const setupLines = normalizedCode
          .split('\n')
          .map(line => line.trimEnd())
          .filter(line => line.trim().length > 0 && !line.startsWith('// Script'));
        const setupBlock = setupLines.length
          ? `${setupLines.map(line => `${indent}  ${line}`).join('\n')}\n`
          : '';
        lines.push(
          `${indent}// Custom script component for ${obj.name}`,
          `${indent}const ${scriptVarName} = function() {`,
          `${indent}  const self = this; // Capture reference to GameObject`,
          `${setupBlock}${indent}  return {`,
          `${indent}    id: "${tag}_script"`,
          `${indent}  };`,
          `${indent}};`,
        );
      } else {
        scriptVarName = '';
      }
    }

    lines.push(`${indent}// ${obj.name}`);
    lines.push(`${indent}const ${varName} = ${addCall};`);
    if (scriptVarName) {
      lines.push(`${indent}${varName}.add(${scriptVarName}.call(${varName}));`);
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

  const gameObjectsCode = (gameObjects || [])
    .map(obj => generateObjectBlock(obj, null, 1))
    .filter(Boolean)
    .join('\n\n');
  
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

  const autoSceneBlock = flattenedObjects.length > 0
    ? `${viewportLine}\n\n${gameObjectsCode}`
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


