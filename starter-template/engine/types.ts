/**
 * Core types for the game engine
 */

import type { SharedValue } from 'react-native-reanimated';

export interface Vec2 {
  x: number;
  y: number;
}

export interface AnimatedVec2 {
  x: SharedValue<number>;
  y: SharedValue<number>;
}

export interface Component {
  id: string;
  update?: (dt: number) => void;
  destroy?: () => void;
}

export interface TransformComponent extends Component {
  id: 'transform';
  pos: AnimatedVec2;
  scale: Vec2;
  rotation: number;
  visible: SharedValue<number>; // 1 = visible, 0 = hidden
}

export interface BodyComponent extends Component {
  id: 'body';
  velocity: Vec2;
  acceleration: Vec2;
  mass: number;
  isStatic?: boolean; // Static objects don't move
}

export interface RectComponent extends Component {
  id: 'rect';
  width: number;
  height: number;
  color: string;
}

export interface CircleComponent extends Component {
  id: 'circle';
  radius: number;
  color: string;
}

export type CollisionShape = 'rect' | 'circle';

export interface AreaComponent extends Component {
  id: 'area';
  shape: CollisionShape;
  width?: number;
  height?: number;
  radius?: number;
  offset?: Vec2;
  scale?: number;
}

export type CollisionCallback = (other: any) => void;

export interface CollisionEvent {
  other: any;
  isColliding: boolean;
}

export interface GameObject {
  id: string;
  tags: string[];
  components: Map<string, Component>;
  
  // Component getters
  get<T extends Component>(id: string): T | undefined;
  has(id: string): boolean;
  
  // Tag methods
  hasTag(tag: string): boolean;
  
  // Collision event handlers
  onCollide(tag: string, callback: CollisionCallback): void;
  onCollideUpdate(tag: string, callback: CollisionCallback): void;
  onCollideEnd(tag: string, callback: CollisionCallback): void;
  
  // Update
  update(dt: number): void;
  destroy(): void;
}

export type ComponentFactory = (...args: any[]) => Component;

export interface GameContext {
  add(components: (Component | string)[]): GameObject;
  destroy(obj: any): void; // Accept any GameObject implementation
  get(tag: string): GameObject[];
  update(dt: number): void;
  readonly objects: GameObject[];
}

