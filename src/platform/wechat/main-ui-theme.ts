// 微信小游戏入口（UI 风格化 demo · 实时换肤）。
// 同一份 UI 数据，顶部一排标签切主题 → setTheme 换 UITheme 令牌 → 整屏风格立变（颜色 + 圆角）。
// 证明"风格 = 数据(令牌)，解释器不变"：雅致/赛博/水墨/织锦/樱花五皮。

import { createWechatUI } from './ui.js';
import { THEMES, THEME_LABELS, getTheme } from '@ui/theme.js';
import type { LayoutNode } from '@ui/components/types.js';

const g = globalThis as unknown as { performance?: { now(): number } };
if (typeof g.performance === 'undefined' || typeof g.performance.now !== 'function') {
  g.performance = { now: () => Date.now() };
}

let current = 'dark';

// 顶部主题切换条（Tag 行）；下方是一组代表控件做风格展板。
function buildUI(): LayoutNode {
  const tabs: LayoutNode = {
    type: 'Panel', id: 'switch', props: {}, layout: { direction: 'row', gap: 8, padding: 0, height: 34 },
    children: Object.keys(THEMES).map((id) => ({
      type: 'Tag', id: `t-${id}`, props: { label: THEME_LABELS[id] ?? id, active: id === current, action: 'theme', actionArg: id },
      layout: { flex: 1 },
    })),
  };
  return {
    type: 'Screen', id: 'root', props: {}, layout: { padding: 14, gap: 12 },
    children: [
      { type: 'Label', id: 'h', props: { text: 'UI 风格化 · 实时换肤', size: 'lg', color: 'text', bold: true } },
      tabs,
      {
        type: 'Panel', id: 'demo', props: { title: `当前：${THEME_LABELS[current]}` }, layout: { gap: 12, padding: 14 },
        children: [
          { type: 'Label', id: 'l1', props: { text: '标题文本 Heading', size: 'lg', color: 'text', bold: true } },
          { type: 'Label', id: 'l2', props: { text: '次要说明文字 subtitle', size: 'sm', color: 'sub' } },
          {
            type: 'Panel', id: 'btns', props: {}, layout: { direction: 'row', gap: 10, padding: 0, height: 44 },
            children: [
              { type: 'Button', id: 'b1', props: { label: '主要', kind: 'primary', action: 'noop' }, layout: { flex: 1 } },
              { type: 'Button', id: 'b2', props: { label: '次要', kind: 'ghost', action: 'noop' }, layout: { flex: 1 } },
            ],
          },
          { type: 'ProgressBar', id: 'pb', props: { value: 7, max: 10, tone: 'ok', showValue: true }, layout: { height: 20 } },
          {
            type: 'Panel', id: 'chips', props: {}, layout: { direction: 'row', gap: 8, padding: 0, height: 28 },
            children: [
              { type: 'Badge', id: 'bd1', props: { text: 'OK', tone: 'ok' }, layout: { width: 60 } },
              { type: 'Badge', id: 'bd2', props: { text: 'WARN', tone: 'warn' }, layout: { width: 72 } },
              { type: 'Tag', id: 'tg', props: { label: '强调标签', active: true }, layout: { width: 96 } },
            ],
          },
          { type: 'Toggle', id: 'tg2', props: { label: '开关示例', checked: true } },
          { type: 'Input', id: 'in', props: { placeholder: '输入框示例' }, layout: { height: 40 } },
        ],
      },
    ],
  };
}

const app = createWechatUI({
  root: buildUI(),
  handlers: {
    theme: (id) => { current = id ?? 'dark'; app.setTheme(getTheme(current)); app.setRoot(buildUI()); },
    noop: () => {},
  },
});
