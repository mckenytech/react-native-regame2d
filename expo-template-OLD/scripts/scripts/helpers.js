// Helper functions and utilities for your game

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

export function randomColor() {
  const colors = ['#ff6464', '#64ff64', '#6464ff', '#ffff64', '#ff64ff', '#64ffff'];
  return colors[Math.floor(Math.random() * colors.length)];
}

