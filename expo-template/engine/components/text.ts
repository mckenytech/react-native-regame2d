import type { Component } from '../types';
import type { SharedValue } from 'react-native-reanimated';

export interface TextComponentOptions {
  size?: number;
  font?: string | null;
  width?: number;
  align?: 'left' | 'center' | 'right';
  color?: string;
}

export interface TextComponent extends Component {
  id: 'text';
  text: SharedValue<string>;
  textSize: SharedValue<number>;
  font?: string | null;
  width?: number;
  align: SharedValue<string>;
  color: SharedValue<string>;
}

/**
 * Text component - renders text using Skia
 * Usage: text("Hello World", { size: 24, color: 'white' })
 * 
 * GameObject Methods (added to the object):
 * - obj.text = "new text" - Change text content
 * - obj.textSize = 32 - Change font size
 * - obj.textColor = "#ff0000" - Change text color
 * - obj.textAlign = "center" - Change alignment
 */
export function text(
  content: string,
  options: TextComponentOptions = {}
): TextComponent {
  const { makeMutable } = require('react-native-reanimated');
  
  return {
    id: 'text',
    text: makeMutable(content),
    textSize: makeMutable(options.size ?? 16),
    font: options.font ?? null,
    width: options.width,
    align: makeMutable(options.align ?? 'left'),
    color: makeMutable(options.color ?? '#ffffff'),
  };
}

