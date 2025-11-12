# 🎨 ReGame Engine Editor Guide

## What is the Editor?

The ReGame Engine Editor is a web-based tool that helps you create React Native game projects. It can:

1. **Create Real Projects** - Generate full React Native/Expo projects on your file system
2. **Visual Scene Design** - Design game levels with a drag-and-drop interface
3. **Export Code** - Generate game code from your visual designs

---

## Starting the Editor

```bash
cd editor/editor-web
npm install
npm run dev
```

Open **http://localhost:5173** in **Chrome** or **Edge**

---

## Creating a New Project

### Method 1: Full Project Creation

1. Enter your project name (e.g., "MyAwesomeGame")
2. Click **"📁 Create Project"**
3. Choose a directory on your computer
4. The editor will create all project files:
   - ✅ `package.json` with all dependencies
   - ✅ `App.js` with example game code
   - ✅ `app.json` for Expo configuration
   - ✅ `babel.config.js` with Reanimated plugin
   - ✅ `.gitignore` and `README.md`
   - ✅ `engine/` folder placeholder

5. **Important:** Copy the `engine` folder from `regame-engine` to your new project
6. Run `npm install` and `npm start`

### Method 2: Scene Editor Only

1. Click **"🎨 Open Scene Editor"**
2. Design your game scene visually
3. Click **"▶️ Export Code"** to copy the generated code
4. Paste into your existing project

---

## Browser Compatibility

**Required:** Chrome, Edge, or Chromium-based browsers

The editor uses the File System Access API, which is only supported in:
- ✅ Google Chrome 86+
- ✅ Microsoft Edge 86+
- ✅ Opera 72+
- ❌ Firefox (not supported yet)
- ❌ Safari (not supported yet)

---

## Scene Editor Features

### Hierarchy Panel (Left)
- **+ Rect**: Add rectangle objects
- **+ Circle**: Add circle objects
- Click objects to select them
- 🗑️ icon to delete objects

### Scene View (Center)
- Visual preview of your game
- Click objects to select them
- See real-time updates

### Inspector Panel (Right)
- Edit object properties
- Change position, scale, rotation
- Modify colors and sizes

### Toolbar (Top)
- ▶ **Play**: Test your scene
- ⏸ **Pause**: Pause testing
- ⏹ **Stop**: Stop testing
- ▶️ **Export Code**: Copy generated code

---

## Workflow

### Creating a Complete Game:

1. **Create Project** via editor
2. **Copy engine folder** to your project
3. **Install dependencies**: `npm install`
4. **Open in editor** to design scenes
5. **Export code** and paste into `App.js`
6. **Run**: `npm start`
7. **Test** on your device with Expo Go

### Quick Prototyping:

1. **Open Scene Editor**
2. **Add objects** and design
3. **Export code**
4. **Paste** into existing project
5. **Done!**

---

## Example Generated Code

```tsx
import { Game, pos, rect, circle } from './engine';

export default function App() {
  return (
    <Game showGamePad>
      {(ctx) => {
        const rectangle1 = ctx.add([
          pos(200, 200),
          rect(50, 50, '#6495ed')
        ]);

        const circle1 = ctx.add([
          pos(250, 250),
          circle(25, '#ff6464')
        ]);

        // Add your game logic here
      }}
    </Game>
  );
}
```

---

## Tips

💡 **Start Simple**: Begin with the scene editor to learn the basics

💡 **Copy Engine First**: Always copy the `engine` folder before running your project

💡 **Use Chrome**: For best compatibility and File System Access support

💡 **Export Often**: Save your work by exporting code frequently

💡 **Test on Device**: Use Expo Go app to test on real devices

---

## Troubleshooting

**"Browser not supported"**
- Use Chrome, Edge, or another Chromium-based browser

**"Cannot find module './engine'"**
- Copy the `engine` folder to your project directory

**"npm install" fails**
- Make sure you have Node.js 16+ installed
- Try deleting `node_modules` and running again

**"Expo Go won't connect"**
- Make sure your phone and computer are on the same WiFi
- Check firewall settings

---

## Next Steps

- Read `USAGE.md` for more ways to create projects
- Check `README.md` for full API documentation
- Explore `app/index.tsx` for complete examples

Happy creating! 🎮✨





