# Collision Detection System

A Kaplay-inspired collision detection system for React Native game engine.

## Quick Start

```typescript
import { Game, pos, rect, circle, area, body, color } from "./engine";

<Game>
  {(ctx) => {
    // Create a player with collision
    const player = ctx.add([
      pos(100, 100),
      rect(50, 50, color(100, 150, 255)),
      area(), // Enable collision detection
      "player"
    ]);

    // Create an enemy
    ctx.add([
      pos(200, 100),
      circle(25, color(255, 100, 100)),
      area(),
      "enemy"
    ]);

    // Handle collisions
    player.onCollide("enemy", (enemy) => {
      console.log("Hit enemy!");
      ctx.destroy(enemy);
    });
  }}
</Game>
```

## Components

### `area()` - Enable Collision Detection

Add the `area()` component to any object to enable collision detection.

```typescript
// Auto-detect shape from rect/circle component
area()

// Custom collision box
area({ width: 100, height: 50 })

// Custom collision circle
area({ shape: 'circle', radius: 30 })

// With offset and scale
area({ 
  offset: { x: 10, y: 5 },
  scale: 0.8 
})
```

**Options:**
- `shape?: 'rect' | 'circle'` - Collision shape (auto-detected if not specified)
- `width?: number` - Rectangle width (uses rect component width if not specified)
- `height?: number` - Rectangle height (uses rect component height if not specified)
- `radius?: number` - Circle radius (uses circle component radius if not specified)
- `offset?: { x: number, y: number }` - Offset from object position
- `scale?: number` - Scale factor for collision box (default: 1)

## Collision Events

### `onCollide(tag, callback)`

Triggers **once** when a collision **starts** with an object having the specified tag.

```typescript
player.onCollide("enemy", (enemy) => {
  console.log("Collision started!");
  ctx.destroy(enemy);
});
```

### `onCollideUpdate(tag, callback)`

Triggers **every frame** while colliding with an object having the specified tag.

```typescript
player.onCollideUpdate("lava", (lava) => {
  console.log("Taking damage!");
  // Reduce health each frame
});
```

### `onCollideEnd(tag, callback)`

Triggers **once** when a collision **ends** with an object having the specified tag.

```typescript
player.onCollideEnd("platform", (platform) => {
  console.log("Left the platform");
});
```

## Complete Example

```typescript
export default function Game() {
  return (
    <Game>
      {(ctx) => {
        // Player
        const player = ctx.add([
          pos(200, 300),
          rect(50, 50, color(100, 150, 255)),
          area(),
          "player"
        ]);

        // Spawn enemies
        for (let i = 0; i < 3; i++) {
          const x = 100 + Math.random() * 200;
          const y = 50 + Math.random() * 150;
          
          ctx.add([
            pos(x, y),
            circle(20, color(255, 100, 100)),
            body({ velocity: { 
              x: 30 * (Math.random() - 0.5), 
              y: 30 * (Math.random() - 0.5) 
            }}),
            area(),
            "enemy"
          ]);
        }

        // Platform
        ctx.add([
          pos(200, 500),
          rect(200, 20, color(100, 200, 100)),
          area(),
          "platform"
        ]);

        // Collision handlers
        player.onCollide("enemy", (enemy) => {
          console.log("💥 Player hit enemy!");
          ctx.destroy(enemy);
        });

        player.onCollideUpdate("platform", () => {
          console.log("🟢 On platform");
        });

        player.onCollideEnd("platform", () => {
          console.log("🔴 Left platform");
        });
      }}
    </Game>
  );
}
```

## Collision Detection Algorithm

The system supports:
- **Rectangle vs Rectangle** - AABB (Axis-Aligned Bounding Box)
- **Circle vs Circle** - Distance-based
- **Circle vs Rectangle** - Closest point algorithm

All collision shapes are automatically centered on the object's position.

## Performance Notes

- Collision detection runs every frame in O(n²) time for all objects with `area()` components
- For large numbers of objects, consider spatial partitioning (not yet implemented)
- Only objects with `area()` components are checked for collisions

