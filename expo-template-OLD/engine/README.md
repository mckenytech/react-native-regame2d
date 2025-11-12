# ReGame Engine

A Kaboom/Kaplay-style game engine for React Native using Skia and Reanimated.

## Features

- 🎮 **Kaplay-style API** - Familiar `add()` syntax with components and tags
- ⚡ **High Performance** - Uses Reanimated's `useFrameCallback` for 60fps updates
- 🎨 **Skia Rendering** - Hardware-accelerated 2D graphics with React Native Skia
- 🔄 **No Re-render Issues** - Physics and updates run without triggering React re-renders
- 🧩 **Modular Components** - Easy to extend with custom components

## Quick Start

```tsx
import { Game, pos, body, rect, circle, color } from "../engine";

export default function MyGame() {
  return (
    <Game>
      {(ctx) => {
        // Add a player
        const player = ctx.add([
          pos(100, 100),
          body({ velocity: { x: 50, y: 0 } }),
          rect(50, 50, color(100, 150, 255)),
          "player"
        ]);

        // Add an enemy
        ctx.add([
          pos(200, 100),
          body({ velocity: { x: -30, y: 50 } }),
          circle(25, color(255, 100, 100)),
          "enemy"
        ]);
      }}
    </Game>
  );
}
```

## Core Components

### Transform Components

- `pos(x, y)` - Set position
- `scale(x, y?)` - Set scale (uniform if y is omitted)
- `rotate(angle)` - Set rotation in radians

### Physics Components

- `body({ velocity?, acceleration?, mass? })` - Add physics simulation

### Render Components

- `rect(width, height, color?)` - Render a rectangle
- `circle(radius, color?)` - Render a circle
- `color(r, g, b, a?)` - Create a color (0-255 range)
- `rgb(r, g, b)` - Create an RGB color

### Tags

Add string tags to game objects for querying:

```tsx
ctx.add([pos(0, 0), rect(50, 50), "player", "solid"]);

// Later, get all objects with "player" tag
const players = ctx.get("player");
```

## Game Context API

The `ctx` parameter in the `Game` component provides these methods:

- `add(components[])` - Add a game object with components and tags
- `destroy(obj)` - Remove a game object
- `get(tag)` - Get all objects with a specific tag
- `objects` - Array of all game objects

## Architecture

### Core Systems

- **GameObject** - Container for components with tag support
- **GameContext** - Manages all game objects and provides the `add()` API
- **GameLoop** - 60fps update loop using Reanimated's `useFrameCallback`
- **RenderSystem** - Skia-based renderer for all visual components

### Component System

Components are plain objects with an `id` field:

```tsx
interface Component {
  id: string;
  update?: (dt: number) => void;
  destroy?: () => void;
}
```

Custom components can implement `update()` for per-frame logic and `destroy()` for cleanup.

## Extending the Engine

### Create Custom Components

```tsx
export function health(amount: number): CustomComponent {
  return {
    id: 'health',
    current: amount,
    max: amount,
    damage(n: number) {
      this.current = Math.max(0, this.current - n);
    }
  };
}
```

### Add Custom Rendering

Extend `RenderSystem.tsx` to add new render component types (sprites, text, etc.).

### Add Custom Systems

Create new systems in the `systems/` folder for collision detection, AI, audio, etc.

## Performance

- ✅ Game loop runs on UI thread via Reanimated
- ✅ No React re-renders during gameplay (except for frame updates)
- ✅ Skia rendering is hardware-accelerated
- ✅ Component updates are optimized

## Roadmap

- [ ] Collision detection system
- [ ] Sprite/texture support
- [ ] Text rendering
- [ ] Audio system
- [ ] Input handling (touch, gestures)
- [ ] Particle effects
- [ ] Camera system
- [ ] Scene management
- [ ] Save/load system

## Credits

Inspired by [Kaplay](https://kaplayjs.com/) (formerly Kaboom.js)

