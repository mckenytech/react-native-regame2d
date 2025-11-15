/**
 * Core types for the ReGame runtime.
 *
 * These are consumed both by the engine code and by the editor to provide
 * authoring-time hints for Kaplay-style scripts.
 */

export interface SharedValue<T = number> {
  value: T;
}

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
  visible: SharedValue<number>;
  anchor?: string; // Anchor point: "topleft" | "top" | "topright" | "left" | "center" | "right" | "botleft" | "bot" | "botright"
}

export interface BodyComponent extends Component {
  id: 'body';
  velocity: Vec2;
  acceleration: Vec2;
  mass: number;
  isStatic?: boolean;
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

export interface SpriteComponent extends Component {
  id: 'sprite';
  source: number | string;
  width: number;
  height: number;
  origin?: Vec2;
  dataUri?: string;
}

export type CollisionShape = 'rect' | 'circle';

export interface AreaComponent extends Component {
  id: 'area';
  shape?: CollisionShape | null;
  width?: number;
  height?: number;
  radius?: number;
  offset?: Vec2;
  scale?: Vec2;
  cursor?: string | null;
  collisionIgnore?: string[];
  restitution?: number;
  friction?: number;
}

export type KnownComponent =
  | TransformComponent
  | BodyComponent
  | RectComponent
  | CircleComponent
  | SpriteComponent
  | AreaComponent;

export type ComponentId = KnownComponent['id'] | (string & {});

export interface ComponentMap {
  transform: TransformComponent;
  body: BodyComponent;
  rect: RectComponent;
  circle: CircleComponent;
  sprite: SpriteComponent;
  area: AreaComponent;
  [key: string]: Component;
}

export type CollisionCallback = (other: GameObject) => void;

export interface GameObject {
  readonly id: string;
  readonly tags: string[];
  components: Map<string, Component>;
  parent: GameObject | null;
  children: GameObject[];

  get<T extends keyof ComponentMap>(id: T): ComponentMap[T] | undefined;
  get<T = Component>(id: string): T | undefined;
  has(id: string): boolean;
  add(component: Component): this;
  addChild(components: (Component | string)[]): GameObject;
  removeChild(child: GameObject): void;
  addTag(tag: string): this;
  hasTag(tag: string): boolean;
  on(event: string, handler: (this: GameObject, ...args: any[]) => void): void;
  off(event: string, handler?: (this: GameObject, ...args: any[]) => void): void;
  trigger(event: string, ...args: any[]): void;
  onCollide(tag: string, callback: CollisionCallback): void;
  onCollideUpdate(tag: string, callback: CollisionCallback): void;
  onCollideEnd(tag: string, callback: CollisionCallback): void;
  update(dt: number): void;
  destroy(): void;
}

export type ComponentFactory = (...args: any[]) => Component;

export type GameKey =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'space'
  | 'enter'
  | 'shift'
  | 'ctrl'
  | 'alt'
  | string;

export interface GameContext {
  add(components: (Component | string)[], parent?: GameObject): GameObject;
  destroy(obj: GameObject): void;
  get(tag: string): GameObject[];
  update(dt: number): void;
  readonly objects: GameObject[];
  on(event: string, handler: (obj: GameObject, ...args: any[]) => void): () => void;
  on(event: string, tag: string, handler: (obj: GameObject, ...args: any[]) => void): () => void;
  off(event: string, handler?: (obj: GameObject, ...args: any[]) => void): void;
  onKeyDown(key: GameKey, callback: () => void): void;
  onKeyPress(key: GameKey, callback: () => void): void;
  onKeyRelease(key: GameKey, callback: () => void): void;
  isKeyDown(key: GameKey): boolean;
  scene(name: string, fn: (ctx: GameContext) => void): void;
  go(sceneName: string): void;
  getCurrentScene(): string | null;
  setViewport(width: number, height: number): void;
  getViewport(): { width: number; height: number };
}


