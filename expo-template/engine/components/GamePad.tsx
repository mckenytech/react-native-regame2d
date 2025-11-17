import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { makeMutable, type SharedValue } from 'react-native-reanimated';
import type { GameKey, InputSystem } from '../core/InputSystem';

interface GamePadProps {
  inputSystem: InputSystem;
  size?: number;
  opacity?: number;
}

// ✅ ZERO-LATENCY INPUT! SharedValues updated directly on UI thread
export const inputSharedValues: Record<GameKey, SharedValue<boolean>> = {
  up: makeMutable(false),
  down: makeMutable(false),
  left: makeMutable(false),
  right: makeMutable(false),
  a: makeMutable(false),
  b: makeMutable(false),
};

/**
 * On-screen game pad for touch controls - PURE UI THREAD! ⚡
 * NO runOnJS, NO bridging - instant SharedValue updates like Unity Input!
 */
export function GamePad({ inputSystem, size = 70, opacity = 0.7 }: GamePadProps) {
  const buttonStyle = {
    width: size,
    height: size,
    opacity,
  };

  // ✅ Creates a ZERO-LATENCY UI-thread gesture for a key
  const createKeyGesture = (key: GameKey) => {
    const sharedValue = inputSharedValues[key];
    
    return Gesture.Manual()
      .onTouchesDown(() => {
        'worklet'; // 🚀 Pure UI thread - INSTANT! No bridging!
        sharedValue.value = true;
      })
      .onTouchesUp(() => {
        'worklet';
        sharedValue.value = false;
      })
      .onTouchesCancelled(() => {
        'worklet';
        sharedValue.value = false;
      });
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* D-Pad (Left side) */}
      <View style={styles.dpad}>
        {/* Up */}
        <View style={styles.dpadRow}>
          <View style={{ width: size }} />
          <GestureDetector gesture={createKeyGesture('up')}>
            <View style={[styles.button, styles.buttonUp, buttonStyle]}>
              <Text style={styles.buttonText}>▲</Text>
            </View>
          </GestureDetector>
          <View style={{ width: size }} />
        </View>

        {/* Left, Center, Right */}
        <View style={styles.dpadRow}>
          <GestureDetector gesture={createKeyGesture('left')}>
            <View style={[styles.button, styles.buttonLeft, buttonStyle]}>
              <Text style={styles.buttonText}>◀</Text>
            </View>
          </GestureDetector>
          <View style={[styles.center, { width: size, height: size }]} />
          <GestureDetector gesture={createKeyGesture('right')}>
            <View style={[styles.button, styles.buttonRight, buttonStyle]}>
              <Text style={styles.buttonText}>▶</Text>
            </View>
          </GestureDetector>
        </View>

        {/* Down */}
        <View style={styles.dpadRow}>
          <View style={{ width: size }} />
          <GestureDetector gesture={createKeyGesture('down')}>
            <View style={[styles.button, styles.buttonDown, buttonStyle]}>
              <Text style={styles.buttonText}>▼</Text>
            </View>
          </GestureDetector>
          <View style={{ width: size }} />
        </View>
      </View>

      {/* Action Buttons (Right side) */}
      <View style={styles.actionButtons}>
        {/* B button (lower) */}
        <View style={styles.actionRow}>
          <View style={{ width: size }} />
          <GestureDetector gesture={createKeyGesture('b')}>
            <View style={[styles.button, styles.buttonB, buttonStyle]}>
              <Text style={styles.buttonTextAction}>B</Text>
            </View>
          </GestureDetector>
        </View>

        {/* A button (upper right) */}
        <View style={styles.actionRow}>
          <GestureDetector gesture={createKeyGesture('a')}>
            <View style={[styles.button, styles.buttonA, buttonStyle]}>
              <Text style={styles.buttonTextAction}>A</Text>
            </View>
          </GestureDetector>
          <View style={{ width: size }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
  },
  dpad: {
    justifyContent: 'center',
  },
  dpadRow: {
    flexDirection: 'row',
  },
  center: {
    backgroundColor: 'rgba(100, 100, 100, 0.2)',
    borderRadius: 10,
  },
  actionButtons: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    marginVertical: 5,
  },
  button: {
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonUp: {
    backgroundColor: 'rgba(100, 150, 255, 0.8)',
  },
  buttonDown: {
    backgroundColor: 'rgba(100, 150, 255, 0.8)',
  },
  buttonLeft: {
    backgroundColor: 'rgba(100, 150, 255, 0.8)',
  },
  buttonRight: {
    backgroundColor: 'rgba(100, 150, 255, 0.8)',
  },
  buttonA: {
    backgroundColor: 'rgba(255, 100, 100, 0.8)',
  },
  buttonB: {
    backgroundColor: 'rgba(255, 200, 100, 0.8)',
  },
  buttonText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonTextAction: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
});

