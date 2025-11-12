import { runOnJS, useFrameCallback, useSharedValue } from 'react-native-reanimated';

/**
 * Game loop using Reanimated's useFrameCallback
 * Runs at 60fps on the UI thread
 */
export function useGameLoop(update: (dt: number) => void) {
  const lastTime = useSharedValue(0);

  useFrameCallback((frameInfo) => {
    'worklet';
    
    const currentTime = frameInfo.timestamp;
    
    if (lastTime.value === 0) {
      lastTime.value = currentTime;
      return;
    }

    const dt = (currentTime - lastTime.value) / 1000; // Convert to seconds
    lastTime.value = currentTime;

    // Call the update function on the JS thread
    runOnJS(update)(dt);
  }, true); // true = auto-start

  return null;
}

