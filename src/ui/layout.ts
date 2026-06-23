import type { LayoutNode, LabelProps, TableProps } from './components/types.js';

// 纯布局引擎：把 LayoutNode 树（数据）算成每个节点的绝对矩形（像素）。无 canvas / 无 DOM → node 可单测。
// 支持：direction row|column|grid、flex 主轴分配、gap、padding、绝对定位(x/y)、显式 width/height、Panel 标题留白。
// CanvasUI 拿这份 rect 列表逐个绘制；hit-test 也用它。

export interface Rect { x: number; y: number; w: number; h: number }
export interface LaidOut { node: LayoutNode; x: number; y: number; w: number; h: number }

const PAD = 12; // 容器默认内边距
const GAP = 8; // 子项默认间距
const TITLE_H = 28; // Panel/Modal 标题条高

const CONTAINER = new Set(['Screen', 'Panel', 'Modal']);
function isContainer(t: string): boolean {
  return CONTAINER.has(t);
}

// 叶控件的自然高度（无文本测量，按类型给稳定缺省）。
function leafHeight(node: LayoutNode): number {
  switch (node.type) {
    case 'Label': {
      const p = node.props as LabelProps;
      return { xs: 18, sm: 22, md: 26, lg: 34, xl: 44 }[p.size ?? 'md'];
    }
    case 'Button': return 42;
    case 'Badge': case 'Tag': return 26;
    case 'Divider': return 9;
    case 'ProgressBar': return 20;
    case 'Image': return node.layout?.height ?? 96;
    case 'Table': {
      const p = node.props as TableProps;
      return (p.title ? 26 : 0) + 30 + Math.max(1, p.rows.length) * 30;
    }
    default: return 28;
  }
}

// 叶控件在 row 排布里的自然宽度（缺省，flex 会再扩展）。
function leafWidth(node: LayoutNode): number {
  switch (node.type) {
    case 'Button': return 120;
    case 'Badge': case 'Tag': return 72;
    case 'Label': return 96;
    default: return 96;
  }
}

// 自然高度（含容器递归）。availW 用于 grid 列数估算。
function measureH(node: LayoutNode, availW: number): number {
  if (node.layout?.height !== undefined) return node.layout.height;
  if (!isContainer(node.type)) return leafHeight(node);

  const pad = node.layout?.padding ?? PAD;
  const gap = node.layout?.gap ?? GAP;
  const dir = node.layout?.direction ?? 'column';
  const titleH = hasTitle(node) ? TITLE_H : 0;
  const cw = (node.layout?.width ?? availW) - 2 * pad;
  const kids = flowChildren(node);
  if (kids.length === 0) return 2 * pad + titleH + 8;

  if (dir === 'row') {
    const h = Math.max(...kids.map((k) => measureH(k, cw)));
    return 2 * pad + titleH + h;
  }
  if (dir === 'grid') {
    const minCol = node.layout?.minCol ?? 96;
    const cols = Math.max(1, Math.floor((cw + gap) / (minCol + gap)));
    const rows = Math.ceil(kids.length / cols);
    const cellH = Math.max(...kids.map((k) => measureH(k, cw / cols)));
    return 2 * pad + titleH + rows * cellH + (rows - 1) * gap;
  }
  // column
  const sum = kids.reduce((a, k) => a + measureH(k, cw), 0);
  return 2 * pad + titleH + sum + (kids.length - 1) * gap;
}

function hasTitle(node: LayoutNode): boolean {
  return (node.type === 'Panel' || node.type === 'Modal') &&
    typeof (node.props as { title?: string }).title === 'string';
}

function flowChildren(node: LayoutNode): LayoutNode[] {
  return (node.children ?? []).filter((c) => c.layout?.x === undefined && c.layout?.y === undefined);
}
function absChildren(node: LayoutNode): LayoutNode[] {
  return (node.children ?? []).filter((c) => c.layout?.x !== undefined || c.layout?.y !== undefined);
}

// 放置：递归把节点铺成绝对矩形，父在子前（绘制序）。
function place(node: LayoutNode, x: number, y: number, w: number, h: number, out: LaidOut[]): void {
  out.push({ node, x, y, w, h });
  if (!isContainer(node.type)) return;

  const pad = node.layout?.padding ?? PAD;
  const gap = node.layout?.gap ?? GAP;
  const dir = node.layout?.direction ?? 'column';
  const titleH = hasTitle(node) ? TITLE_H : 0;
  const cx = x + pad;
  const cy = y + pad + titleH;
  const cw = w - 2 * pad;
  const ch = h - 2 * pad - titleH;

  // 绝对定位子项：直接落在内容盒内 (x,y) 偏移。
  for (const c of absChildren(node)) {
    const lx = c.layout?.x ?? 0;
    const ly = c.layout?.y ?? 0;
    const cwid = c.layout?.width ?? leafWidth(c);
    const chei = c.layout?.height ?? measureH(c, cwid);
    place(c, cx + lx, cy + ly, cwid, chei, out);
  }

  const kids = flowChildren(node);
  if (kids.length === 0) return;

  if (dir === 'grid') {
    const minCol = node.layout?.minCol ?? 96;
    const cols = Math.max(1, Math.floor((cw + gap) / (minCol + gap)));
    const cellW = (cw - (cols - 1) * gap) / cols;
    const cellH = Math.max(...kids.map((k) => measureH(k, cellW)));
    kids.forEach((k, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      place(k, cx + col * (cellW + gap), cy + row * (cellH + gap), cellW, cellH, out);
    });
    return;
  }

  if (dir === 'row') {
    // 固定宽 + flex 分配剩余主轴。
    const flexTotal = kids.reduce((a, k) => a + (k.layout?.flex ?? 0), 0);
    const fixedW = kids.reduce((a, k) => a + (k.layout?.flex ? 0 : (k.layout?.width ?? leafWidth(k))), 0);
    const remain = Math.max(0, cw - fixedW - gap * (kids.length - 1));
    let px = cx;
    for (const k of kids) {
      const kw = k.layout?.flex ? (flexTotal ? (remain * (k.layout.flex / flexTotal)) : 0) : (k.layout?.width ?? leafWidth(k));
      place(k, px, cy, kw, ch, out);
      px += kw + gap;
    }
    return;
  }

  // column：固定高 + flex 分配剩余主轴；交叉轴拉伸到内容宽。
  const flexTotal = kids.reduce((a, k) => a + (k.layout?.flex ?? 0), 0);
  const fixedH = kids.reduce((a, k) => a + (k.layout?.flex ? 0 : measureH(k, cw)), 0);
  const remain = Math.max(0, ch - fixedH - gap * (kids.length - 1));
  let py = cy;
  for (const k of kids) {
    const kh = k.layout?.flex ? (flexTotal ? (remain * (k.layout.flex / flexTotal)) : 0) : measureH(k, cw);
    const kw = k.layout?.width ?? cw;
    place(k, cx, py, kw, kh, out);
    py += kh + gap;
  }
}

// 把根节点（通常是 Screen）铺到视口，返回绘制序的矩形列表。
export function layoutTree(root: LayoutNode, viewport: Rect): LaidOut[] {
  const out: LaidOut[] = [];
  const w = root.layout?.width ?? viewport.w;
  const h = root.layout?.height ?? viewport.h;
  place(root, viewport.x, viewport.y, w, h, out);
  return out;
}

// 命中测试：返回最上层（后绘制）带 action 的节点的 {action, arg}。供触摸点击用。
export function hitTest(laid: readonly LaidOut[], px: number, py: number): { action: string; arg?: string } | null {
  for (let i = laid.length - 1; i >= 0; i--) {
    const l = laid[i];
    if (px < l.x || px > l.x + l.w || py < l.y || py > l.y + l.h) continue;
    const p = l.node.props as { action?: string; actionArg?: string; disabled?: boolean };
    if (p.action && !p.disabled) return { action: p.action, arg: p.actionArg };
  }
  return null;
}
