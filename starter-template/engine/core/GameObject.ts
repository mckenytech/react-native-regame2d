import type { Component, GameObject as IGameObject } from '../types';

let nextId = 0;

export class GameObject implements IGameObject {
  id: string;
  tags: string[];
  components: Map<string, Component>;
  
  // Collision event callbacks
  private _onCollideCallbacks = new Map<string, Function[]>();
  private _onCollideUpdateCallbacks = new Map<string, Function[]>();
  private _onCollideEndCallbacks = new Map<string, Function[]>();

  constructor() {
    this.id = `obj_${nextId++}`;
    this.tags = [];
    this.components = new Map();
  }

  get<T extends Component>(id: string): T | undefined {
    return this.components.get(id) as T | undefined;
  }

  has(id: string): boolean {
    return this.components.has(id);
  }

  add(component: Component): this {
    this.components.set(component.id, component);
    return this;
  }

  addTag(tag: string): this {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
    return this;
  }

  hasTag(tag: string): boolean {
    return this.tags.includes(tag);
  }

  /**
   * Register a callback for when collision starts with an object having the specified tag
   */
  onCollide(tag: string, callback: (other: IGameObject) => void): void {
    if (!this._onCollideCallbacks.has(tag)) {
      this._onCollideCallbacks.set(tag, []);
    }
    this._onCollideCallbacks.get(tag)!.push(callback);
  }

  /**
   * Register a callback for every frame while colliding with an object having the specified tag
   */
  onCollideUpdate(tag: string, callback: (other: IGameObject) => void): void {
    if (!this._onCollideUpdateCallbacks.has(tag)) {
      this._onCollideUpdateCallbacks.set(tag, []);
    }
    this._onCollideUpdateCallbacks.get(tag)!.push(callback);
  }

  /**
   * Register a callback for when collision ends with an object having the specified tag
   */
  onCollideEnd(tag: string, callback: (other: IGameObject) => void): void {
    if (!this._onCollideEndCallbacks.has(tag)) {
      this._onCollideEndCallbacks.set(tag, []);
    }
    this._onCollideEndCallbacks.get(tag)!.push(callback);
  }

  update(dt: number): void {
    for (const component of this.components.values()) {
      component.update?.(dt);
    }
  }

  destroy(): void {
    for (const component of this.components.values()) {
      component.destroy?.();
    }
    this.components.clear();
    
    // Clear collision callbacks
    this._onCollideCallbacks.clear();
    this._onCollideUpdateCallbacks.clear();
    this._onCollideEndCallbacks.clear();
  }
}

