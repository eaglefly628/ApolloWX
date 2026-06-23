// 微信小游戏入口（数据驱动 UI demo）。
// 证明同一套 LayoutNode 数据 + CanvasUI 解释器在微信无 DOM 环境跑通：一个计数器面板，
// 点 +/−/重置 按钮 → 改数据 → setRoot 重绘。事件只走"信号名字符串"，回调在 handlers 里写。

import { createWechatUI } from './ui.js';
import type { LayoutNode } from '@ui/components/types.js';

const g = globalThis as unknown as { performance?: { now(): number } };
if (typeof g.performance === 'undefined' || typeof g.performance.now !== 'function') {
  g.performance = { now: () => Date.now() };
}

let count = 0;

// UI = 纯数据（弱模型可填）。计数随 count 变化重建。
function buildUI(n: number): LayoutNode {
  return {
    type: 'Screen',
    id: 'root',
    props: { center: true },
    layout: { padding: 18, gap: 14 },
    children: [
      { type: 'Label', id: 'h', props: { text: 'ApolloWX · 数据驱动 UI', size: 'lg', color: 'text', bold: true } },
      {
        type: 'Panel',
        id: 'counter',
        props: { title: '计数器' },
        layout: { gap: 12, padding: 14 },
        children: [
          { type: 'Label', id: 'val', props: { text: `当前值：${n}`, size: 'xl', color: 'jade', bold: true } },
          { type: 'ProgressBar', id: 'pb', props: { value: ((n % 10) + 10) % 10, max: 10, tone: 'ok' }, layout: { height: 20 } },
          {
            type: 'Panel',
            id: 'row',
            props: {},
            layout: { direction: 'row', gap: 10, padding: 0, height: 42 },
            children: [
              { type: 'Button', id: 'dec', props: { label: '−1', kind: 'ghost', action: 'dec' }, layout: { flex: 1 } },
              { type: 'Button', id: 'rst', props: { label: '重置', kind: 'quiet', action: 'reset' }, layout: { flex: 1 } },
              { type: 'Button', id: 'inc', props: { label: '+1', kind: 'primary', action: 'inc' }, layout: { flex: 1 } },
            ],
          },
          { type: 'Divider', id: 'd', props: {} },
          { type: 'Badge', id: 'b', props: { text: n % 2 === 0 ? '偶数' : '奇数', tone: n % 2 === 0 ? 'ok' : 'warn' }, layout: { width: 96 } },
        ],
      },
      {
        type: 'Table',
        id: 'log',
        props: {
          title: '说明',
          columns: [
            { key: 'k', label: '控件', align: 'left' },
            { key: 'v', label: '状态', align: 'right' },
          ],
          rows: [
            { id: 'r1', cells: { k: 'Button', v: '点击 → 信号' } },
            { id: 'r2', cells: { k: 'ProgressBar', v: `${((n % 10) + 10) % 10}/10` }, tone: 'accent' },
            { id: 'r3', cells: { k: 'Badge', v: n % 2 === 0 ? '偶' : '奇' }, tone: 'dim' },
          ],
        },
        layout: { height: 140 },
      },
    ],
  };
}

const app = createWechatUI({
  root: buildUI(count),
  handlers: {
    inc: () => { count += 1; app.setRoot(buildUI(count)); },
    dec: () => { count -= 1; app.setRoot(buildUI(count)); },
    reset: () => { count = 0; app.setRoot(buildUI(count)); },
  },
});
