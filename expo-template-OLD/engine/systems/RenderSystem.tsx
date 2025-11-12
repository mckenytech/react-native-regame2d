import { Canvas, Circle, Group, Rect } from '@shopify/react-native-skia';
import React, { useState } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { runOnJS, useAnimatedReaction, useDerivedValue } from 'react-native-reanimated';
import type { GameObject } from '../types';

interface RenderSystemProps {
  objects: GameObject[];
  width: number;
  height: number;
  tick: SharedValue<number>;
}

/**
 * Skia-based render system
 * Renders all game objects with rect or circle components
 */
export function RenderSystem({ objects, width, height, tick }: RenderSystemProps) {
  const [, setRenderTick] = useState(0);
  
  // Only re-render when objects are added/removed (not on every frame!)
  useAnimatedReaction(
    () => tick.value,
    (current) => {
      console.log("tick");
      
      runOnJS(setRenderTick)(Date.now());
    }
  );
  
  return (
    <Canvas style={{ width, height }}>
      {objects.map((obj) => {
        const transform = obj.get<{
          id:'transform',
          pos:{
            x:SharedValue<number>,
            y:SharedValue<number>,
          },
          scale:{
            x:number,
            y:number,
          },
          rotation:SharedValue<number>,
          visible:SharedValue<number>,
          update?: (dt: number) => void,
          destroy?: () => void,
        }>('transform');
        const rect = obj.get<{
          id:'rect',
          width:number,
          height:number,
          color:string,
        }>('rect');
        const circle = obj.get<{
          id:'circle',
          radius:number,
          color:string,
        }>('circle');

        if (!transform) return null;

        // Pass shared values directly to Skia - NO re-renders needed!
        const x = transform.pos.x;
        const y = transform.pos.y;
        const visible = transform.visible;
        const scaleX = transform.scale?.x ?? 1;
        const scaleY = transform.scale?.y ?? 1;
        const rotation = transform.rotation;

        // Use Group with animated transforms
        const transformm = useDerivedValue(() => [
          { translateX: x.value },
          { translateY: y.value },
          { rotate: rotation?.value ?? 0 },
          { scaleX: scaleX * visible.value }, // Hide by scaling to 0
          { scaleY: scaleY * visible.value },
        ]);
        return (
          <Group
            key={obj.id}
            transform={transformm}
       
          >
            {rect && (
              <Rect
                x={-rect.width / 2}
                y={-rect.height / 2}
                width={rect.width}
                height={rect.height}
                color={rect.color}
              />
            )}
            {circle && (
              <Circle
                cx={0}
                cy={0}
                r={circle.radius}
                color={circle.color}
              />
            )}
          </Group>
        );
      })}
    </Canvas>
  );
}

