import { defineCapability } from '@engine/core/define-capability.js';
import type { IWorld } from '@engine/core/types.js';
import type { Resource } from '@engine/protocol/components.js';
import type { WorldBlueprint } from './demo.assembly.js';

// 「UI 即游戏」demo 的世界：一个放置挖矿小游戏，状态全是 Resource，玩法全在数据/系统里。
// 能量随时间回；点"采矿"消耗能量产金币；点"升级"花金币提采矿力（花费随采矿力涨）。
// UI 通过 §4 世界绑定（bind: Resource id）读这些资源 → 同一份 UI 数据随世界实时变化。

// 取世界里某 id 的 Resource（每资源各自一个实体）。
function resourcesById(world: IWorld): Record<string, Resource> {
  const map: Record<string, Resource> = {};
  for (const [eid] of world.query('Resource')) {
    const r = world.getComponent<Resource>(eid, 'Resource');
    if (r) map[r.id] = r;
  }
  return map;
}

const clamp = (r: Resource): void => { r.current = Math.max(r.min, Math.min(r.max, r.current)); };

// 经济系统能力：闭包持有 pending 信号队列（UI 点击压入），每 tick 结算。
// 单人本地 demo 用闭包状态足够；联机需把队列落到组件以保确定性。
export function economyCapability(pending: string[], regenEvery = 10, regenAmt = 2) {
  let tick = 0;
  return defineCapability({
    id: 'demo-economy',
    version: '1.0.0',
    describe: {
      name: 'economy',
      summary: '放置挖矿经济：能量回复 + 采矿产金 + 升级提效（读写 Resource）',
      semantic: ['demo', 'economy'],
      whenToUse: 'UI 即游戏 demo',
      examples: ['放置挂机'],
    },
    components: { provides: {}, reads: ['Resource'], writes: ['Resource'], consumes: [] },
    config: {},
    systems: [
      {
        id: 'economy',
        reads: ['Resource'],
        writes: ['Resource'],
        consumes: [],
        execute(world) {
          const r = resourcesById(world);
          const { energy, gold, power, cost } = r;
          tick += 1;
          if (energy && tick % regenEvery === 0) { energy.current += regenAmt; clamp(energy); }

          for (const sig of pending) {
            if (sig === 'mine' && energy && gold && power && energy.current >= 5) {
              energy.current -= 5; gold.current += power.current; clamp(energy); clamp(gold);
            } else if (sig === 'upgrade' && gold && power && cost && gold.current >= cost.current) {
              gold.current -= cost.current; power.current += 1; clamp(gold); clamp(power);
            }
          }
          pending.length = 0;

          if (cost && power) { cost.current = power.current * 10; clamp(cost); } // 升级花费随采矿力联动
        },
      },
    ],
  });
}

export function buildUiWorldBlueprint(pending: string[]): WorldBlueprint {
  return {
    capabilities: [economyCapability(pending)],
    entities: {
      'r-energy': { Resource: { id: 'energy', current: 30, min: 0, max: 50 } },
      'r-gold': { Resource: { id: 'gold', current: 0, min: 0, max: 9_999_999 } },
      'r-power': { Resource: { id: 'power', current: 1, min: 1, max: 99 } },
      'r-cost': { Resource: { id: 'cost', current: 10, min: 0, max: 9_999_999 } },
    },
  };
}
