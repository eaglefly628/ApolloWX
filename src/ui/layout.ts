import type {
  LayoutNode, LabelProps, TableProps, RadioGroupProps, TabsProps, ModalProps,
} from './components/types.js';

// 纯布局引擎：把 LayoutNode 树（数据）算成每个节点的绝对矩形（像素）。无 canvas / 无 DOM → node 可单测。
// 支持：row|column|grid、flex 主轴分配、gap、padding、绝对定位、显式尺寸、Panel 标题、Tabs 激活页、Modal 居中浮层。
// CanvasUI 拿这份 rect 列表逐个绘制；hit-test 也用它。

export interface Rect { x: number; y: number; w: number; h: number }
export interface LaidOut { node: LayoutNode; x: number; y: number; w: number; h: number }
export interface LayoutOpts {
  /** Tabs 当前激活页：nodeId → tabId。缺省取 props.active 或第一页。 */
  activeTab?: Record<string, string>;
}

const PAD = 12;
const GAP = 8;
const TITLE_H = 28;
const TAB_H = 40; // Tabs 头部条高
const MODAL_W: Record<string, number> = { sm: 280, md: 360, lg: 440 };

const CONTAINER = new Set(['Screen', 'Panel', 'Modal', 'Tabs']);
function isContainer(t: string): boolean {
  return CONTAINER.has(t);
}
function hasTitle(node: LayoutNode): boolean {
  return (node.type === 'Panel' || node.type === 'Modal') &&
    typeof (node.props as { title?: string }).title === 'string';
}
function flowKids(node: LayoutNode): LayoutNode[] {
  return (node.children ?? []).filter((c) => c.layout?.x === undefined && c.layout?.y === undefined);
}
function absKids(node: LayoutNode): LayoutNode[] {
  return (node.children ?? []).filter((c) => c.layout?.x !== undefined || c.layout?.y !== undefined);
}

// 叶控件自然高度（无文本测量，按类型给稳定缺省）。
function leafHeight(node: LayoutNode): number {
  switch (node.type) {
    case 'Label': {
      const p = node.props as LabelProps;
      return { xs: 18, sm: 22, md: 26, lg: 34, xl: 44 }[p.size ?? 'md'];
    }
    case 'Button': return 42;
    case 'Badge': case 'Tag': case 'Toast': return 28;
    case 'Divider': return 9;
    case 'ProgressBar': return 20;
    case 'Checkbox': case 'Toggle': return 30;
    case 'Dropdown': case 'Input': return 40;
    case 'Slider': return 46;
    case 'RadioGroup': {
      const p = node.props as RadioGroupProps;
      return p.options.length * 30 + 4;
    }
    case 'Image': return node.layout?.height ?? 96;
    case 'Table': {
      const p = node.props as TableProps;
      return (p.title ? 26 : 0) + 30 + Math.max(1, p.rows.length) * 30;
    }
    default: return 28;
  }
}

function leafWidth(node: LayoutNode): number {
  switch (node.type) {
    case 'Button': return 120;
    case 'Badge': case 'Tag': return 72;
    default: return 96;
  }
}

// Tabs 当前激活页索引。
function activeIndex(node: LayoutNode, opts: LayoutOpts): number {
  const p = node.props as TabsProps;
  const active = opts.activeTab?.[node.id] ?? p.active ?? p.tabs[0]?.id;
  const i = p.tabs.findIndex((t) => t.id === active);
  return i < 0 ? 0 : i;
}

export function layoutTree(root: LayoutNode, viewport: Rect, opts: LayoutOpts = {}): LaidOut[] {
  const out: LaidOut[] = [];

  function measureH(node: LayoutNode, availW: number): number {
    if (node.layout?.height !== undefined) return node.layout.height;
    if (node.type === 'Modal') return viewport.h; // 浮层覆盖全屏
    if (!isContainer(node.type)) return leafHeight(node);

    const pad = node.layout?.padding ?? PAD;
    const gap = node.layout?.gap ?? GAP;
    const dir = node.layout?.direction ?? 'column';
    const titleH = hasTitle(node) ? TITLE_H : 0;
    const tabH = node.type === 'Tabs' ? TAB_H : 0;
    const cw = (node.layout?.width ?? availW) - 2 * pad;

    if (node.type === 'Tabs') {
      const kids = node.children ?? [];
      const page = kids[activeIndex(node, opts)];
      return 2 * pad + tabH + (page ? measureH(page, cw) : 0);
    }

    const kids = flowKids(node);
    if (kids.length === 0) return 2 * pad + titleH + 8;
    if (dir === 'row') return 2 * pad + titleH + Math.max(...kids.map((k) => measureH(k, cw)));
    if (dir === 'grid') {
      const minCol = node.layout?.minCol ?? 96;
      const cols = Math.max(1, Math.floor((cw + gap) / (minCol + gap)));
      const rows = Math.ceil(kids.length / cols);
      const cellH = Math.max(...kids.map((k) => measureH(k, cw / cols)));
      return 2 * pad + titleH + rows * cellH + (rows - 1) * gap;
    }
    const sum = kids.reduce((a, k) => a + measureH(k, cw), 0);
    return 2 * pad + titleH + sum + (kids.length - 1) * gap;
  }

  function place(node: LayoutNode, x: number, y: number, w: number, h: number): void {
    // Modal：忽略 flow 尺寸，居中浮层（rect = 居中盒；scrim 由 CanvasUI 按 viewport 铺）。
    if (node.type === 'Modal') {
      const p = node.props as ModalProps;
      const bw = MODAL_W[p.size ?? 'md'];
      const pad = node.layout?.padding ?? PAD;
      const gap = node.layout?.gap ?? GAP;
      const kids = flowKids(node);
      const titleH = hasTitle(node) ? TITLE_H : 0;
      const innerW = bw - 2 * pad;
      const bodyH = kids.reduce((a, k) => a + measureH(k, innerW), 0) + Math.max(0, kids.length - 1) * gap;
      const bh = 2 * pad + titleH + bodyH;
      const bx = viewport.x + (viewport.w - bw) / 2;
      const by = viewport.y + (viewport.h - bh) / 2;
      out.push({ node, x: bx, y: by, w: bw, h: bh });
      let py = by + pad + titleH;
      for (const k of kids) {
        const kh = measureH(k, innerW);
        place(k, bx + pad, py, innerW, kh);
        py += kh + gap;
      }
      return;
    }

    out.push({ node, x, y, w, h });
    if (!isContainer(node.type)) return;

    const pad = node.layout?.padding ?? PAD;
    const gap = node.layout?.gap ?? GAP;
    const dir = node.layout?.direction ?? 'column';
    const titleH = hasTitle(node) ? TITLE_H : 0;
    const tabH = node.type === 'Tabs' ? TAB_H : 0;
    const cx = x + pad;
    const cy = y + pad + titleH + tabH;
    const cw = w - 2 * pad;
    const ch = h - 2 * pad - titleH - tabH;

    // Tabs：头部条之下只铺激活页。
    if (node.type === 'Tabs') {
      const page = (node.children ?? [])[activeIndex(node, opts)];
      if (page) place(page, cx, cy, cw, ch);
      return;
    }

    for (const c of absKids(node)) {
      const cwid = c.layout?.width ?? leafWidth(c);
      const chei = c.layout?.height ?? measureH(c, cwid);
      place(c, cx + (c.layout?.x ?? 0), cy + (c.layout?.y ?? 0), cwid, chei);
    }

    const kids = flowKids(node);
    if (kids.length === 0) return;

    if (dir === 'grid') {
      const minCol = node.layout?.minCol ?? 96;
      const cols = Math.max(1, Math.floor((cw + gap) / (minCol + gap)));
      const cellW = (cw - (cols - 1) * gap) / cols;
      const cellH = Math.max(...kids.map((k) => measureH(k, cellW)));
      kids.forEach((k, i) => {
        place(k, cx + (i % cols) * (cellW + gap), cy + Math.floor(i / cols) * (cellH + gap), cellW, cellH);
      });
      return;
    }

    if (dir === 'row') {
      const flexTotal = kids.reduce((a, k) => a + (k.layout?.flex ?? 0), 0);
      const fixedW = kids.reduce((a, k) => a + (k.layout?.flex ? 0 : (k.layout?.width ?? leafWidth(k))), 0);
      const remain = Math.max(0, cw - fixedW - gap * (kids.length - 1));
      let px = cx;
      for (const k of kids) {
        const kw = k.layout?.flex ? (flexTotal ? remain * (k.layout.flex / flexTotal) : 0) : (k.layout?.width ?? leafWidth(k));
        place(k, px, cy, kw, ch);
        px += kw + gap;
      }
      return;
    }

    // column
    const flexTotal = kids.reduce((a, k) => a + (k.layout?.flex ?? 0), 0);
    const fixedH = kids.reduce((a, k) => a + (k.layout?.flex ? 0 : measureH(k, cw)), 0);
    const remain = Math.max(0, ch - fixedH - gap * (kids.length - 1));
    let py = cy;
    for (const k of kids) {
      const kh = k.layout?.flex ? (flexTotal ? remain * (k.layout.flex / flexTotal) : 0) : measureH(k, cw);
      place(k, cx, py, k.layout?.width ?? cw, kh);
      py += kh + gap;
    }
  }

  place(root, viewport.x, viewport.y, root.layout?.width ?? viewport.w, root.layout?.height ?? viewport.h);
  return out;
}

// 命中测试：返回最上层（后绘制）带 action 的节点（disabled 跳过）。Tabs/Modal/输入类的交互由 CanvasUI 的热区处理。
export function hitTest(laid: readonly LaidOut[], px: number, py: number): { action: string; arg?: string } | null {
  for (let i = laid.length - 1; i >= 0; i--) {
    const l = laid[i];
    if (px < l.x || px > l.x + l.w || py < l.y || py > l.y + l.h) continue;
    const p = l.node.props as { action?: string; actionArg?: string; disabled?: boolean };
    if (p.action && !p.disabled) return { action: p.action, arg: p.actionArg };
  }
  return null;
}

export { TAB_H };
