// 微信小游戏入口（引擎自检 demo）。
// 这不是"游戏" —— 它加载引擎内置的 playground 蓝图（几个彩色形状按速度漂移），
// 用来证明 Apollo 引擎在微信小游戏环境里能正确上屏与跑固定步长循环。
// 真正的游戏 = 你自己的 WorldBlueprint 数据；把下面的 playgroundBlueprint 换成它即可。

import { createWechatGame } from './bootstrap.js';
import { playgroundBlueprint } from '../../assembly/playground.assembly.js';

// 极小 polyfill：个别基础库未把 performance 提升为全局。引擎用 performance.now() 计时。
const g = globalThis as unknown as { performance?: { now(): number } };
if (typeof g.performance === 'undefined' || typeof g.performance.now !== 'function') {
  g.performance = { now: () => Date.now() };
}

const game = createWechatGame({
  blueprint: playgroundBlueprint,
  background: '#16213e',
  tickRate: 60,
});

game.start();
