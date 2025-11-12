# 🎮 ReGame Engine - Usage Guide

## Creating a New Project

You have **three ways** to create a new ReGame Engine project:

### 1. Web Editor (Recommended)

The easiest way with a visual interface:

```bash
cd editor/editor-web
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser and click **"📁 Create Project"**

**Features:**
- ✅ Choose directory on your system
- ✅ Creates all project files
- ✅ Visual scene editor included
- ✅ Export code functionality

**Requirements:** Chrome, Edge, or Chromium-based browser

---

### 2. Command Line Tool

Quick project creation from terminal:

```bash
# From the regame-engine directory
npm run create-project MyGameName
```

Or after publishing:

```bash
npx create-regame MyGameName
```

This will:
1. Create an Expo project
2. Install all dependencies
3. Copy the engine files
4. Create a working example game

---

### 3. Manual Setup

For more control:

```bash
# 1. Create Expo project
npx create-expo-app my-game
cd my-game

# 2. Install dependencies
npm install react-native-reanimated react-native-gesture-handler @shopify/react-native-skia

# 3. Copy engine folder
# Copy the 'engine' folder from regame-engine to your project

# 4. Update babel.config.js
# Add 'react-native-reanimated/plugin' to plugins array

# 5. Start developing!
npm start
```

---

## Project Structure

```
my-game/
├── App.js              # Your game code
├── engine/             # ReGame Engine
│   ├── index.tsx
│   ├── types.ts
│   ├── components/
│   ├── core/
│   └── systems/
├── assets/             # Images, sounds, etc.
├── package.json
└── app.json
```

---

## Running Your Game

```bash
# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web
```

---

## Next Steps

1. **Learn the basics**: Check out `README.md`
2. **Explore examples**: Look at `App.js` template
3. **Use the editor**: Design levels visually
4. **Read docs**: Full API reference in `README.md`

---

## Need Help?

- 📖 **Documentation**: See `README.md`
- 💬 **Issues**: GitHub Issues
- 🎮 **Examples**: Check `app/index.tsx` in the repo

Happy game making! 🚀





