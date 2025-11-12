// Project scaffolder - creates actual React Native projects on the file system

export interface ProjectConfig {
  name: string;
  directory: FileSystemDirectoryHandle;
}

export async function createReactNativeProject(config: ProjectConfig): Promise<void> {
  const { name, directory } = config;
  
  // Create project directory
  const projectDir = await directory.getDirectoryHandle(name, { create: true });
  
  // Create package.json
  await createFile(projectDir, 'package.json', JSON.stringify({
    name: name.toLowerCase().replace(/\s+/g, '-'),
    version: '1.0.0',
    main: 'node_modules/expo/AppEntry.js',
    scripts: {
      start: 'expo start',
      android: 'expo start --android',
      ios: 'expo start --ios',
      web: 'expo start --web'
    },
    dependencies: {
      expo: '~49.0.0',
      'expo-status-bar': '~1.6.0',
      react: '18.2.0',
      'react-native': '0.72.6',
      'react-native-reanimated': '^3.5.4',
      'react-native-gesture-handler': '^2.13.4',
      '@shopify/react-native-skia': '^0.1.221'
    },
    devDependencies: {
      '@babel/core': '^7.20.0'
    },
    private: true
  }, null, 2));
  
  // Create App.js
  await createFile(projectDir, 'App.js', getAppTemplate());
  
  // Create app.json
  await createFile(projectDir, 'app.json', JSON.stringify({
    expo: {
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      orientation: 'portrait',
      icon: './assets/icon.png',
      userInterfaceStyle: 'light',
      splash: {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff'
      },
      assetBundlePatterns: ['**/*'],
      ios: {
        supportsTablet: true
      },
      android: {
        adaptiveIcon: {
          foregroundImage: './assets/adaptive-icon.png',
          backgroundColor: '#ffffff'
        }
      },
      web: {
        favicon: './assets/favicon.png'
      },
      plugins: [
        'react-native-reanimated/plugin'
      ]
    }
  }, null, 2));
  
  // Create babel.config.js
  await createFile(projectDir, 'babel.config.js', `module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
`);
  
  // Create .gitignore
  await createFile(projectDir, '.gitignore', `node_modules/
.expo/
dist/
npm-debug.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/
.env
`);
  
  // Create README
  await createFile(projectDir, 'README.md', getReadmeTemplate(name));
  
  // Create engine directory structure
  await createEngineFiles(projectDir);
  
  // Create assets directory
  const assetsDir = await projectDir.getDirectoryHandle('assets', { create: true });
  
  // Note: We can't actually create image files via browser, so we'll create placeholder instructions
  await createFile(assetsDir, 'README.txt', `Asset placeholders - replace with your own images:
- icon.png (1024x1024)
- splash.png (1284x2778)
- adaptive-icon.png (1024x1024)
- favicon.png (48x48)

Or run 'npx expo-cli init' assets generation`);
}

async function createFile(dir: FileSystemDirectoryHandle, name: string, content: string): Promise<void> {
  const fileHandle = await dir.getFileHandle(name, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

async function createEngineFiles(projectDir: FileSystemDirectoryHandle): Promise<void> {
  const engineDir = await projectDir.getDirectoryHandle('engine', { create: true });
  
  // Get engine files content
  const engineFiles = await getEngineFiles();
  
  // Create each file
  for (const [path, content] of Object.entries(engineFiles)) {
    const parts = path.split('/');
    const fileName = parts.pop()!;
    
    // Create subdirectories if needed
    let currentDir = engineDir;
    for (const part of parts) {
      currentDir = await currentDir.getDirectoryHandle(part, { create: true });
    }
    
    await createFile(currentDir, fileName, content);
  }
}

async function getEngineFiles(): Promise<Record<string, string>> {
  // Return embedded engine template
  // These are the core engine files that will be created in the project
  return {
    'README.md': `# ReGame Engine

Copy the engine files from your regame-engine repository or package.

Required files:
- index.tsx
- types.ts
- components/index.ts
- components/GamePad.tsx
- core/GameObject.ts
- core/GameContext.ts
- core/InputSystem.ts
- systems/RenderSystem.tsx
- systems/CollisionSystem.ts

## Installation

1. Copy the \`engine\` folder from the regame-engine repository
2. Or install via npm (when published):
   \`\`\`
   npm install regame-engine
   \`\`\`

3. Update your App.js imports to use the engine

## Quick Start

See App.js for a working example of how to use the engine.
`,
  };
}

function getAppTemplate(): string {
  return `import { Game, pos, rect, circle, body, area } from './engine';

export default function App() {
  return (
    <Game showGamePad>
      {(ctx) => {
        // Create player
        const player = ctx.add([
          pos(200, 200),
          rect(40, 40, '#6495ed'),
          area(),
          "player"
        ]);

        // Movement controls
        ctx.onKeyPress("up", () => {
          const transform = player.get('transform');
          transform.pos.y.value -= 5;
        });
        ctx.onKeyPress("down", () => {
          const transform = player.get('transform');
          transform.pos.y.value += 5;
        });
        ctx.onKeyPress("left", () => {
          const transform = player.get('transform');
          transform.pos.x.value -= 5;
        });
        ctx.onKeyPress("right", () => {
          const transform = player.get('transform');
          transform.pos.x.value += 5;
        });

        // Create bouncing enemies
        for (let i = 0; i < 3; i++) {
          ctx.add([
            pos(Math.random() * 400, Math.random() * 600),
            circle(20, '#ff6464'),
            area(),
            body({ 
              velocity: { 
                x: (Math.random() - 0.5) * 200, 
                y: (Math.random() - 0.5) * 200 
              } 
            }),
            "enemy"
          ]);
        }

        // Platform
        ctx.add([
          pos(200, 500),
          rect(300, 20, '#90ee90'),
          area(),
          body({ isStatic: true }),
          "platform"
        ]);

        // Collision handling
        player.onCollide("enemy", (enemy) => {
          console.log("Hit enemy!");
          ctx.destroy(enemy);
        });
      }}
    </Game>
  );
}
`;
}

function getReadmeTemplate(projectName: string): string {
  return `# ${projectName}

A game built with ReGame Engine

## Setup

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Start the development server:
\`\`\`bash
npm start
\`\`\`

3. Run on your device:
   - Press \`a\` for Android
   - Press \`i\` for iOS
   - Scan the QR code with Expo Go app

## Project Structure

- \`App.js\` - Main game file
- \`engine/\` - ReGame Engine source
- \`assets/\` - Images and assets

## Documentation

Visit https://github.com/yourusername/regame-engine for full documentation.

## Controls

- **D-Pad**: Move player
- **A Button**: Action
- **B Button**: Jump

Happy game making! 🎮
`;
}

export function checkFileSystemAccessSupport(): boolean {
  return 'showDirectoryPicker' in window;
}

