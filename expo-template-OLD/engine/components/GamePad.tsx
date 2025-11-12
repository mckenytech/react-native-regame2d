import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GameKey, InputSystem } from '../core/InputSystem';

interface GamePadProps {
  inputSystem: InputSystem;
  size?: number;
  opacity?: number;
}

/**
 * On-screen game pad for touch controls
 * Provides directional pad and action buttons (A, B)
 */
export function GamePad({ inputSystem, size = 70, opacity = 0.7 }: GamePadProps) {
  const handlePressIn = (key: GameKey) => {
    inputSystem.setKeyPressed(key, true);
  };

  const handlePressOut = (key: GameKey) => {
    inputSystem.setKeyPressed(key, false);
  };

  const buttonStyle = {
    width: size,
    height: size,
    opacity,
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* D-Pad (Left side) */}
      <View style={styles.dpad}>
        {/* Up */}
        <View style={styles.dpadRow}>
          <View style={{ width: size }} />
          <Pressable
            onPressIn={() => handlePressIn('up')}
            onPressOut={() => handlePressOut('up')}
            style={[styles.button, styles.buttonUp, buttonStyle]}
          >
            <Text style={styles.buttonText}>▲</Text>
          </Pressable>
          <View style={{ width: size }} />
        </View>

        {/* Left, Center, Right */}
        <View style={styles.dpadRow}>
          <Pressable
            onPressIn={() => handlePressIn('left')}
            onPressOut={() => handlePressOut('left')}
            style={[styles.button, styles.buttonLeft, buttonStyle]}
          >
            <Text style={styles.buttonText}>◀</Text>
          </Pressable>
          <View style={[styles.center, { width: size, height: size }]} />
          <Pressable
            onPressIn={() => handlePressIn('right')}
            onPressOut={() => handlePressOut('right')}
            style={[styles.button, styles.buttonRight, buttonStyle]}
          >
            <Text style={styles.buttonText}>▶</Text>
          </Pressable>
        </View>

        {/* Down */}
        <View style={styles.dpadRow}>
          <View style={{ width: size }} />
          <Pressable
            onPressIn={() => handlePressIn('down')}
            onPressOut={() => handlePressOut('down')}
            style={[styles.button, styles.buttonDown, buttonStyle]}
          >
            <Text style={styles.buttonText}>▼</Text>
          </Pressable>
          <View style={{ width: size }} />
        </View>
      </View>

      {/* Action Buttons (Right side) */}
      <View style={styles.actionButtons}>
        {/* B button (lower) */}
        <View style={styles.actionRow}>
          <View style={{ width: size }} />
          <Pressable
            onPressIn={() => handlePressIn('b')}
            onPressOut={() => handlePressOut('b')}
            style={[styles.button, styles.buttonB, buttonStyle]}
          >
            <Text style={styles.buttonTextAction}>B</Text>
          </Pressable>
        </View>

        {/* A button (upper right) */}
        <View style={styles.actionRow}>
          <Pressable
            onPressIn={() => handlePressIn('a')}
            onPressOut={() => handlePressOut('a')}
            style={[styles.button, styles.buttonA, buttonStyle]}
          >
            <Text style={styles.buttonTextAction}>A</Text>
          </Pressable>
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

