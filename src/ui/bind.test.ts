import { describe, it, expect } from 'vitest';
import { resolveBindings } from './bind.js';
import type { LayoutNode, LabelProps, ProgressBarProps } from './components/types.js';

const read = (id: string) =>
  id === 'gold' ? { current: 1234, max: 9999 } : id === 'energy' ? { current: 30, max: 50 } : null;

describe('resolveBindings (§4 世界绑定)', () => {
  it('Label.bind → text 前缀 + 格式化的 current', () => {
    const tree: LayoutNode = { type: 'Label', id: 'g', props: { text: '金币：', bind: 'gold' } };
    const out = resolveBindings(tree, read);
    expect((out.props as LabelProps).text).toBe('金币：1,234');
  });

  it('ProgressBar.bind → value/max 取自世界', () => {
    const tree: LayoutNode = { type: 'ProgressBar', id: 'e', props: { value: 0, bind: 'energy' } };
    const out = resolveBindings(tree, read);
    expect(out.props as ProgressBarProps).toMatchObject({ value: 30, max: 50 });
  });

  it('缺失资源 → Label 占位 — / 进度 0', () => {
    const tree: LayoutNode = {
      type: 'Screen', id: 'r', props: {},
      children: [
        { type: 'Label', id: 'x', props: { text: '未知：', bind: 'nope' } },
        { type: 'ProgressBar', id: 'y', props: { value: 5, bind: 'nope' } },
      ],
    };
    const out = resolveBindings(tree, read);
    expect((out.children![0].props as LabelProps).text).toBe('未知：—');
    expect((out.children![1].props as ProgressBarProps).value).toBe(0);
  });

  it('不改原树（返回新树）', () => {
    const tree: LayoutNode = { type: 'Label', id: 'g', props: { text: '金币：', bind: 'gold' } };
    resolveBindings(tree, read);
    expect((tree.props as LabelProps).text).toBe('金币：'); // 原树未被改
  });

  it('无 bind 的节点原样透传', () => {
    const tree: LayoutNode = { type: 'Label', id: 'p', props: { text: '静态' } };
    expect((resolveBindings(tree, read).props as LabelProps).text).toBe('静态');
  });
});
