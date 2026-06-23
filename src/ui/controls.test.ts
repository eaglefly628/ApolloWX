import { describe, it, expect } from 'vitest';
import { CanvasUI } from './canvas-ui.js';
import { DEFAULT_THEME } from './theme.js';
import { layoutTree } from './layout.js';
import type { LayoutNode } from './components/types.js';

// 假 2D 上下文（记录无关紧要，只需方法存在）。
function fakeCtx() {
  const noop = () => {};
  const ctx = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '',
    textAlign: 'left' as CanvasTextAlign, textBaseline: 'alphabetic' as CanvasTextBaseline,
    save: noop, restore: noop, fillRect: noop, strokeRect: noop, fillText: noop,
    clearRect: noop, scale: noop, beginPath: noop, arc: noop, fill: noop, stroke: noop,
    drawImage: noop, measureText: () => ({ width: 40 }) as TextMetrics,
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

const VP = { x: 0, y: 0, w: 360, h: 640 };
const ui = () => new CanvasUI(fakeCtx(), DEFAULT_THEME);

describe('交互控件 — 热区命中', () => {
  it('Checkbox 命中返回 toggle + 取反值', () => {
    const tree: LayoutNode = { type: 'Screen', id: 'r', props: {}, layout: { padding: 0 }, children: [
      { type: 'Checkbox', id: 'c', props: { label: '同意', checked: false, action: 'agree' } },
    ] };
    const u = ui(); u.render(tree, VP);
    const box = layoutTree(tree, VP).find((l) => l.node.id === 'c')!;
    expect(u.hit(box.x + 5, box.y + box.h / 2)).toEqual({ kind: 'toggle', action: 'agree', next: true });
  });

  it('RadioGroup 命中第二项返回其 value', () => {
    const tree: LayoutNode = { type: 'Screen', id: 'r', props: {}, layout: { padding: 0 }, children: [
      { type: 'RadioGroup', id: 'g', props: { name: 'd', value: 'a', action: 'pick', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] } },
    ] };
    const u = ui(); u.render(tree, VP);
    const box = layoutTree(tree, VP).find((l) => l.node.id === 'g')!;
    expect(u.hit(box.x + 5, box.y + 45)).toEqual({ kind: 'radio', action: 'pick', value: 'b' }); // 第二行(30~60)
  });

  it('Slider 命中返回 slider 轨道参数', () => {
    const tree: LayoutNode = { type: 'Screen', id: 'r', props: {}, layout: { padding: 0 }, children: [
      { type: 'Slider', id: 's', props: { min: 0, max: 100, step: 5, value: 20, action: 'vol' }, layout: { height: 46 } },
    ] };
    const u = ui(); u.render(tree, VP);
    const box = layoutTree(tree, VP).find((l) => l.node.id === 's')!;
    const hit = u.hit(box.x + 20, box.y + 30);
    expect(hit?.kind).toBe('slider');
    if (hit?.kind === 'slider') { expect(hit.max).toBe(100); expect(hit.step).toBe(5); }
  });

  it('Dropdown 命中返回 dropdown；展开后命中选项返回 action(value)', () => {
    const tree: LayoutNode = { type: 'Screen', id: 'r', props: {}, layout: { padding: 0 }, children: [
      { type: 'Dropdown', id: 'dd', props: { action: 'lang', options: [{ value: 'zh', label: '中文' }, { value: 'en', label: 'EN' }] }, layout: { height: 40 } },
    ] };
    const u = ui(); u.render(tree, VP);
    const box = layoutTree(tree, VP).find((l) => l.node.id === 'dd')!;
    expect(u.hit(box.x + 5, box.y + 5)).toEqual({ kind: 'dropdown', id: 'dd' });
    // 展开重绘后，下方第一项命中 → action(value)
    u.render(tree, VP, { openDropdown: 'dd' });
    expect(u.hit(box.x + 5, box.y + box.h + 2 + 18)).toEqual({ kind: 'action', action: 'lang', arg: 'zh' });
  });

  it('Tabs 头部命中返回 {tab}；只布局激活页', () => {
    const tree: LayoutNode = {
      type: 'Tabs', id: 't', props: { tabs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] },
      children: [
        { type: 'Label', id: 'pa', props: { text: 'PA' } },
        { type: 'Label', id: 'pb', props: { text: 'PB' } },
      ],
    };
    const u = ui(); u.render(tree, VP);
    // 头部右半 = 第二个 tab
    const hit = u.hit(VP.w * 0.75, 10);
    expect(hit).toEqual({ kind: 'tab', tabsId: 't', tabId: 'b' });
    // 默认只铺第一页 pa，不铺 pb
    const laid = layoutTree(tree, VP);
    expect(laid.some((l) => l.node.id === 'pa')).toBe(true);
    expect(laid.some((l) => l.node.id === 'pb')).toBe(false);
    // 指定 active=b → 铺 pb
    const laid2 = layoutTree(tree, VP, { activeTab: { t: 'b' } });
    expect(laid2.some((l) => l.node.id === 'pb')).toBe(true);
  });

  it('Modal 居中且遮罩命中 modalClose', () => {
    const tree: LayoutNode = {
      type: 'Modal', id: 'm', props: { title: '嘿', size: 'md', closeAction: 'close' },
      children: [{ type: 'Label', id: 'mx', props: { text: 'hi' } }],
    };
    const u = ui(); u.render(tree, VP);
    const box = layoutTree(tree, VP).find((l) => l.node.id === 'm')!;
    expect(box.w).toBe(360); // md
    expect(box.x).toBeCloseTo((VP.w - 360) / 2);
    // 遮罩左上角（盒外）→ 关闭
    expect(u.hit(2, 2)).toEqual({ kind: 'modalClose', action: 'close' });
    // 盒身（无子控件处）→ absorb（不关闭）
    expect(u.hit(box.x + box.w / 2, box.y + box.h - 4)).toEqual({ kind: 'absorb' });
  });
});
