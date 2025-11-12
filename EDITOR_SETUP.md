# 🎮 ReGame Engine Editor - Setup Guide

Complete guide to setting up the visual game editor for ReGame Engine.

## 📁 Project Structure

```
regame-engine/
├── engine/              ← Your game runtime engine
│   ├── components/
│   ├── core/
│   ├── systems/
│   └── index.tsx
├── app/                 ← Mobile game app
│   └── index.tsx
└── editor/             ← NEW! Visual editor (Windows)
    ├── src/
    │   ├── components/
    │   │   ├── EditorLayout.tsx
    │   │   ├── SceneView.tsx
    │   │   ├── Hierarchy.tsx
    │   │   ├── Inspector.tsx
    │   │   ├── Toolbar.tsx
    │   │   └── ProjectManager.tsx
    │   ├── utils/
    │   │   └── codeExporter.ts
    │   └── types.ts
    ├── App.tsx
    ├── package.json
    └── README.md
```

## 🚀 Quick Start

### 1. Install React Native Windows

```bash
cd editor
npm install
```

### 2. Initialize Windows Platform

```bash
npx react-native-windows-init --overwrite
```

This will create the `windows/` directory with Visual Studio project files.

### 3. Open in Visual Studio (Optional)

```bash
# Open the solution file
start windows/regame-editor.sln
```

### 4. Run the Editor

```bash
npm run windows
```

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

### Creating Your First Game

1. **Launch Editor**
   ```bash
   cd editor
   npm run windows
   ```

2. **Create Project**
   - Click "New Project" or "Quick Start"
   - Name your game

3. **Add Objects**
   - Click "+ Rect" or "+ Circle" in Hierarchy
   - Select object to edit properties

4. **Configure Properties**
   - Use Inspector to set:
     - Position (X, Y)
     - Scale
     - Color
     - Physics (add body component)
     - Collision (add area component)

5. **Test Game**
   - Click "▶ Play"
   - Use gamepad (already integrated!)
   - Click "⏹ Stop" to edit

6. **Export Code**
   - Click "▶️ Export"
   - Copy generated code
   - Paste into `app/index.tsx`

### Example Generated Code

```typescript
import { Game, pos, rect, circle, color, body, area } from "../engine";

export default function MyGame() {
  return (
    <Game showGamePad>
      {(ctx) => {
        const player = ctx.add([
          pos(200, 300),
          rect(50, 50, color(100, 150, 255)),
          area(),
          "player"
        ]);

        const enemy = ctx.add([
          pos(200, 100),
          circle(25, color(255, 100, 100)),
          body({ velocity: { x: 50, y: 50 } }),
          area(),
          "enemy"
        ]);

        player.onCollide("enemy", (enemy) => {
          ctx.destroy(enemy);
        });
      }}
    </Game>
  );
}
```

## 🔧 Development

### Running in Development Mode

```bash
# Start Metro bundler
npm start

# In another terminal, run Windows app
npm run windows
```

### Building for Production

```bash
npm run build
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

### "Module not found: ../engine"
- Ensure engine directory exists
- Check relative paths in imports

### "React Native Windows not found"
- Run `npx react-native-windows-init`
- Install Visual Studio 2022

### Editor won't launch
- Check Node.js version (16+)
- Delete `node_modules` and reinstall
- Clear Metro cache: `npx react-native start --reset-cache`

## 📚 Resources

- [React Native Windows Docs](https://microsoft.github.io/react-native-windows/)
- [ReGame Engine Docs](../engine/README.md)
- [Collision Guide](../engine/COLLISION_GUIDE.md)

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





