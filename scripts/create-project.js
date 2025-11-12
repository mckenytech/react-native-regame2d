#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectName = process.argv[2] || 'my-game';

console.log(`🎮 Creating ReGame Engine project: ${projectName}`);
console.log('');

// Create project with Expo
console.log('📦 Creating Expo project...');
execSync(`npx create-expo-app@latest ${projectName} --template blank`, { 
  stdio: 'inherit' 
});

const projectPath = path.join(process.cwd(), projectName);

// Install dependencies
console.log('');
console.log('📚 Installing dependencies...');
process.chdir(projectPath);
execSync('npm install react-native-reanimated react-native-gesture-handler @shopify/react-native-skia', {
  stdio: 'inherit'
});

// Copy engine folder
console.log('');
console.log('🎨 Setting up game engine...');
const engineSource = path.join(__dirname, '..', 'engine');
const engineDest = path.join(projectPath, 'engine');
copyRecursive(engineSource, engineDest);

// Create example game
const exampleGame = `import { Game, pos, rect, circle, body, area } from './engine';

export default function App() {
  return (
    <Game showGamePad>
      {(ctx) => {
        // Create player
        const player = ctx.add([
          pos(200, 200),
          rect(40, 40, '#6495ed'),
          area(),
          "player"
        ]);

        // Movement controls
        ctx.onKeyPress("up", () => {
          const transform = player.get('transform');
          transform.pos.y.value -= 5;
        });
        ctx.onKeyPress("down", () => {
          const transform = player.get('transform');
          transform.pos.y.value += 5;
        });
        ctx.onKeyPress("left", () => {
          const transform = player.get('transform');
          transform.pos.x.value -= 5;
        });
        ctx.onKeyPress("right", () => {
          const transform = player.get('transform');
          transform.pos.x.value += 5;
        });

        // Create bouncing enemies
        for (let i = 0; i < 3; i++) {
          const enemy = ctx.add([
            pos(Math.random() * 400, Math.random() * 600),
            circle(20, '#ff6464'),
            area(),
            body({ 
              velocity: { 
                x: (Math.random() - 0.5) * 200, 
                y: (Math.random() - 0.5) * 200 
              } 
            }),
            "enemy"
          ]);
        }

        // Platform
        ctx.add([
          pos(200, 500),
          rect(300, 20, '#90ee90'),
          area(),
          body({ isStatic: true }),
          "platform"
        ]);

        // Collision handling
        player.onCollide("enemy", (enemy) => {
          console.log("Hit enemy!");
          ctx.destroy(enemy);
        });

        player.onCollideUpdate("platform", () => {
          console.log("On platform");
        });
      }}
    </Game>
  );
}
`;

fs.writeFileSync(path.join(projectPath, 'App.js'), exampleGame);

console.log('');
console.log('✅ Project created successfully!');
console.log('');
console.log('To get started:');
console.log(`  cd ${projectName}`);
console.log('  npx expo start');
console.log('');
console.log('Happy game making! 🎮');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  
  const stats = fs.statSync(src);
  
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const files = fs.readdirSync(src);
    files.forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}





