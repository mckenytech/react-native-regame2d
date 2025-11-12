# {{PROJECT_NAME}}

A game built with ReGame Engine

## Project Structure

```
{{PROJECT_NAME}}/
├── App.js          # Main entry point
├── scenes/         # Game scenes
│   └── Main.js     # Main scene
├── scripts/        # Helper scripts
│   └── helpers.js  # Utility functions
├── assets/         # Images, sounds, etc.
└── engine/         # ReGame Engine
```

## Setup

```bash
npm install
npm start
```

## Run

- **Android**: `npm run android`
- **iOS**: `npm run ios`
- **Web**: `npm run web`

## Creating Scenes

Create a new file in `scenes/` folder:

```javascript
// scenes/Game.js
import { pos, rect } from '../engine';

export function GameScene(ctx) {
  // Your scene logic here
  const player = ctx.add([
    pos(100, 100),
    rect(50, 50, '#6495ed')
  ]);
  
  // Switch scenes
  ctx.go('anotherScene');
}
```

Then register it in `App.js`:

```javascript
import { GameScene } from './scenes/Game';

const scenes = {
  main: MainScene,
  game: GameScene,  // Add your scene
};
```

## Controls

- **D-Pad**: Move player
- **A/B Buttons**: Actions

Happy gaming! 🎮

