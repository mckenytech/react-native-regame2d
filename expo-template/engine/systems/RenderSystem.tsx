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
  debug?: boolean; // Show collision area outlines
}

/**
 * Skia-based render system
 * Renders all game objects with rect or circle components
 */
export function RenderSystem({ objects, width, height, tick, debug = false }: RenderSystemProps) {
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
        const area = obj.get<{
          id:'area',
          shape?:'rect'|'circle',
          width?:number,
          height?:number,
          radius?:number,
          offset?:{x:number,y:number},
          scale?:{x:number,y:number},
          cursor?:string|null,
          collisionIgnore?:string[],
          restitution?:number,
          friction?:number,
        }>('area');

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
            
            {/* Debug: Show collision area outline (like Kaboom) */}
            {debug && area && (() => {
              // Auto-detect shape from rect/circle if not specified
              const areaShape = area.shape || (circle ? 'circle' : 'rect');
              const scale = area.scale ?? { x: 1, y: 1 };
              const areaWidth = (area.width ?? rect?.width ?? 50) * scale.x;
              const areaHeight = (area.height ?? rect?.height ?? 50) * scale.y;
              const areaRadius = (area.radius ?? circle?.radius ?? 25) * Math.max(scale.x, scale.y);
              const offsetX = area.offset?.x ?? 0;
              const offsetY = area.offset?.y ?? 0;
              
              if (areaShape === 'circle') {
                return (
                  <Circle
                    cx={offsetX}
                    cy={offsetY}
                    r={areaRadius}
                    style="stroke"
                    strokeWidth={2}
                    color="#00ff00" // Green outline like Kaboom
                  />
                );
              } else {
                return (
                  <Rect
                    x={-areaWidth / 2 + offsetX}
                    y={-areaHeight / 2 + offsetY}
                    width={areaWidth}
                    height={areaHeight}
                    style="stroke"
                    strokeWidth={2}
                    color="#00ff00" // Green outline like Kaboom
                  />
                );
              }
            })()}
          </Group>
        );
      })}
    </Canvas>
  );
}

