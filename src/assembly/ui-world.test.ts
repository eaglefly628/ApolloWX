import { describe, it, expect } from 'vitest';
import { Engine } from '@runtime/engine.js';
import { buildUiWorldBlueprint } from './ui-world.assembly.js';
import type { Resource } from '@engine/protocol/components.js';

describe('ui-world 经济系统（UI 即游戏）', () => {
  it('采矿消耗能量产金；升级花金币提采矿力、花费联动', () => {
    const pending: string[] = [];
    const engine = new Engine();
    engine.load(buildUiWorldBlueprint(pending));
    const w = engine.world;
    const get = (id: string): Resource => {
      for (const [eid] of w.query('Resource')) {
        const r = w.getComponent<Resource>(eid, 'Resource')!;
        if (r.id === id) return r;
      }
      throw new Error(`no resource ${id}`);
    };

    // 采矿一次：能量 30→25，金币 +采矿力(1)，花费=采矿力*10=10。
    pending.push('mine');
    w.tick();
    expect(get('energy').current).toBe(25);
    expect(get('gold').current).toBe(1);
    expect(get('cost').current).toBe(10);

    // 金币不足时升级无效（gold 1 < cost 10）。
    pending.push('upgrade');
    w.tick();
    expect(get('power').current).toBe(1);

    // 给够金币再升级：花费扣除、采矿力 +1、花费联动到 20。
    get('gold').current = 50;
    pending.push('upgrade');
    w.tick();
    expect(get('gold').current).toBe(40);
    expect(get('power').current).toBe(2);
    expect(get('cost').current).toBe(20);

    // 能量不会超过上限（连续回复到顶）。
    for (let i = 0; i < 300; i++) w.tick();
    expect(get('energy').current).toBeLessThanOrEqual(get('energy').max);
  });
});
