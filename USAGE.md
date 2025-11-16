# 🎮 ReGame Engine - Usage Guide

## Create a New Project (Editor)

```bash
npm install
npm run electron:dev
```

In the editor:
1) Click “Create New Project”  
2) Choose name and folder (copies `expo-template/`)  
3) Add objects to the scene (Rect/Circle/Sprite/etc.)  
4) Save (Ctrl+S) → generates `scenes/Main.ts`

## Build Workflow (Device/Emulator)

- Full build (first time): builds native dev client and runs the app  
  `npx expo run:android` (or `:ios`)

- Soft build (next times): starts Metro for the already-installed dev client  
  `npx expo start --dev-client --clear`

Reload:
- After saving in the editor, press `r` in the Metro terminal or on the device to reload
- You can run the Soft build command yourself in a terminal in the project folder

## Project Structure (Generated)

```
MyGame/
├── App.js
├── engine/
│   ├── index.tsx
│   ├── types.ts
│   ├── components/
│   ├── core/
│   └── systems/
├── scenes/
│   └── Main.ts
├── package.json
└── app.json
```

## Run Commands (inside project)

```bash
# First time (Full build)
npx expo run:android

# Subsequent runs (Soft build)
npx expo start --dev-client --clear

# Web preview (optional)
npx expo start --web
```

## Next Steps

1. Use the editor to add components and scripts
2. Read engine docs: `expo-template/engine/README.md`
3. Check collision guide: `expo-template/engine/COLLISION_GUIDE.md`

Happy game making! 🚀





