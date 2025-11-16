# 🎮 ReGame Engine Editor

A simple desktop editor to create and run ReGame projects (React Native + Expo with Skia/Reanimated).

## What is it?

A Godot-style visual editor that lets you:
- Create a new project from the built-in template
- Design scenes (add Rect/Circle/Sprite/etc.)
- Generate TypeScript scene files
- Build and run on device/emulator

## Project Structure

```
regame-engine/              # THE EDITOR (Electron App)
├── electron/               # Electron main process
│   ├── main.js            # Main process, IPC handlers
│   └── preload.js         # Preload script (exposes electronAPI)
├── src/                    # React UI (runs on Vite dev server)
│   ├── App.jsx            # Main editor UI
│   ├── App-compact.css    # Godot-style compact UI
│   ├── components/        # React components
│   │   └── ScriptEditor.jsx  # Monaco editor for scripts
│   └── utils/
│       └── codeGenerator.js  # JSON → TypeScript scene generator
├── expo-template/          # Template for NEW game projects
│   ├── engine/            # ReGame Engine core
│   ├── scenes/            # Generated scene TypeScript files
│   ├── App.js             # Game entry point
│   └── package.json       # Expo SDK 54 dependencies
└── package.json            # Editor dependencies
```

## Quick Start (5 steps)

1) Install dependencies

```bash
npm install
```

2) Start the editor

```bash
npm run electron:dev
```

3) In the editor → Click “Create New Project”, choose name and folder  
4) Add an object (e.g., Rect) to the scene and save  
5) Build and run (see “Build workflow” below)

### Build workflow (Full vs Soft)

- Full build (first time per device): builds native dev client then runs the app  
  Command the editor runs: `npx expo run:android`

- Soft build (subsequent runs): starts Metro for the already-installed dev client  
  Command the editor runs: `npx expo start --dev-client --clear`

Tips:
- Reload is controlled by Metro/dev client. After saving in the editor, press `r` in the Metro terminal or on the device to reload.
- You can also open your own terminal in the project folder and run the soft build command yourself; then use `r` there to reload.

## Editor Features

### Current Features ✅

- **Project Manager**: Create and open game projects
- **Visual Scene Editor**: Drag-and-drop game objects
- **Three-Panel Layout**: Hierarchy, Scene View, Inspector (Godot-style)
- **Viewport Panning**: Middle mouse drag or Space+drag to navigate large worlds
- **Anchor System**: Kaplay-style anchor points (topleft, center, botright, etc.)
- **Component System**: Add Rect, Circle, Sprite, Area, Body, Script components
- **Monaco Script Editor**: Full TypeScript support with IntelliSense
- **Code Generation**: Automatically generates TypeScript scene files
- **Live Preview**: Run games directly from the editor
- **File Explorer**: Browse and manage project files
- **Sprite Editor**: Built-in pixel art sprite editor

### Scene Editor Controls

- **Pan Viewport**: Middle mouse drag or **Space + drag**
- **Zoom**: Mouse wheel or zoom controls in toolbar
- **Move Objects**: Select object, drag to move
- **Resize Objects**: Drag corner handles
- **Change Anchor**: Use dropdown in Inspector panel

## The ReGame Engine

The engine (located in `expo-template/engine/`) is included with every game project you create.

### Features

- 🎨 **Skia-based rendering** - Smooth 60fps animations with React Native Skia
- 🎯 **Component-based architecture** - Kaplay/Kaboom-style API
- 💥 **Collision detection** - Built-in collision system with events
- 🎮 **Touch controls** - GamePad component for mobile
- ⚡ **Performance optimized** - Uses Reanimated SharedValues
- 📱 **Cross-platform** - iOS, Android, Web (via Expo)
- 🔧 **TypeScript** - Full type safety for scenes and components

### Basic Game Code Example

```typescript
import type { GameContext } from './engine';
import { pos, rect, circle, body, area } from './engine';

export function MainScene(ctx: GameContext): void {
  // Create player
  const player = ctx.add([
    pos(200, 200),
    rect(40, 40, '#6495ed'),
    area(),
    "player"
  ]);

  // Movement
  ctx.onKeyPress("up", () => {
    const transform = player.get('transform');
    if (transform) transform.pos.y.value -= 10;
  });

  // Create enemy
  const enemy = ctx.add([
    pos(400, 300),
    circle(20, '#ff6464'),
    area(),
    body({ velocity: { x: 100, y: 50 } }),
    "enemy"
  ]);

  // Collision
  player.onCollide("enemy", (other) => {
    console.log("Hit!");
    ctx.destroy(other);
  });
}
```

## Creating Games with the Editor

### Method 1: Visual Editor (Recommended)

1. Open the editor (`npm run electron:dev`)
2. Click **"Create New Project"**
3. Enter project name and choose location
4. Design your game scene:
   - Add GameObjects from Hierarchy panel
   - Drag objects in Scene view
   - Edit properties in Inspector
   - Add scripts with Monaco editor
5. Click **"💾 Save Scene"** (Ctrl+S)
6. Full build the first time (Android): `npx expo run:android`  
7. Next times use Soft build: `npx expo start --dev-client --clear`

### Method 2: Code-Only

1. Create project from `expo-template/`
2. Edit `scenes/Main.ts` directly
3. Use TypeScript for type safety

## Platform Support

| Platform | Status | Command |
|----------|--------|---------|
| **Android** | ✅ Working | `npx expo run:android` |
| **iOS** | ✅ Working | `npx expo run:ios` |
| **Web** | ✅ Working | `npx expo start --web` |

**Note**: Uses Expo Dev Build (not Expo Go). Press `r` to reload.

## Development

### Editor Development

```bash
npm install              # Install dependencies
npm run electron:dev    # Start editor in dev mode
npm run build           # Build for production
npm run package         # Package as distributable
```

### Game Development

```bash
cd YourGameProject/
npm install             # Install dependencies
npx expo run:android    # Build and run on Android
npx expo run:ios        # Build and run on iOS
```

## Engine API Reference

### Components
- `pos(x, y)` - Position (anchor point)
- `anchor("topleft" | "center" | "botright" | ...)` - Anchor point
- `rect(width, height, color)` - Rectangle
- `circle(radius, color)` - Circle
- `body({ velocity, acceleration })` - Physics
- `area()` - Collision detection
- `sprite(image, { originX, originY })` - Sprite rendering

### Input
```typescript
ctx.onKeyPress("up", callback);
ctx.isKeyDown("a");
```

### Collision
```typescript
obj.onCollide("tag", callback);
obj.onCollideUpdate("tag", callback);
obj.onCollideEnd("tag", callback);
```

## Documentation

- `expo-template/engine/README.md` - Engine documentation
- `expo-template/engine/COLLISION_GUIDE.md` - Collision system guide

## Requirements

- **Node.js** 18+ 
- **npm** or **yarn**
- **Expo CLI** (for game projects): `npm install -g expo-cli`
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)

## Contributing

Contributions welcome! This is an Electron + React app, so experience with:
- Electron (main process, IPC)
- React + Vite
- React Native / Expo
- TypeScript
- Game engine concepts

## License

MIT

---

**Note**: This is an Electron-based desktop editor. The games it creates are React Native/Expo apps using the ReGame Engine with React Native Skia and Reanimated.
