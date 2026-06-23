import { defineCapability } from '@engine/core/define-capability.js';
import type { Transform, InputQueue } from '@engine/protocol/components.js';
import { INPUT_QUEUE_ENTITY } from '@net/index.js';
import type { WorldBlueprint } from './demo.assembly.js';
import { transformCapability, velocityCapability, colorCapability } from '@atom-skills/index.js';

// 交互演示能力：读单例 InputQueue 的指针事件，把"横向拖拽位移"累加到目标 Mesh3D 的 Transform.rotation
// （3D 后端据此绕 flipAxis 翻面）→ 手指拖动即转动立方体。
//
// 用闭包记录上一指针 x（仅本地单人 demo；联机需把状态落到组件以保确定性）。这就是触摸输入管线的端到端验证：
// wx.onTouch* → WechatTouchInputSource → 命令流 → InputQueue → 本系统 → Transform → 渲染。
export function buildDragRotateCapability(sensitivity = 0.01) {
  let lastX: number | null = null;
  return defineCapability({
    id: 'demo-drag-rotate',
    version: '1.0.0',
    describe: {
      name: 'drag-rotate',
      summary: '横向拖拽 → 累加到 Mesh3D 实体的 Transform.rotation（翻面角）',
      semantic: ['demo', 'input'],
      whenToUse: '触摸交互 3D 演示：拖动转动立方体',
      examples: ['拖拽查看 3D 模型'],
    },
    components: { provides: {}, reads: ['InputQueue', 'Transform', 'Mesh3D'], writes: ['Transform'], consumes: [] },
    config: {},
    systems: [
      {
        id: 'drag-rotate',
        reads: ['InputQueue', 'Transform', 'Mesh3D'],
        writes: ['Transform'],
        consumes: [],
        execute(world) {
          const iq = world.getComponent<InputQueue>(INPUT_QUEUE_ENTITY, 'InputQueue');
          if (!iq) return;
          for (const ev of iq.actions) {
            if (ev.x === undefined) continue;
            if (ev.phase === 'down') {
              lastX = ev.x;
            } else if (ev.phase === 'move' && lastX !== null) {
              const delta = ev.x - lastX;
              lastX = ev.x;
              for (const [id] of world.query('Transform', 'Mesh3D')) {
                world.getComponent<Transform>(id, 'Transform')!.rotation += delta * sensitivity;
              }
            } else if (ev.phase === 'up' || ev.phase === 'drag') {
              lastX = null;
            }
          }
        },
      },
    ],
  });
}

// 交互 3D 场景：一个立方体，拖拽转动（无 Velocity.angular → 不自转，纯由手指驱动）。
export const interactive3dBlueprint: WorldBlueprint = {
  capabilities: [transformCapability, velocityCapability, colorCapability, buildDragRotateCapability()],
  entities: {
    cube: {
      Transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      Mesh3D: {
        shape: 'box', width: 120, height: 120, depth: 120,
        frontTint: 0x38bdf8, backTint: 0x0ea5e9, edgeTint: 0x0c4a6e, flipAxis: 'y',
      },
      Color: { tint: 0x38bdf8, alpha: 1 },
    },
  },
};
