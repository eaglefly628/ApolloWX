import type { WorldBlueprint } from './demo.assembly.js';
import { transformCapability, velocityCapability, colorCapability } from '@atom-skills/index.js';
import { rotationApplyCapability } from '@skills/tier1/index.js';

// 3D 演示场景：几个 Mesh3D 物件（box/plane）原地自转 —— 微信小游戏 3D「跑通」的可视证据。
// 数据驱动：玩法全在数据里。Mesh3D 是引擎通用「3D 物件即数据」原语（render-only，不进 sim）；
// 自转 = Velocity.angular，由 rotation-apply 每 tick 累加到 Transform.rotation，再由 3D 后端当翻面角。
// 相机自适配包围盒，无需手设。把它换成你自己的 Mesh3D 数据即得你的 3D 场景。
export const playground3dBlueprint: WorldBlueprint = {
  capabilities: [transformCapability, velocityCapability, colorCapability, rotationApplyCapability],
  entities: {
    redBox: {
      Transform: { x: -110, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      Velocity: { vx: 0, vy: 0, angular: 0.03 }, // 绕 y 翻转自转
      Mesh3D: { shape: 'box', width: 80, height: 80, depth: 80, frontTint: 0xef4444, edgeTint: 0x7f1d1d, flipAxis: 'y' },
      Color: { tint: 0xef4444, alpha: 1 },
    },
    greenBox: {
      Transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      Velocity: { vx: 0, vy: 0, angular: -0.022 }, // 绕 x 翻转自转
      Mesh3D: { shape: 'box', width: 70, height: 110, depth: 50, frontTint: 0x22c55e, edgeTint: 0x14532d, flipAxis: 'x' },
      Color: { tint: 0x22c55e, alpha: 1 },
    },
    bluePlane: {
      Transform: { x: 120, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      Velocity: { vx: 0, vy: 0, angular: 0.035 }, // 薄片绕 y 翻转
      Mesh3D: { shape: 'plane', width: 90, height: 90, frontTint: 0x3b82f6, flipAxis: 'y' },
      Color: { tint: 0x3b82f6, alpha: 1 },
    },
  },
};
