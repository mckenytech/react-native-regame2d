/**
 * Input system - manages keyboard/gamepad input state and callbacks
 * Similar to Kaplay's input system
 */

export type GameKey = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | string;

type KeyCallback = () => void;

export class InputSystem {
  private pressedKeys = new Set<GameKey>();
  private previousKeys = new Set<GameKey>();
  
  // Event callbacks
  private onKeyDownCallbacks = new Map<GameKey, KeyCallback[]>();
  private onKeyPressCallbacks = new Map<GameKey, KeyCallback[]>();
  private onKeyReleaseCallbacks = new Map<GameKey, KeyCallback[]>();

  /**
   * Register a callback for when a key is first pressed
   */
  onKeyDown(key: GameKey, callback: KeyCallback): void {
    if (!this.onKeyDownCallbacks.has(key)) {
      this.onKeyDownCallbacks.set(key, []);
    }
    this.onKeyDownCallbacks.get(key)!.push(callback);
  }

  /**
   * Register a callback for every frame while a key is held down
   */
  onKeyPress(key: GameKey, callback: KeyCallback): void {
    if (!this.onKeyPressCallbacks.has(key)) {
      this.onKeyPressCallbacks.set(key, []);
    }
    this.onKeyPressCallbacks.get(key)!.push(callback);
  }

  /**
   * Register a callback for when a key is released
   */
  onKeyRelease(key: GameKey, callback: KeyCallback): void {
    if (!this.onKeyReleaseCallbacks.has(key)) {
      this.onKeyReleaseCallbacks.set(key, []);
    }
    this.onKeyReleaseCallbacks.get(key)!.push(callback);
  }

  /**
   * Check if a key is currently pressed
   */
  isKeyDown(key: GameKey): boolean {
    return this.pressedKeys.has(key);
  }

  /**
   * Set key state (called by GamePad component)
   */
  setKeyPressed(key: GameKey, pressed: boolean): void {
    if (pressed) {
      this.pressedKeys.add(key);
    } else {
      this.pressedKeys.delete(key);
    }
  }

  /**
   * Update input state and trigger callbacks
   */
  update(): void {
    // Check for newly pressed keys
    for (const key of this.pressedKeys) {
      if (!this.previousKeys.has(key)) {
        // Key just pressed
        const callbacks = this.onKeyDownCallbacks.get(key);
        if (callbacks) {
          for (const callback of callbacks) {
            callback();
          }
        }
      }

      // Key is held down
      const callbacks = this.onKeyPressCallbacks.get(key);
      if (callbacks) {
        for (const callback of callbacks) {
          callback();
        }
      }
    }

    // Check for released keys
    for (const key of this.previousKeys) {
      if (!this.pressedKeys.has(key)) {
        // Key just released
        const callbacks = this.onKeyReleaseCallbacks.get(key);
        if (callbacks) {
          for (const callback of callbacks) {
            callback();
          }
        }
      }
    }

    // Update previous state
    this.previousKeys = new Set(this.pressedKeys);
  }

  /**
   * Clear all input state and callbacks
   */
  clear(): void {
    this.pressedKeys.clear();
    this.previousKeys.clear();
    this.onKeyDownCallbacks.clear();
    this.onKeyPressCallbacks.clear();
    this.onKeyReleaseCallbacks.clear();
  }
}

