import type {
  LayoutNode, UITheme, LabelProps, ButtonProps, BadgeProps, TagProps,
  PanelProps, ScreenProps, ProgressBarProps, TableProps,
} from './components/types.js';
import { layoutTree, hitTest, type LaidOut, type Rect } from './layout.js';

// CanvasUI —— 数据驱动 UI 的 **canvas 解释器**（微信小游戏等无 DOM 环境用）。
// 与网页版 renderNode(HTML)/mountUI(DOM) 平级：读同一份 LayoutNode 树 + UITheme，画到 Canvas2D，
// 并按上次布局做触摸命中测试 → 返回 {action,arg} 信号。纯表现 + 纯命中，无 sim、无 DOM。
//
// v1 已实现控件：Screen / Panel / Label / Button / Badge / Tag / Divider / ProgressBar / Table。
// 其余（Input/Dropdown/Modal/Toast/Slider/Checkbox…）需更复杂交互，后续按同一套接口补；未知类型安全跳过。

const FONT_PX: Record<string, number> = { xs: 12, sm: 14, md: 16, lg: 22, xl: 30 };

type Ctx = CanvasRenderingContext2D;

export class CanvasUI {
  private laid: LaidOut[] = [];

  constructor(private readonly ctx: Ctx, private readonly theme: UITheme) {}

  /** 布局 + 绘制整棵树到 viewport（默认整块画布）。记录布局供 hit() 用。 */
  render(root: LayoutNode, viewport: Rect): void {
    this.laid = layoutTree(root, viewport);
    const ctx = this.ctx;
    ctx.save();
    ctx.textBaseline = 'middle';
    for (const l of this.laid) this.draw(l);
    ctx.restore();
  }

  /** 触摸命中：返回最上层可点节点的 {action,arg}，无则 null。 */
  hit(px: number, py: number): { action: string; arg?: string } | null {
    return hitTest(this.laid, px, py);
  }

  private color(token: string): string {
    return (this.theme as unknown as Record<string, string>)[token] ?? token;
  }

  private font(px: number, bold = false, mono = false): string {
    return `${bold ? '600 ' : ''}${px}px ${mono ? this.theme.fontMono : this.theme.fontUi}`;
  }

  private text(s: string, x: number, y: number, align: CanvasTextAlign = 'left'): void {
    this.ctx.textAlign = align;
    this.ctx.fillText(s, x, y);
  }

  private fillRect(c: string, x: number, y: number, w: number, h: number): void {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(x, y, w, h);
  }
  private strokeRect(c: string, x: number, y: number, w: number, h: number): void {
    this.ctx.strokeStyle = c;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  private draw(l: LaidOut): void {
    const { node, x, y, w, h } = l;
    const t = this.theme;
    switch (node.type) {
      case 'Screen': {
        const p = node.props as ScreenProps;
        this.fillRect(p.bg ?? t.pageBg, x, y, w, h);
        break;
      }
      case 'Panel': {
        const p = node.props as PanelProps;
        this.fillRect(t.bg1, x, y, w, h);
        this.strokeRect(t.line, x, y, w, h);
        if (p.title) {
          this.ctx.font = this.font(13, true);
          this.ctx.fillStyle = t.sub;
          this.text(p.title, x + 12, y + 15);
          this.fillRect(t.line, x + 1, y + 28, w - 2, 1);
        }
        break;
      }
      case 'Label': {
        const p = node.props as LabelProps;
        this.ctx.font = this.font(FONT_PX[p.size ?? 'md'], p.bold, p.mono);
        this.ctx.fillStyle = this.color(p.color ?? 'text');
        this.text(p.text, x + 2, y + h / 2);
        break;
      }
      case 'Button': {
        const p = node.props as ButtonProps;
        const kind = p.kind ?? 'primary';
        const bg = p.disabled ? 'rgba(255,255,255,0.03)' : kind === 'primary' ? t.jadeWash : kind === 'ghost' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0)';
        const fg = p.disabled ? t.dim : kind === 'primary' ? t.jade : t.sub;
        this.fillRect(bg, x, y, w, h);
        this.strokeRect(kind === 'primary' && !p.disabled ? t.jadeLine : t.line, x, y, w, h);
        this.ctx.font = this.font(15, kind === 'primary');
        this.ctx.fillStyle = fg;
        this.text(p.label, x + w / 2, y + h / 2, 'center');
        break;
      }
      case 'Badge': {
        const p = node.props as BadgeProps;
        const c = p.tone === 'warn' ? t.warn : p.tone === 'dim' ? t.dim : t.ok;
        const wash = p.tone === 'warn' ? t.warnWash : p.tone === 'dim' ? 'rgba(255,255,255,0.04)' : t.okWash;
        this.fillRect(wash, x, y, w, h);
        this.ctx.font = this.font(12, true);
        this.ctx.fillStyle = c;
        this.text(p.text, x + w / 2, y + h / 2, 'center');
        break;
      }
      case 'Tag': {
        const p = node.props as TagProps;
        const active = p.active;
        this.fillRect(active ? t.jadeWash : 'rgba(255,255,255,0.04)', x, y, w, h);
        this.strokeRect(active ? t.jadeLine : t.line, x, y, w, h);
        this.ctx.font = this.font(13, active);
        this.ctx.fillStyle = active ? t.jade : t.sub;
        this.text(p.removable ? `${p.label}  ×` : p.label, x + w / 2, y + h / 2, 'center');
        break;
      }
      case 'Divider':
        this.fillRect(t.line, x, y + Math.floor(h / 2), w, 1);
        break;
      case 'ProgressBar': {
        const p = node.props as ProgressBarProps;
        const max = p.max ?? 1;
        const ratio = Math.max(0, Math.min(1, p.value / (max || 1)));
        const tone = p.tone === 'gold' ? t.gold : p.tone === 'ok' ? t.ok : p.tone === 'warn' ? t.warn : p.tone === 'danger' ? t.danger : t.jade;
        const barY = y + h / 2 - 4;
        this.fillRect(t.bg3, x, barY, w, 8);
        this.fillRect(tone, x, barY, w * ratio, 8);
        break;
      }
      case 'Table':
        this.drawTable(node, x, y, w);
        break;
      default:
        break; // 未实现控件安全跳过
    }
  }

  private drawTable(node: LayoutNode, x: number, y: number, w: number): void {
    const t = this.theme;
    const p = node.props as TableProps;
    let cy = y;
    if (p.title) {
      this.ctx.font = this.font(13, true);
      this.ctx.fillStyle = t.sub;
      this.text(p.title, x + 2, cy + 13);
      cy += 26;
    }
    const cols = p.columns;
    const colW = w / Math.max(1, cols.length);
    // 表头
    this.fillRect(t.bg2, x, cy, w, 30);
    this.ctx.font = this.font(12, true);
    this.ctx.fillStyle = t.dim;
    cols.forEach((c, i) => {
      const align = c.align === 'right' ? 'right' : c.align === 'center' ? 'center' : 'left';
      const tx = align === 'right' ? x + (i + 1) * colW - 8 : align === 'center' ? x + i * colW + colW / 2 : x + i * colW + 8;
      this.text(c.label, tx, cy + 15, align);
    });
    cy += 30;
    // 行
    this.ctx.font = this.font(13);
    for (const row of p.rows) {
      const fg = row.tone === 'accent' ? t.jade : row.tone === 'dim' ? t.dim : t.text;
      cols.forEach((c, i) => {
        const align = c.align === 'right' ? 'right' : c.align === 'center' ? 'center' : 'left';
        const tx = align === 'right' ? x + (i + 1) * colW - 8 : align === 'center' ? x + i * colW + colW / 2 : x + i * colW + 8;
        this.ctx.fillStyle = fg;
        this.text(row.cells[c.key] ?? '', tx, cy + 15, align);
      });
      this.fillRect(t.line, x, cy + 29, w, 1);
      cy += 30;
    }
  }
}
