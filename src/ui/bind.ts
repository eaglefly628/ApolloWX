import type { LayoutNode, LabelProps, ProgressBarProps } from './components/types.js';

// §4 世界绑定 —— 把"绑了 Resource id 的 UI 节点"按当前世界值解析成可显示的纯数据树。
// 红线：节点里只出现 `bind: string`（Resource id），绝不收自由表达式/取值函数。读值由 read 注入
// （宿主用引擎 world 实现），本函数是纯转换：同样的树 + 同样的 read → 同样的输出。

export interface ResourceView {
  current: number;
  max: number;
}

export type ResourceReader = (resourceId: string) => ResourceView | null;

// 遍历树，对设了 bind 的 Label/ProgressBar 填入当前世界值。返回新树（不改原树）。
export function resolveBindings(node: LayoutNode, read: ResourceReader): LayoutNode {
  let props = node.props;

  if (node.type === 'Label') {
    const p = node.props as LabelProps;
    if (p.bind) {
      const r = read(p.bind);
      // text 作前缀（如 "金币："），追加 current；无值显示占位。
      props = { ...p, text: `${p.text}${r ? formatNum(r.current) : '—'}` } as LabelProps;
    }
  } else if (node.type === 'ProgressBar') {
    const p = node.props as ProgressBarProps;
    if (p.bind) {
      const r = read(p.bind);
      props = { ...p, value: r ? r.current : 0, max: r ? r.max : (p.max ?? 1) } as ProgressBarProps;
    }
  }

  const children = node.children?.map((c) => resolveBindings(c, read));
  return children ? { ...node, props, children } : { ...node, props };
}

// 大数易读化（1234 → 1,234）。纯展示。
function formatNum(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}
