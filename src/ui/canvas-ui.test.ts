import { describe, it, expect } from 'vitest';
import { CanvasUI } from './canvas-ui.js';
import { DEFAULT_THEME } from './theme.js';
import { layoutTree } from './layout.js';
import type { LayoutNode } from './components/types.js';

// 假 2D 上下文：实现 CanvasUI 用到的方法，记录绘制调用。无需真画布即可验证"有绘制 + 命中可点"。
function fakeCtx() {
  const calls = { fillRect: 0, fillText: 0, strokeRect: 0, save: 0, restore: 0 };
  const ctx = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '',
    textAlign: 'left' as CanvasTextAlign, textBaseline: 'alphabetic' as CanvasTextBaseline,
    save() { calls.save++; }, restore() { calls.restore++; },
    fillRect() { calls.fillRect++; }, strokeRect() { calls.strokeRect++; },
    fillText() { calls.fillText++; }, clearRect() {}, scale() {},
    beginPath() {}, moveTo() {}, lineTo() {}, arcTo() {}, arc() {}, closePath() {},
    rect() {}, fill() { calls.fillRect++; }, stroke() { calls.strokeRect++; },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

const tree: LayoutNode = {
  type: 'Screen', id: 'r', props: {},
  layout: { padding: 10, gap: 8 },
  children: [
    { type: 'Label', id: 'title', props: { text: '标题', size: 'lg', bold: true } },
    {
      type: 'Panel', id: 'pnl', props: { title: '面板' },
      layout: { gap: 8, padding: 10 },
      children: [
        { type: 'Button', id: 'go', props: { label: '开始', action: 'start', actionArg: 'lvl1' }, layout: { height: 40 } },
        { type: 'Badge', id: 'bd', props: { text: 'NEW', tone: 'ok' }, layout: { width: 80 } },
      ],
    },
  ],
};

describe('CanvasUI', () => {
  it('render 绘制背景/文本（fillRect 与 fillText 均被调用）', () => {
    const { ctx, calls } = fakeCtx();
    const ui = new CanvasUI(ctx, DEFAULT_THEME);
    ui.render(tree, { x: 0, y: 0, w: 320, h: 480 });
    expect(calls.fillRect).toBeGreaterThan(0); // Screen/Panel/Button/Badge 底
    expect(calls.fillText).toBeGreaterThan(0); // 标题/按钮/徽章文本
    expect(calls.save).toBe(1);
    expect(calls.restore).toBe(1);
  });

  it('hit 在按钮矩形内命中其 action+arg', () => {
    const { ctx } = fakeCtx();
    const ui = new CanvasUI(ctx, DEFAULT_THEME);
    const viewport = { x: 0, y: 0, w: 320, h: 480 };
    ui.render(tree, viewport);
    // 用同一布局算出按钮中心。
    const laid = layoutTree(tree, viewport);
    const go = laid.find((l) => l.node.id === 'go')!;
    expect(ui.hit(go.x + go.w / 2, go.y + go.h / 2)).toEqual({ kind: 'action', action: 'start', arg: 'lvl1' });
    // 空白处（远离任何可点控件）命中空。
    expect(ui.hit(go.x + go.w / 2, viewport.h - 1)).toBeNull();
  });
});
