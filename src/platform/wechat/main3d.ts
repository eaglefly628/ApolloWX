// 微信小游戏入口（3D 引擎自检 demo · three.js）。
// 用最成熟可靠的 three.js 后端（r162，含 WebGL1 回退 + weapp 适配垫片）渲染引擎的 Mesh3D 数据，
// 加载 playground3d 蓝图（红/绿 box + 蓝 plane 自转）。把蓝图换成你的 Mesh3D 数据即得你的 3D 场景。

import { createWechatThreeGame } from './three-game.js';
import { playground3dBlueprint } from '../../assembly/playground3d.assembly.js';

const g = globalThis as unknown as { performance?: { now(): number } };
if (typeof g.performance === 'undefined' || typeof g.performance.now !== 'function') {
  g.performance = { now: () => Date.now() };
}

const game = createWechatThreeGame({
  blueprint: playground3dBlueprint,
  background: 0x0a0a14,
  tickRate: 60,
});

game.start();
