import type { Component, GameObject as IGameObject } from '../types';
import type { GameContext } from './GameContext';

let nextId = 0;

export class GameObject implements IGameObject {
  id: string;
  tags: string[];
  components: Map<string, Component>;
  private context: GameContext;
  parent: GameObject | null;
  children: GameObject[];
  
  // Collision event callbacks
  private _onCollideCallbacks = new Map<string, Function[]>();
  private _onCollideUpdateCallbacks = new Map<string, Function[]>();
  private _onCollideEndCallbacks = new Map<string, Function[]>();
  private _eventHandlers = new Map<string, Set<(...args: any[]) => void>>();

  constructor(context: GameContext) {
    this.id = `obj_${nextId++}`;
    this.tags = [];
    this.components = new Map();
    this.context = context;
    this.parent = null;
    this.children = [];
  }

  get<T extends Component>(id: string): T | undefined {
    return this.components.get(id) as T | undefined;
  }

  has(id: string): boolean {
    return this.components.has(id);
  }

  add(component: Component): this {
    this.components.set(component.id, component);
    this.trigger('use', component);
    return this;
  }

  addChild(components: (Component | string)[]): GameObject {
    return this.context.add(components, this);
  }

  removeChild(child: GameObject): void {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
    }
    if (child.parent === this) {
      child.parent = null;
    }
  }

  setParent(parent: GameObject | null): void {
    if (this.parent === parent) return;

    if (this.parent) {
      const idx = this.parent.children.indexOf(this);
      if (idx !== -1) {
        this.parent.children.splice(idx, 1);
      }
    }

    this.parent = parent;

    if (parent && !parent.children.includes(this)) {
      parent.children.push(this);
    }
  }

  addTag(tag: string): this {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      this.trigger('tag', tag);
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

  on(event: string, handler: (...args: any[]) => void): void {
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, new Set());
    }
    this._eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler?: (...args: any[]) => void): void {
    const handlers = this._eventHandlers.get(event);
    if (!handlers) return;
    if (handler) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this._eventHandlers.delete(event);
      }
    } else {
      this._eventHandlers.delete(event);
    }
  }

  trigger(event: string, ...args: any[]): void {
    const handlers = this._eventHandlers.get(event);
    if (handlers) {
      for (const handler of Array.from(handlers)) {
        handler.apply(this, args);
      }
    }
    this.context.emit(event, this, ...args);
  }

  update(dt: number): void {
    for (const component of this.components.values()) {
      component.update?.(dt);
    }
    this.trigger('update', dt);
  }

  destroy(): void {
    this.trigger('destroy');

    // Detach and destroy children
    const childrenCopy = [...this.children];
    for (const child of childrenCopy) {
      child.setParent(null);
      this.context.destroy(child);
    }
    this.children = [];

    // Detach from parent
    this.setParent(null);

    for (const component of this.components.values()) {
      component.destroy?.();
    }
    this.components.clear();
    
    // Clear collision callbacks
    this._onCollideCallbacks.clear();
    this._onCollideUpdateCallbacks.clear();
    this._onCollideEndCallbacks.clear();
    this._eventHandlers.clear();
  }
}

