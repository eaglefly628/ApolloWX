// 微信小游戏入口（交互 3D demo · three.js）。
// 用最成熟可靠的 three.js 后端渲染引擎的 Mesh3D 数据；**拖动屏幕转动立方体**
// （触摸 → WechatTouchInputSource → 命令流 → InputQueue → drag-rotate 系统 → Transform → 渲染）。

import { createWechatThreeGame } from './three-game.js';
import { interactive3dBlueprint } from '../../assembly/interactive3d.assembly.js';

const g = globalThis as unknown as { performance?: { now(): number } };
if (typeof g.performance === 'undefined' || typeof g.performance.now !== 'function') {
  g.performance = { now: () => Date.now() };
}

const game = createWechatThreeGame({
  blueprint: interactive3dBlueprint,
  background: 0x0a0a14,
  tickRate: 60,
  touch: { move: true }, // 需要连续 move 事件来驱动拖拽
});

game.start();
