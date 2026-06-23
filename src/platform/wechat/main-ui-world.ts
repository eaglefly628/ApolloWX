// 微信小游戏入口（UI 即游戏 · §4 世界绑定 demo）。
// 整屏都是数据驱动 UI，但它绑在一个**活的 ECS 世界**上：放置挖矿小游戏。
// 引擎每 tick 跑经济系统（能量回复/采矿产金/升级提效）→ engine.subscribe 触发 UI 重绘 →
// 绑定节点（bind: Resource id）自动反映最新数值。点按钮 → 信号入队 → 系统结算 → UI 变。
// 这就是"把 UI 当成一个游戏"：UI 是表现 + 输入，世界是确定性状态机。

import { Engine } from '@runtime/engine.js';
import { createWechatUI } from './ui.js';
import { buildUiWorldBlueprint } from '../../assembly/ui-world.assembly.js';
import type { LayoutNode } from '@ui/components/types.js';
import type { Resource } from '@engine/protocol/components.js';

const g = globalThis as unknown as { performance?: { now(): number } };
if (typeof g.performance === 'undefined' || typeof g.performance.now !== 'function') {
  g.performance = { now: () => Date.now() };
}

// UI 点击压入的信号队列；经济系统每 tick 消费。
const pending: string[] = [];

const engine = new Engine({ tickRate: 30 });
engine.load(buildUiWorldBlueprint(pending));

// 世界绑定读值器：按 Resource id 在 world 里找当前值。
const read = (id: string): { current: number; max: number } | null => {
  for (const [eid] of engine.world.query('Resource')) {
    const r = engine.world.getComponent<Resource>(eid, 'Resource');
    if (r && r.id === id) return { current: r.current, max: r.max };
  }
  return null;
};

// UI = 纯数据。带 bind 的节点由 read 实时填值。事件只走信号名。
const root: LayoutNode = {
  type: 'Screen', id: 'root', props: {}, layout: { padding: 16, gap: 14 },
  children: [
    { type: 'Label', id: 'title', props: { text: '⛏  放置矿场（UI 即游戏）', size: 'lg', color: 'text', bold: true } },
    {
      type: 'Panel', id: 'stats', props: { title: '资产' }, layout: { gap: 12, padding: 14 },
      children: [
        { type: 'Label', id: 'gold', props: { text: '金币　', bind: 'gold', size: 'xl', color: 'gold', bold: true } },
        { type: 'Label', id: 'power', props: { text: '采矿力　', bind: 'power', size: 'md', color: 'jade' } },
        { type: 'Label', id: 'el', props: { text: '能量', size: 'sm', color: 'sub' } },
        { type: 'ProgressBar', id: 'energy', props: { value: 0, bind: 'energy', tone: 'ok', showValue: true }, layout: { height: 20 } },
      ],
    },
    {
      type: 'Panel', id: 'ops', props: { title: '操作' }, layout: { gap: 12, padding: 14 },
      children: [
        { type: 'Button', id: 'mine', props: { label: '采矿（−5 能量，+采矿力 金）', kind: 'primary', action: 'mine' }, layout: { height: 48 } },
        { type: 'Divider', id: 'd', props: {} },
        { type: 'Label', id: 'cost', props: { text: '升级花费　', bind: 'cost', size: 'sm', color: 'sub' } },
        { type: 'Button', id: 'up', props: { label: '升级采矿力', kind: 'ghost', action: 'upgrade' }, layout: { height: 44 } },
      ],
    },
    { type: 'Label', id: 'hint', props: { text: '能量随时间回复；攒金币升级、采矿力越高每次产金越多。', size: 'xs', color: 'dim' } },
  ],
};

const app = createWechatUI({
  root,
  bind: read,
  handlers: {
    mine: () => { pending.push('mine'); app.toast('采矿！', 'accent'); },
    upgrade: () => { pending.push('upgrade'); },
  },
});

// 世界每帧变 → 刷新绑定 UI。
engine.subscribe(() => app.refresh());
engine.start();
