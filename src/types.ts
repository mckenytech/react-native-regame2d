export type EditorMode = 'edit' | 'play' | 'pause';

export interface EditorState {
  mode: EditorMode;
  selectedObjectId: string | null;
  showGrid: boolean;
  gridSize: number;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  scene: Scene;
}

export interface Scene {
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  objects: SceneObject[];
}

export interface SceneObject {
  id: string;
  name: string;
  type: 'rect' | 'circle';
  transform: {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
  };
  components: ComponentProperty[];
  tags: string[];
}

export interface RectObject extends SceneObject {
  type: 'rect';
  width: number;
  height: number;
  color: string;
}

export interface CircleObject extends SceneObject {
  type: 'circle';
  radius: number;
  color: string;
}

export interface ComponentProperty {
  type: string;
  properties: Record<string, any>;
}
