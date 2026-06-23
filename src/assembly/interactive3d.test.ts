import { describe, it, expect } from 'vitest';
import { Engine } from '@runtime/engine.js';
import { INPUT_QUEUE_ENTITY } from '@net/index.js';
import { buildDragRotateCapability } from './interactive3d.assembly.js';
import { transformCapability } from '@atom-skills/index.js';
import type { Transform, InputQueue } from '@engine/protocol/components.js';
import type { WorldBlueprint } from './demo.assembly.js';

// 验证触摸→旋转的核心逻辑：down 记起点，move 把位移累加到 Mesh3D 实体的 Transform.rotation，up 清状态。
describe('drag-rotate 能力', () => {
  it('move 事件按位移累加 rotation；down 仅记起点、up 清状态', () => {
    const blueprint: WorldBlueprint = {
      capabilities: [transformCapability, buildDragRotateCapability(0.01)],
      entities: {
        cube: {
          Transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
          Mesh3D: { shape: 'box', width: 10, height: 10, depth: 10, frontTint: 0xffffff },
        },
      },
    };
    const engine = new Engine();
    engine.load(blueprint);
    const w = engine.world;
    w.createEntity(INPUT_QUEUE_ENTITY);
    const setActions = (acts: InputQueue['actions']) =>
      w.addComponent(INPUT_QUEUE_ENTITY, { type: 'InputQueue', actions: acts } as InputQueue);

    const rot = () => w.getComponent<Transform>('cube', 'Transform')!.rotation;

    setActions([{ source: 'p1', x: 100, phase: 'down' }]);
    w.tick();
    expect(rot()).toBe(0); // down 不转

    w.getComponent<InputQueue>(INPUT_QUEUE_ENTITY, 'InputQueue')!.actions = [{ source: 'p1', x: 150, phase: 'move' }];
    w.tick();
    expect(rot()).toBeCloseTo(0.5); // (150-100)*0.01

    w.getComponent<InputQueue>(INPUT_QUEUE_ENTITY, 'InputQueue')!.actions = [{ source: 'p1', x: 130, phase: 'move' }];
    w.tick();
    expect(rot()).toBeCloseTo(0.3); // 0.5 + (130-150)*0.01

    // 抬手后再来 move（无 down）不应继续转。
    w.getComponent<InputQueue>(INPUT_QUEUE_ENTITY, 'InputQueue')!.actions = [{ source: 'p1', x: 130, phase: 'up' }];
    w.tick();
    w.getComponent<InputQueue>(INPUT_QUEUE_ENTITY, 'InputQueue')!.actions = [{ source: 'p1', x: 300, phase: 'move' }];
    w.tick();
    expect(rot()).toBeCloseTo(0.3); // 未按下，忽略
  });
});
