export const scriptTypeDefinitions = `// Auto-injected ReGame editor types for Monaco
declare namespace ReGame {
  interface SharedValue<T = number> {
    value: T;
  }

  interface Vec2 {
    x: number;
    y: number;
  }

  interface AnimatedVec2 {
    x: SharedValue<number>;
    y: SharedValue<number>;
  }

  interface Component {
    id: string;
    update?: (dt: number) => void;
    destroy?: () => void;
    [key: string]: unknown;
  }

  interface TransformComponent extends Component {
    id: 'transform';
    pos: AnimatedVec2;
    scale: Vec2;
    rotation: number;
    visible: SharedValue<number>;
  }

  interface BodyComponent extends Component {
    id: 'body';
    velocity: Vec2;
    acceleration: Vec2;
    mass: number;
    isStatic?: boolean;
  }

  interface RectComponent extends Component {
    id: 'rect';
    width: number;
    height: number;
    color: string;
  }

  interface CircleComponent extends Component {
    id: 'circle';
    radius: number;
    color: string;
  }

  interface SpriteComponent extends Component {
    id: 'sprite';
    source: number | string;
    width: number;
    height: number;
    origin?: Vec2;
    dataUri?: string;
  }

  type CollisionShape = 'rect' | 'circle';

  interface AreaComponent extends Component {
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

  interface ComponentMap {
    transform: TransformComponent;
    body: BodyComponent;
    rect: RectComponent;
    circle: CircleComponent;
    sprite: SpriteComponent;
    area: AreaComponent;
    [key: string]: Component;
  }

  type GameKey =
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

  interface GameObject {
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
    onCollide(tag: string, callback: (other: GameObject) => void): void;
    onCollideUpdate(tag: string, callback: (other: GameObject) => void): void;
    onCollideEnd(tag: string, callback: (other: GameObject) => void): void;
    update(dt: number): void;
    destroy(): void;
  }

  interface GameContext {
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
}

declare const ctx: ReGame.GameContext;

declare function pos(x: number, y: number): ReGame.TransformComponent;
declare function scale(x: number, y?: number): ReGame.TransformComponent;
declare function rotate(angle: number): ReGame.TransformComponent;
declare function body(options?: {
  velocity?: ReGame.Vec2;
  acceleration?: ReGame.Vec2;
  mass?: number;
  isStatic?: boolean;
}): ReGame.BodyComponent;
declare function rect(
  width: number,
  height: number,
  color?: string,
): ReGame.RectComponent;
declare function circle(radius: number, color?: string): ReGame.CircleComponent;
declare function sprite(
  source: number | string,
  width: number,
  height: number,
  options?: {
    origin?: ReGame.Vec2;
    dataUri?: string;
  },
): ReGame.SpriteComponent;
declare function area(options?: {
  shape?: 'rect' | 'circle' | 'auto';
  width?: number;
  height?: number;
  radius?: number;
  offset?: ReGame.Vec2;
  scale?: number | ReGame.Vec2;
  cursor?: string | null;
  collisionIgnore?: string[];
  restitution?: number;
  friction?: number;
}): ReGame.AreaComponent;
declare function color(
  r: number,
  g: number,
  b: number,
  a?: number,
): string;
declare function rgb(r: number, g: number, b: number): string;

declare type GameScriptThis = ReGame.GameObject;
`;

export default scriptTypeDefinitions;

