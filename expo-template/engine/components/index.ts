import { makeMutable } from 'react-native-reanimated';
import type {
  AreaComponent,
  BodyComponent,
  CircleComponent,
  RectComponent,
  TransformComponent,
  Vec2,
} from '../types';

/**
 * Position component - sets the position of a game object
 */
export function pos(x: number, y: number): TransformComponent {
  return {
    id: 'transform',
    pos: { 
      x: makeMutable(x), 
      y: makeMutable(y) 
    },
    scale: { x: 1, y: 1 },
    rotation: 0,
    visible: makeMutable(1), // 1 = visible, 0 = hidden
  };
}

/**
 * Scale component - sets the scale of a game object
 */
export function scale(x: number, y?: number): Partial<TransformComponent> {
  return {
    id: 'transform',
    scale: { x, y: y ?? x },
  } as TransformComponent;
}

/**
 * Rotate component - sets the rotation of a game object
 */
export function rotate(angle: number): Partial<TransformComponent> {
  return {
    id: 'transform',
    rotation: angle,
  } as TransformComponent;
}

/**
 * Body component - adds physics simulation
 */
export function body(options: {
  velocity?: Vec2;
  acceleration?: Vec2;
  mass?: number;
  isStatic?: boolean;
} = {}): BodyComponent {
  return {
    id: 'body',
    velocity: options.velocity ?? { x: 0, y: 0 },
    acceleration: options.acceleration ?? { x: 0, y: 0 },
    mass: options.mass ?? 1,
    isStatic: options.isStatic ?? false,
    update: function(dt: number) {
      // Static objects don't move
      if (this.isStatic) return;
      
      // Simple Euler integration
      this.velocity.x += this.acceleration.x * dt;
      this.velocity.y += this.acceleration.y * dt;
    },
  };
}

/**
 * Rectangle render component
 */
export function rect(width: number, height: number, color = '#000000'): RectComponent {
  return {
    id: 'rect',
    width,
    height,
    color,
  };
}

/**
 * Circle render component
 */
export function circle(radius: number, color = '#000000'): CircleComponent {
  return {
    id: 'circle',
    radius,
    color,
  };
}

/**
 * Area component - adds collision detection
 * Auto-detects shape from rect/circle components if not specified
 */
export function area(options: {
  shape?: 'rect' | 'circle' | 'auto';
  width?: number;
  height?: number;
  radius?: number;
  offset?: Vec2;
  scale?: number | Vec2;
  cursor?: string | null;
  collisionIgnore?: string[];
  restitution?: number;
  friction?: number;
} = {}): AreaComponent {
  const normalizedScale: Vec2 =
    typeof options.scale === 'number'
      ? { x: options.scale, y: options.scale }
      : options.scale ?? { x: 1, y: 1 };
  const normalizedShape =
    typeof options.shape === 'string' && options.shape.toLowerCase() === 'auto'
      ? null
      : options.shape ?? null;
  const normalizedOffset: Vec2 = options.offset ?? { x: 0, y: 0 };

  return {
    id: 'area',
    shape: normalizedShape,
    width: options.width,
    height: options.height,
    radius: options.radius,
    offset: normalizedOffset,
    scale: normalizedScale,
    cursor: options.cursor ?? null,
    collisionIgnore: options.collisionIgnore ?? [],
    restitution: options.restitution,
    friction: options.friction,
  };
}

/**
 * Color helper - returns a color string
 */
export function color(r: number, g: number, b: number, a = 1): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function rgb(r: number, g: number, b: number): string {
  return color(r, g, b, 1);
}

