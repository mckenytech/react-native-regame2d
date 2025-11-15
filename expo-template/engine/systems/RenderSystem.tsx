import {
  Canvas,
  Circle,
  Group,
  Rect,
  Skia,
  Image as SkiaImage,
  useImage,
  type Transforms3d,
} from '@shopify/react-native-skia';
import React, { useMemo, useState } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { runOnJS, useAnimatedReaction, useDerivedValue } from 'react-native-reanimated';
import type { GameObject, SpriteComponent } from '../types';

// Convert anchor string to normalized Vec2 (matching Kaplay's system)
// topleft = (-1, -1), center = (0, 0), botright = (1, 1)
function anchorToVec2(anchor: string | undefined): { x: number; y: number } {
  switch (anchor) {
    case 'topleft': return { x: -1, y: -1 };
    case 'top': return { x: 0, y: -1 };
    case 'topright': return { x: 1, y: -1 };
    case 'left': return { x: -1, y: 0 };
    case 'center': return { x: 0, y: 0 };
    case 'right': return { x: 1, y: 0 };
    case 'botleft': return { x: -1, y: 1 };
    case 'bot': return { x: 0, y: 1 };
    case 'botright': return { x: 1, y: 1 };
    default: return { x: 0, y: 0 }; // Default to center
  }
}

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
          anchor?:string,
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
        const sprite = obj.get<SpriteComponent>('sprite');
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

        const spriteSource =
          typeof sprite?.source === 'number'
            ? sprite.source
            : typeof sprite?.source === 'string' && !sprite.source.startsWith('data:')
              ? sprite.source
              : null;
        const spriteImageFromSource = useImage(spriteSource ?? null);
        const spriteImageFallback = useMemo(() => {
          const fallbackDataUri =
            sprite?.dataUri ??
            (typeof sprite?.source === 'string' && sprite.source.startsWith('data:')
              ? sprite.source
              : null);

          if (spriteImageFromSource || !fallbackDataUri) return null;
          try {
            const base64 = fallbackDataUri.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
            const data = Skia.Data.fromBase64(base64);
            if (!data) return null;
            return Skia.Image.MakeImageFromEncoded(data);
          } catch (error) {
            console.warn('Failed to decode sprite image:', error);
            return null;
          }
        }, [spriteImageFromSource, sprite?.dataUri, sprite?.source]);

        const resolvedSpriteImage = spriteImageFromSource ?? spriteImageFallback;

        const transformMatrix = useDerivedValue<Transforms3d>(() => {
          const translateX = transform.pos.x.value;
          const translateY = transform.pos.y.value;
          const rotationValue = transform.rotation ?? 0;
          const scaleX = transform.scale?.x ?? 1;
          const scaleY = transform.scale?.y ?? 1;

          return [
            { translateX },
            { translateY },
            { rotate: rotationValue },
            { scaleX },
            { scaleY },
          ];
        });

        const opacity = useDerivedValue(() => transform.visible.value);
        const renderWidth =
          sprite?.width ?? resolvedSpriteImage?.width() ?? rect?.width ?? 0;
        const renderHeight =
          sprite?.height ?? resolvedSpriteImage?.height() ?? rect?.height ?? 0;

        return (
          <Group
            key={obj.id}
            transform={transformMatrix}
            opacity={opacity}
          >
            {rect && (() => {
              const anchorVec = anchorToVec2(transform?.anchor);
              // Anchor offset: topleft (-1,-1) -> (-width/2, -height/2), center (0,0) -> (0,0), botright (1,1) -> (width/2, height/2)
              const offsetX = anchorVec.x * rect.width * 0.5;
              const offsetY = anchorVec.y * rect.height * 0.5;
              return (
                <Rect
                  x={offsetX}
                  y={offsetY}
                  width={rect.width}
                  height={rect.height}
                  color={rect.color}
                />
              );
            })()}
            {circle && (() => {
              const anchorVec = anchorToVec2(transform?.anchor);
              // Anchor offset: topleft (-1,-1) -> (-radius, -radius), center (0,0) -> (0,0), botright (1,1) -> (radius, radius)
              const offsetX = anchorVec.x * circle.radius;
              const offsetY = anchorVec.y * circle.radius;
              return (
                <Circle
                  cx={offsetX}
                  cy={offsetY}
                  r={circle.radius}
                  color={circle.color}
                />
              );
            })()}
            {sprite && resolvedSpriteImage && (
              <SkiaImage
                image={resolvedSpriteImage}
                x={-renderWidth / 2 + (sprite.origin?.x ?? renderWidth / 2)}
                y={-renderHeight / 2 + (sprite.origin?.y ?? renderHeight / 2)}
                width={renderWidth}
                height={renderHeight}
                fit="fill"
                filterMode="nearest"
                mipmapMode="none"
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

