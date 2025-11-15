# 🎨 ReGame Engine Editor Guide

## What is the Editor?

The ReGame Engine Editor is an **Electron-based desktop application** that helps you create React Native/Expo game projects. It provides:

1. **Visual Scene Design** - Drag-and-drop game objects with a Godot-style interface
2. **Project Management** - Create and manage game projects directly
3. **Code Generation** - Automatically generates TypeScript scene files
4. **Live Preview** - Run games directly from the editor

---

## Starting the Editor

```bash
npm install
npm run electron:dev
```

This starts:
- Vite dev server on `http://localhost:5173`
- Electron window with the editor UI
- Hot reload enabled for both React and Electron

---

## Creating a New Project

### Step 1: Launch Editor

Run `npm run electron:dev` and wait for the Electron window to open.

### Step 2: Create Project

1. Click **"Create New Project"** button
2. Enter project name (e.g., "MyAwesomeGame")
3. Choose a directory on your computer
4. Click **"Create"**

The editor will:
- ✅ Copy `expo-template/` to your chosen location
- ✅ Set up all dependencies (Expo SDK 54)
- ✅ Create initial scene file
- ✅ Open the project in the editor

### Step 3: Design Your Game

1. **Add GameObjects**: Click the **"+"** button in Hierarchy panel
2. **Position Objects**: Drag objects in the Scene view
3. **Edit Properties**: Select object and edit in Inspector panel
4. **Add Components**: Use component dropdowns in Inspector
5. **Write Scripts**: Click script icon to open Monaco editor

### Step 4: Save and Run

- **Save Scene**: Press `Ctrl+S` or click **"💾 Save"** button
- **Run Game**: Click **"▶️ Run"** button to test in editor
- **Run on Device**: Use `npx expo run:android` in project folder

---

## Editor Interface

### Three-Panel Layout (Godot-Style)

```
┌─────────────┬──────────────────┬──────────────┐
│  Hierarchy  │   Scene View     │  Inspector   │
│             │                  │              │
│  - Scene    │  [Canvas Area]   │  Properties  │
│    - Player │                  │  Components  │
│    - Enemy  │                  │              │
└─────────────┴──────────────────┴──────────────┘
```

### Left Panel: Hierarchy

- Tree view of all GameObjects in the scene
- Right-click for context menu (duplicate, delete, etc.)
- Click to select object
- Drag to reorder (parenting coming soon)

### Center Panel: Scene View

- Visual canvas showing your game scene
- **Pan**: Middle mouse drag or **Space + drag**
- **Zoom**: Mouse wheel or zoom controls
- **Select**: Click objects
- **Move**: Drag selected objects
- **Resize**: Drag corner handles

### Right Panel: Inspector

- Shows properties of selected GameObject
- Edit Transform (x, y, width, height, anchor)
- Add/remove Components
- Edit component properties
- Script editor button

---

## Scene Editor Controls

### Panning the Viewport

- **Middle Mouse Drag**: Click and drag with middle mouse button
- **Space + Drag**: Hold Space, then drag with left mouse button
- **Scrollbars**: Use scrollbars to navigate large worlds

### Zooming

- **Mouse Wheel**: Scroll to zoom in/out
- **Zoom Controls**: Use +/- buttons in toolbar
- **Reset Zoom**: Click "Reset" button

### Object Manipulation

- **Select**: Click object in Scene view or Hierarchy
- **Move**: Drag selected object
- **Resize**: Drag corner handles (when resizable)
- **Delete**: Select and press `Delete` key

---

## Components

### Transform Component

Every GameObject has a Transform:
- **Position (x, y)**: Anchor point position in pixels
- **Size (width, height)**: Object dimensions
- **Anchor**: Drawing origin (topleft, center, botright, etc.)

### Shape Component

- **Rect**: Rectangle with width, height, color
- **Circle**: Circle with radius, color

### Sprite Component

- **Image**: Upload or select sprite image
- **Origin (originX, originY)**: Pixel offset for drawing origin
- **Built-in Editor**: Click sprite to open pixel art editor

### Area Component

- **Collision Detection**: Enables collision events
- **Tags**: Add tags for collision filtering

### Body Component

- **Physics**: Velocity, acceleration
- **Gravity**: Enable/disable gravity

### Script Component

- **Custom Logic**: Write TypeScript code
- **Monaco Editor**: Full IntelliSense support
- **Access to Engine API**: Use `ctx` and component APIs

---

## Code Generation

When you save a scene, the editor automatically:

1. **Saves JSON**: Scene data saved to `scenes/MainScene.json`
2. **Generates TypeScript**: Creates `scenes/Main.ts` with executable code
3. **Updates App.js**: Imports and runs the generated scene

### Generated Code Example

```typescript
import type { GameContext } from '../engine';
import { pos, rect, anchor } from '../engine';

export function MainScene(ctx: GameContext): void {
  const player = ctx.add([
    pos(100, 200),
    rect(50, 50, '#6495ed'),
    anchor('topleft'),
    "player"
  ]);
}
```

---

## Tips & Tricks

### Keyboard Shortcuts

- `Ctrl+S`: Save scene
- `Delete`: Delete selected object
- `Space`: Hold for pan mode
- `Ctrl+Z`: Undo (coming soon)
- `Ctrl+Y`: Redo (coming soon)

### Best Practices

1. **Name Your Objects**: Use descriptive names in Hierarchy
2. **Use Tags**: Add tags to objects for collision filtering
3. **Anchor Points**: Choose appropriate anchors (topleft for UI, center for sprites)
4. **Organize Scenes**: Create multiple scenes for different levels
5. **Script Organization**: Keep scripts focused and reusable

### Common Workflows

**Creating a Platformer:**
1. Add Rect for ground
2. Add Sprite for player
3. Add Body component with gravity
4. Add Area component for collision
5. Write script for movement and jumping

**Creating a UI:**
1. Add Rects for buttons
2. Set anchor to "topleft"
3. Position relative to viewport
4. Add Script for click handlers

---

## Troubleshooting

### Editor Won't Start

- Check Node.js version (18+ required)
- Run `npm install` to ensure dependencies are installed
- Check if port 5173 is available

### Scene Not Saving

- Check file permissions in project directory
- Ensure project is properly opened
- Check console for error messages

### Generated Code Has Errors

- Check TypeScript errors in Monaco editor
- Ensure engine files are synced from `expo-template/`
- Verify component properties are valid

### Game Won't Run

- Run `npm install` in project folder
- Check Expo SDK version matches (54)
- Verify Android/iOS setup for device testing

---

## Next Steps

- Read `expo-template/engine/README.md` for engine API
- Check `expo-template/engine/COLLISION_GUIDE.md` for collision system
- Experiment with different components and scripts
- Create multiple scenes for your game

---

**Happy Game Making! 🎮**
