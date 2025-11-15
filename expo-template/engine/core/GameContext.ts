import { CollisionSystem } from '../systems/CollisionSystem';
import type { Component, GameContext as IGameContext, TransformComponent } from '../types';
import { GameObject } from './GameObject';
import type { GameKey, InputSystem } from './InputSystem';

export class GameContext implements IGameContext {
  private _objects: GameObject[] = [];
  private _toDestroy: GameObject[] = [];
  private _collisionSystem = new CollisionSystem();
  private _inputSystem?: InputSystem;
  private _scenes = new Map<string, (ctx: GameContext) => void>();
  private _currentScene: string | null = null;
  private _globalEventHandlers = new Map<
    string,
    Array<{ tag?: string; handler: (obj: GameObject, ...args: any[]) => void }>
  >();
  private _viewport = { width: 360, height: 640 };

  get objects(): GameObject[] {
    return this._objects;
  }

  /**
   * Set the input system (called by Game component)
   */
  setInputSystem(inputSystem: InputSystem): void {
    this._inputSystem = inputSystem;
  }

  setViewport(width: number, height: number): void {
    this._viewport = { width, height };
  }

  getViewport(): { width: number; height: number } {
    return this._viewport;
  }

  /**
   * Register a callback for when a key is first pressed
   */
  onKeyDown(key: GameKey, callback: () => void): void {
    if (!this._inputSystem) {
      console.warn('InputSystem not initialized. Make sure Game component is mounted.');
      return;
    }
    this._inputSystem.onKeyDown(key, callback);
  }

  /**
   * Register a callback for every frame while a key is held down
   */
  onKeyPress(key: GameKey, callback: () => void): void {
    if (!this._inputSystem) {
      console.warn('InputSystem not initialized. Make sure Game component is mounted.');
      return;
    }
    this._inputSystem.onKeyPress(key, callback);
  }

  /**
   * Register a callback for when a key is released
   */
  onKeyRelease(key: GameKey, callback: () => void): void {
    if (!this._inputSystem) {
      console.warn('InputSystem not initialized. Make sure Game component is mounted.');
      return;
    }
    this._inputSystem.onKeyRelease(key, callback);
  }

  /**
   * Check if a key is currently pressed
   */
  isKeyDown(key: GameKey): boolean {
    return this._inputSystem?.isKeyDown(key) ?? false;
  }

  /**
   * Add a game object to the scene
   * Usage: add([pos(100, 100), body(), rect(50, 50, 'red'), "player"])
   */
  add(components: (Component | string)[], parent?: GameObject): GameObject {
    const obj = new GameObject(this);

    // Separate components and tags
    const comps: Component[] = [];
    const tags: string[] = [];

    for (const item of components) {
      if (typeof item === 'string') {
        tags.push(item);
      } else {
        comps.push(item);
      }
    }

    // Merge transform components
    const transforms = comps.filter(c => c.id === 'transform') as TransformComponent[];
    if (transforms.length > 0) {
      const { makeMutable } = require('react-native-reanimated');
      const merged: TransformComponent = {
        id: 'transform',
        pos: { x: makeMutable(0), y: makeMutable(0) },
        scale: { x: 1, y: 1 },
        rotation: 0,
        visible: makeMutable(1),
      };

      for (const t of transforms) {
        if (t.pos) {
          merged.pos.x.value = t.pos.x.value;
          merged.pos.y.value = t.pos.y.value;
        }
        if (t.scale) merged.scale = { ...t.scale };
        if (t.rotation !== undefined) merged.rotation = t.rotation;
        if (t.visible) merged.visible = t.visible;
        if (t.anchor !== undefined) merged.anchor = t.anchor;
      }

      obj.add(merged);
    }

    // Add other components
    for (const comp of comps) {
      if (comp.id !== 'transform') {
        obj.add(comp);
      }
    }

    // Add tags
    for (const tag of tags) {
      obj.addTag(tag);
    }

    obj.setParent(parent ?? null);

    this._objects.push(obj);
    obj.trigger('add');
    return obj;
  }

  /**
   * Destroy a game object
   */
  destroy(obj: IGameContext['objects'][number]): void {
    this.queueDestroy(obj as GameObject);
  }

  /**
   * Get all objects with a specific tag
   */
  get(tag: string): GameObject[] {
    return this._objects.filter(obj => obj.hasTag(tag));
  }

  /**
   * Update all game objects
   */
  update(dt: number): void {
    // Update input system
    this._inputSystem?.update();

    // Update all objects
    for (const obj of this._objects) {
      obj.update(dt);

      // Apply velocity to position (using shared values)
      const transform = obj.get<TransformComponent>('transform');
      const body = obj.get<any>('body');
      
      if (transform && body) {
        transform.pos.x.value += body.velocity.x * dt;
        transform.pos.y.value += body.velocity.y * dt;
      }
    }

    // Check collisions
    this._collisionSystem.update(this._objects);

    // Destroy marked objects
    if (this._toDestroy.length > 0) {
      const toDestroy = this._toDestroy;
      this._toDestroy = [];
      for (const obj of toDestroy) {
        obj.destroy();
        const idx = this._objects.indexOf(obj);
        if (idx !== -1) {
          this._objects.splice(idx, 1);
        }
      }
    }
  }

  /**
   * Clear all objects
   */
  clear(): void {
    for (const obj of this._objects) {
      this.queueDestroy(obj);
    }
    const toDestroy = this._toDestroy;
    this._toDestroy = [];
    for (const obj of toDestroy) {
      obj.destroy();
    }
    this._objects = [];
    this._collisionSystem.reset();
    this._inputSystem?.clear();
  }

  on(event: string, handler: (obj: GameObject, ...args: any[]) => void): () => void;
  on(event: string, tag: string, handler: (obj: GameObject, ...args: any[]) => void): () => void;
  on(
    event: string,
    tagOrHandler: string | ((obj: GameObject, ...args: any[]) => void),
    maybeHandler?: (obj: GameObject, ...args: any[]) => void,
  ): () => void {
    const tag = typeof tagOrHandler === 'string' ? tagOrHandler : undefined;
    const handler = typeof tagOrHandler === 'function' ? tagOrHandler : maybeHandler;
    if (!handler) {
      console.warn(`ctx.on("${event}") called without a handler.`);
      return () => {};
    }

    const listeners = this._globalEventHandlers.get(event) ?? [];
    const entry = { tag, handler };
    listeners.push(entry);
    this._globalEventHandlers.set(event, listeners);

    return () => {
      const existing = this._globalEventHandlers.get(event);
      if (!existing) return;
      const idx = existing.indexOf(entry);
      if (idx !== -1) {
        existing.splice(idx, 1);
      }
      if (existing.length === 0) {
        this._globalEventHandlers.delete(event);
      }
    };
  }

  off(event: string, handler?: (obj: GameObject, ...args: any[]) => void): void {
    const listeners = this._globalEventHandlers.get(event);
    if (!listeners) return;

    if (!handler) {
      this._globalEventHandlers.delete(event);
      return;
    }

    const filtered = listeners.filter(listener => listener.handler !== handler);
    if (filtered.length === 0) {
      this._globalEventHandlers.delete(event);
    } else {
      this._globalEventHandlers.set(event, filtered);
    }
  }

  emit(event: string, source: GameObject, ...args: any[]): void {
    const listeners = this._globalEventHandlers.get(event);
    if (!listeners) return;

    for (const { tag, handler } of listeners) {
      if (!tag || tag === '*' || source.hasTag(tag)) {
        handler(source, ...args);
      }
    }
  }

  /**
   * Register a scene (Kaplay-style)
   * Usage: ctx.scene('game', (ctx) => { ... })
   */
  scene(name: string, sceneFunc: (ctx: GameContext) => void): void {
    this._scenes.set(name, sceneFunc);
  }

  /**
   * Switch to a scene
   * Usage: ctx.go('mainMenu')
   */
  go(sceneName: string): void {
    // Clear current scene
    this.clear();
    
    // Load new scene
    const sceneFunc = this._scenes.get(sceneName);
    if (sceneFunc) {
      this._currentScene = sceneName;
      sceneFunc(this);
    } else {
      console.error(`Scene "${sceneName}" not found! Available scenes: ${Array.from(this._scenes.keys()).join(', ')}`);
    }
  }

  /**
   * Get current scene name
   */
  getCurrentScene(): string | null {
    return this._currentScene;
  }

  private queueDestroy(obj: GameObject): void {
    if (this._toDestroy.includes(obj)) {
      return;
    }

    const transform = obj.get<TransformComponent>('transform');
    if (transform?.visible) {
      transform.visible.value = 0;
    }

    this._toDestroy.push(obj);

    for (const child of obj.children) {
      this.queueDestroy(child);
    }
  }
}

