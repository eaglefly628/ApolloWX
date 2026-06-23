import { describe, it, expect } from 'vitest';
import { layoutTree, hitTest, type LaidOut } from './layout.js';
import type { LayoutNode } from './components/types.js';

const find = (laid: LaidOut[], id: string) => laid.find((l) => l.node.id === id)!;

describe('layout', () => {
  it('Screen 根铺满视口', () => {
    const root: LayoutNode = { type: 'Screen', id: 'r', props: {} };
    const laid = layoutTree(root, { x: 0, y: 0, w: 375, h: 667 });
    expect(find(laid, 'r')).toMatchObject({ x: 0, y: 0, w: 375, h: 667 });
  });

  it('column 顺序堆叠子项并计入 gap/padding', () => {
    const root: LayoutNode = {
      type: 'Panel', id: 'p', props: {},
      layout: { padding: 10, gap: 6, direction: 'column' },
      children: [
        { type: 'Button', id: 'a', props: { label: 'A' } }, // h=42
        { type: 'Button', id: 'b', props: { label: 'B' } },
      ],
    };
    const laid = layoutTree(root, { x: 0, y: 0, w: 200, h: 400 });
    const a = find(laid, 'a');
    const b = find(laid, 'b');
    expect(a).toMatchObject({ x: 10, y: 10, w: 180, h: 42 });
    expect(b.y).toBe(10 + 42 + 6); // 上一项底 + gap
    expect(b.w).toBe(180); // 交叉轴拉伸到内容宽
  });

  it('row 用 flex 均分剩余主轴', () => {
    const root: LayoutNode = {
      type: 'Panel', id: 'p', props: {},
      layout: { direction: 'row', padding: 0, gap: 10, height: 42 },
      children: [
        { type: 'Button', id: 'x', props: { label: 'X' }, layout: { flex: 1 } },
        { type: 'Button', id: 'y', props: { label: 'Y' }, layout: { flex: 1 } },
      ],
    };
    const laid = layoutTree(root, { x: 0, y: 0, w: 210, h: 42 });
    const x = find(laid, 'x');
    const y = find(laid, 'y');
    expect(x.w).toBeCloseTo(100); // (210 - gap10)/2
    expect(y.w).toBeCloseTo(100);
    expect(y.x).toBeCloseTo(110); // 100 + gap10
  });

  it('grid 按 minCol 算列数', () => {
    const kids: LayoutNode[] = Array.from({ length: 4 }, (_, i) => ({ type: 'Badge', id: `g${i}`, props: { text: '' } }));
    const root: LayoutNode = {
      type: 'Panel', id: 'p', props: {},
      layout: { direction: 'grid', minCol: 90, gap: 10, padding: 0 },
      children: kids,
    };
    const laid = layoutTree(root, { x: 0, y: 0, w: 200, h: 400 });
    // 内容宽 200，(200+10)/(90+10)=2.1 → 2 列。第 3 项应换到第二行、与第 1 项同 x。
    expect(find(laid, 'g2').x).toBeCloseTo(find(laid, 'g0').x);
    expect(find(laid, 'g2').y).toBeGreaterThan(find(laid, 'g0').y);
  });

  it('hitTest 返回最上层可点节点的 action（disabled 跳过）', () => {
    const root: LayoutNode = {
      type: 'Screen', id: 'r', props: {},
      layout: { padding: 0, gap: 0 },
      children: [
        { type: 'Button', id: 'ok', props: { label: 'OK', action: 'go', actionArg: '7' }, layout: { height: 40 } },
        { type: 'Button', id: 'no', props: { label: 'NO', action: 'nope', disabled: true }, layout: { height: 40 } },
      ],
    };
    const laid = layoutTree(root, { x: 0, y: 0, w: 100, h: 200 });
    const okBox = find(laid, 'ok');
    expect(hitTest(laid, okBox.x + 5, okBox.y + 5)).toEqual({ action: 'go', arg: '7' });
    const noBox = find(laid, 'no');
    expect(hitTest(laid, noBox.x + 5, noBox.y + 5)).toBeNull(); // disabled
  });
});
