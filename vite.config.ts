import { defineConfig } from 'vite';
import { resolve } from 'path';

// 仅用于 vitest（单测）与 vite-node（demo/headless 跑引擎）。
// 微信小游戏产物不走 vite —— 见 scripts/build-weapp.mjs（esbuild 打 weapp/game.js）。
export default defineConfig({
  resolve: {
    alias: {
      '@engine': resolve(__dirname, 'src/engine'),
      '@skills': resolve(__dirname, 'src/skills'),
      '@atom-skills': resolve(__dirname, 'src/skills/atoms'),
      '@assets': resolve(__dirname, 'src/assets'),
      '@services': resolve(__dirname, 'src/services'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@net': resolve(__dirname, 'src/net'),
      '@runtime': resolve(__dirname, 'src/runtime'),
      '@platform': resolve(__dirname, 'src/platform'),
      '@ui': resolve(__dirname, 'src/ui'),
    },
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/.claude/**'],
  },
});
