import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { NativeModules, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { GamePad } from './components/GamePad';
import { GameContext } from './core/GameContext';
import { useGameLoop } from './core/GameLoop';
import { InputSystem } from './core/InputSystem';
import { RenderSystem } from './systems/RenderSystem';

// Re-export components
export * from './components';
export { GamePad } from './components/GamePad';
export type { Component, GameObject, Vec2 } from './types';

interface GameProps {
  width?: number;
  height?: number;
  children: (ctx: GameContext) => void;
  showGamePad?: boolean;
  gamePadSize?: number;
  gamePadOpacity?: number;
  debug?: boolean; // Show collision area outlines
}

/**
 * Main Game component
 * Usage:
 * <Game showGamePad>
 *   {(ctx) => {
 *     ctx.add([pos(100, 100), body(), rect(50, 50, 'red'), "player"]);
 *     ctx.onKeyPress("left", () => { ... });
 *   }}
 * </Game>
 */
export function Game({ 
  width: customWidth, 
  height: customHeight, 
  children,
  showGamePad = true,
  gamePadSize,
  gamePadOpacity,
  debug = false,
}: GameProps) {
  const dimensions = useWindowDimensions();
  const width = customWidth ?? dimensions.width;
  const height = customHeight ?? dimensions.height;

  const devMenu = NativeModules?.DevMenu as { show?: () => void } | undefined;
  const canShowDevMenu = __DEV__ && typeof devMenu?.show === 'function';
  const devMenuHitSlop = useMemo(
    () => ({ top: 8, right: 8, bottom: 8, left: 8 }),
    []
  );

  const contextRef = useRef<GameContext>(new GameContext());
  const inputSystemRef = useRef<InputSystem>(new InputSystem());
  const tick = useSharedValue(0);
  const setupRef = useRef(false);

  // Setup game objects once
  if (!setupRef.current) {
    // Initialize input system
    contextRef.current.setInputSystem(inputSystemRef.current);
    contextRef.current.setViewport(width, height);
    if (__DEV__) {
      console.log(
        '[ReGame] GameContext prototype methods:',
        Object.getOwnPropertyNames(Object.getPrototypeOf(contextRef.current)),
      );
    }
    
    // Set up a listener for when objects are added/removed
    const originalAdd = contextRef.current.add.bind(contextRef.current);
    contextRef.current.add = (components: any) => {
      const result = originalAdd(components);
      tick.value += 1; // Trigger re-render only when objects added
      return result;
    };
    
    children(contextRef.current);
    setupRef.current = true;
  }

  useEffect(() => {
    contextRef.current.setViewport(width, height);
  }, [width, height]);

  // Update function called every frame
  const update = useCallback((dt: number) => {
    contextRef.current.update(dt);
    // No tick increment - Skia uses shared values directly!
  }, []);

  const openDevMenu = useCallback(() => {
    if (canShowDevMenu) {
      devMenu?.show?.();
    }
  }, [canShowDevMenu, devMenu]);

  // Start game loop
  useGameLoop(update);

  return (
    <View style={styles.container}>
      <RenderSystem
        objects={contextRef.current.objects}
        width={width}
        height={height}
        tick={tick}
        debug={debug}
      />
      {showGamePad && (
        <GamePad 
          inputSystem={inputSystemRef.current}
          size={gamePadSize}
          opacity={gamePadOpacity}
        />
      )}
      {canShowDevMenu && (
        <View pointerEvents="box-none" style={styles.devMenuContainer}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open developer menu"
            hitSlop={devMenuHitSlop}
            onPress={openDevMenu}
            style={styles.devMenuButton}
          >
            <Text style={styles.devMenuButtonText}>DEV</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/**
 * Hook to use the game engine programmatically
 * Useful for more complex setups
 */
export function useGame() {
  const contextRef = useRef<GameContext>(new GameContext());
  const tick = useSharedValue(0);

  const update = useCallback((dt: number) => {
    contextRef.current.update(dt);
    tick.value += 1;
  }, [tick]);

  useGameLoop(update);

  return {
    context: contextRef.current,
    add: contextRef.current.add.bind(contextRef.current),
    destroy: contextRef.current.destroy.bind(contextRef.current),
    get: contextRef.current.get.bind(contextRef.current),
    tick,
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  devMenuContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  devMenuButton: {
    backgroundColor: 'rgba(20, 24, 35, 0.6)',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  devMenuButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

