# 🎮 ReGame Engine Editor - Setup Guide

Complete guide to setting up the desktop editor for ReGame Engine.

## 📁 Project Structure (Editor)

```
regame-engine/
├── electron/            # Main process + preload
├── src/                 # React UI (Vite)
│   ├── App.jsx
│   ├── components/
│   └── utils/codeGenerator.js
├── expo-template/       # Template copied into new projects
│   ├── engine/
│   ├── scenes/
│   ├── App.js
│   └── package.json
└── package.json         # Editor scripts and deps
```

## 🚀 Quick Start (Editor)

```bash
npm install
npm run electron:dev
```

This starts the Vite dev server and opens the Electron editor window.

## 📦 Create a New Game Project

1) In the editor, click “Create New Project”  
2) Pick a name and folder  
3) The editor copies `expo-template/` to your folder  
4) Open the project in the editor to edit scenes

## ▶ Build Workflow (Device/Emulator)

- Full build (first time): builds native dev client and runs app  
  Runs: `npx expo run:android` (or `:ios`)

- Soft build (next times): starts Metro for already-installed dev client  
  Runs: `npx expo start --dev-client --clear`

Reload tips:
- After saving in the editor, press `r` in the Metro terminal or on the device to reload
- You can also start the Soft build yourself in a separate terminal inside the project folder

## 🎨 Editor Features

### 1. **Project Manager**
- Create new game projects
- Quick start with demo template
- Recent projects list

### 2. **Scene View** (Center Panel)
- Visual game preview
- Object selection
- Grid overlay
- Play mode testing

### 3. **Hierarchy** (Left Panel)
- Tree view of objects
- Add Rectangle/Circle objects
- Delete objects
- Object naming

### 4. **Inspector** (Right Panel)
- Edit transform properties
- Component property editing
- Real-time updates
- Tag management

### 5. **Toolbar** (Top)
- Play/Pause/Stop controls
- Save project
- Export code
- Back to projects

## 🛠️ Usage Workflow

1) Launch editor: `npm run electron:dev`  
2) Create project: choose name and folder  
3) Add objects in scene; edit properties in Inspector  
4) Save scene (Ctrl+S) → generates `scenes/Main.ts`  
5) Full build (first time) → then Soft build for fast iterations

### Example Generated Code

```typescript
import type { GameContext } from '../engine';
import { pos, rect, anchor, area } from '../engine';

export function MainScene(ctx: GameContext): void {
  const player = ctx.add([
    pos(200, 300),
    rect(50, 50, '#6495ed'),
    anchor('topleft'),
    area(),
    'player',
  ]);
}
```

## 🔧 Development

### Editor

```bash
npm run electron:dev
npm run build
npm run package
```

### Game project

```bash
cd YourGameProject/
# Full build (first time)
npx expo run:android
# Soft build (subsequent)
npx expo start --dev-client --clear
```

## 📦 What's Included

### Components
- ✅ Visual scene editor
- ✅ Hierarchy panel
- ✅ Inspector panel
- ✅ Toolbar with controls
- ✅ Project manager
- ✅ Play mode testing
- ✅ Code exporter

### Features
- ✅ Create/manage projects
- ✅ Add rectangles and circles
- ✅ Edit properties live
- ✅ Test games instantly
- ✅ Export to code
- ✅ Gamepad integration
- ✅ Collision detection
- ✅ Physics system

## 🎯 Next Steps

### Enhancements You Can Add:

1. **Drag & Drop** - Move objects in scene view
2. **Undo/Redo** - Command pattern
3. **Multi-Select** - Edit multiple objects
4. **Asset Manager** - Import images
5. **Animation Timeline** - Keyframe animation
6. **Custom Components** - Create your own
7. **Scene Saving** - Save to files
8. **Templates** - Pre-built game templates

## 💡 Tips

### Performance
- Editor uses the same engine as runtime
- No performance loss when exporting
- Shared Values for zero re-renders

### Workflow
1. Design in editor
2. Export code
3. Add game logic manually
4. Test on mobile

### Best Practices
- Name objects clearly
- Use tags for organization
- Test frequently in Play mode
- Export often to backup

## 🐛 Troubleshooting

### Editor won't launch
- Check Node.js version (18+)
- Delete `node_modules` and reinstall

### Changes not showing on device
- Ensure Soft build is running (Metro)
- Press `r` in the Metro terminal or on device to reload

## 📚 Resources

- `expo-template/engine/README.md` (engine docs)
- `expo-template/engine/COLLISION_GUIDE.md` (collision system)

## 🎓 Learning Path

1. ✅ Basic engine concepts
2. ✅ Component system
3. ✅ Collision detection
4. ✅ Input handling (gamepad)
5. ✅ **Visual editor** ← You are here!
6. ⬜ Advanced game patterns
7. ⬜ Publishing

---

**Congratulations!** 🎉 You now have a full visual game engine editor!

Build amazing games with ReGame Engine! 🚀





