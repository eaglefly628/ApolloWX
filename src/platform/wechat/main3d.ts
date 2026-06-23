// 微信小游戏入口（3D 引擎自检 demo）。
// 加载引擎内置的 playground3d 蓝图（几个 Mesh3D 物件原地自转），用原生 WebGL 后端上屏，
// 证明 Apollo 引擎的 3D 数据路径（Mesh3D + collectRenderables + WebGLRenderer）在微信环境能跑。
// 把 playground3dBlueprint 换成你自己的 Mesh3D 数据即得你的 3D 场景。

import { createWechatGame } from './bootstrap.js';
import { playground3dBlueprint } from '../../assembly/playground3d.assembly.js';

const g = globalThis as unknown as { performance?: { now(): number } };
if (typeof g.performance === 'undefined' || typeof g.performance.now !== 'function') {
  g.performance = { now: () => Date.now() };
}

const game = createWechatGame({
  blueprint: playground3dBlueprint,
  renderer: '3d',
  background: '#0a0a14',
  tickRate: 60,
});

game.start();
