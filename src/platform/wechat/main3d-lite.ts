// 微信小游戏入口（交互 3D demo · 零依赖 WebGL lite）。
// 不打包 three.js：用引擎自带原生 WebGLRenderer 渲染同一份 Mesh3D 数据，同样支持拖动转动立方体。
// 适合对包体极敏感、或目标设备 WebGL 能力有限的场景。功能比 three 路径基础（单色 + 方向光）。

import { createWechatGame } from './bootstrap.js';
import { interactive3dBlueprint } from '../../assembly/interactive3d.assembly.js';

const g = globalThis as unknown as { performance?: { now(): number } };
if (typeof g.performance === 'undefined' || typeof g.performance.now !== 'function') {
  g.performance = { now: () => Date.now() };
}

const game = createWechatGame({
  blueprint: interactive3dBlueprint,
  renderer: '3d',
  background: '#0a0a14',
  tickRate: 60,
  touch: { move: true },
});

game.start();
