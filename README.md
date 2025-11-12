# 🎮 ReGame Engine Editor

A React Native/Expo visual editor for creating cross-platform games with the ReGame Engine.

## What is ReGame Engine Editor?

ReGame Engine Editor is a **React Native desktop/mobile app** that helps you create cross-platform games (iOS, Android, Web, Windows) using the ReGame Engine - a Kaplay-inspired game framework.

### Why React Native?

✅ **No server needed** - Direct file system access  
✅ **Cross-platform** - Works on Windows, Mac, Linux (via Electron)  
✅ **Native performance** - Better than web-based editors  
✅ **Can build as desktop app** - Using React Native Windows or Electron  

## Project Structure

```
regame-engine/              # THE EDITOR (React Native App)
├── App.js                  # Main editor app
├── app.json                # Expo configuration
├── index.js                # App entry point
├── babel.config.js         # Babel configuration
├── assets/                 # Editor assets
├── src/                    # Web components (legacy, can be removed)
├── starter-template/       # Game project template
│   ├── engine/            # ReGame Engine core
│   ├── scenes/            # Default game scenes
│   ├── scripts/           # Helper utilities
│   ├── App.js             # Game entry point
│   └── [config files]     # Templates for new projects
└── package.json            # Expo dependencies
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Editor

```bash
npm start
```

This will start Expo Dev Server. You can:
- Press `w` to open in web browser
- Press `a` to run on Android
- Press `i` to run on iOS  
- Press `r` to reload
- Scan QR code with Expo Go app on your phone

### 3. Build for Desktop

#### Option A: React Native Windows (Windows only)
```bash
npm run windows
```

#### Option B: Electron (coming soon)
Cross-platform desktop app using Electron

## Editor Features

### Current Features ✅

- **Project Manager**: Create new projects or quick start
- **Three-Panel Layout**: Hierarchy, Scene View, Inspector
- **React Native File System**: Direct file access, no server needed
- **Modern UI**: Dark theme, intuitive interface

### Coming Soon 🚧

- **Drag & Drop**: Add game objects to scene
- **Visual Inspector**: Edit object properties
- **Live Preview**: See changes in real-time
- **Project Creation**: Copy starter-template to new location
- **Code Export**: Generate game code from visual editor
- **Recent Projects**: Browse and open existing projects

## The ReGame Engine

The engine (located in `starter-template/engine/`) is included with every game project you create.

### Features

- 🎨 **Skia-based rendering** - Smooth 60fps animations
- 🎯 **Component-based architecture** - Like Kaplay/Kaboom
- 💥 **Collision detection** - Built-in collision system with events
- 🎮 **Touch controls** - GamePad component for mobile
- ⚡ **Performance optimized** - Uses Reanimated SharedValues
- 📱 **Cross-platform** - iOS, Android, Web

### Basic Game Code Example

```jsx
import { Game, pos, rect, circle, body, area } from './engine';

export default function MyGame() {
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

        // Movement
        ctx.onKeyPress("up", () => player.get('transform').pos.y.value -= 10);
        ctx.onKeyPress("down", () => player.get('transform').pos.y.value += 10);

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
      }}
    </Game>
  );
}
```

## Creating Games with the Editor

### Method 1: Quick Start (In-Memory)

1. Open the editor
2. Enter a project name
3. Click "Open Editor"
4. Design your game visually
5. Export code when ready

### Method 2: Create Project (File-Based)

1. Open the editor
2. Click "Create New Project"
3. Choose name and location
4. Editor copies `starter-template/` to your location
5. Open and edit the project
6. Run with `npm start` in project folder

## Platform Support

| Platform | Status | Command |
|----------|--------|---------|
| **Web** | ✅ Working | `npm run web` |
| **Android** | ✅ Working | `npm run android` |
| **iOS** | ✅ Working | `npm run ios` |
| **Windows** | 🚧 Coming | `npm run windows` |

## File System Access

The editor uses Expo's File System API:

```javascript
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

// Read files
const content = await FileSystem.readAsStringAsync(path);

// Write files
await FileSystem.writeAsStringAsync(path, content);

// Pick directory
const result = await DocumentPicker.getDocumentAsync();
```

No server needed - everything runs natively!

## Development

### Project Setup
```bash
npm install              # Install dependencies
npm start                # Start Expo dev server
```

### Scripts
```bash
npm start                # Start editor
npm run android          # Run on Android
npm run ios              # Run on iOS
npm run web              # Run in browser
npm run windows          # Run on Windows (requires setup)
```

## Engine API Reference

### Components
- `pos(x, y)` - Position
- `rect(width, height, color)` - Rectangle
- `circle(radius, color)` - Circle
- `body({ velocity, acceleration })` - Physics
- `area()` - Collision detection

### Input
```jsx
ctx.onKeyPress("up", callback);
ctx.isKeyDown("a");
```

### Collision
```jsx
obj.onCollide("tag", callback);
obj.onCollideUpdate("tag", callback);
obj.onCollideEnd("tag", callback);
```

## Documentation

- `EDITOR_GUIDE.md` - Editor usage guide
- `EDITOR_SETUP.md` - Setup instructions
- `USAGE.md` - Engine API reference
- `starter-template/engine/README.md` - Engine docs
- `starter-template/engine/COLLISION_GUIDE.md` - Collision system

## Contributing

Contributions welcome! This is a React Native app, so experience with:
- React Native / Expo
- React hooks
- File system operations
- Game engine concepts

## License

MIT

---

**Note**: This is a React Native editor app. The games it creates are also React Native apps using the ReGame Engine.
