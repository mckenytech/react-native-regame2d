import { Game } from './engine';
import { MainScene } from './scenes/Main';

// Scene registry
const scenes = {
  main: MainScene,
  // Add more scenes here as you create them
};

export default function App() {
  return (
    <Game showGamePad>
      {(ctx) => {
        // Register all scenes
        Object.entries(scenes).forEach(([name, sceneFunc]) => {
          ctx.scene(name, sceneFunc);
        });

        // Start with main scene
        ctx.go('main');
      }}
    </Game>
  );
}

