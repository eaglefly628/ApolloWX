import type {
  LayoutNode, UITheme, LabelProps, ButtonProps, BadgeProps, TagProps, PanelProps, ScreenProps,
  ProgressBarProps, TableProps, CheckboxProps, ToggleProps, RadioGroupProps, DropdownProps,
  InputProps, SliderProps, TabsProps, ModalProps, ToastProps, ImageProps,
} from './components/types.js';
import { layoutTree, type LaidOut, type Rect, type LayoutOpts, TAB_H } from './layout.js';

// CanvasUI —— 数据驱动 UI 的 **canvas 解释器**（微信小游戏等无 DOM 环境）。与网页 renderNode(HTML)/mountUI(DOM)
// 平级：读同一份 LayoutNode 树 + UITheme，画到 Canvas2D，并把交互点记成"热区"供触摸层派发。
// 覆盖全部 20 控件；交互行为（切页/模态/开关/单选/下拉/滑块/输入/Toast）由热区 + createWechatUI 协作完成。

const FONT_PX: Record<string, number> = { xs: 12, sm: 14, md: 16, lg: 22, xl: 30 };
type Ctx = CanvasRenderingContext2D;

// 触摸命中结果（标签联合）：createWechatUI 据此派发。
export type Hit =
  | { kind: 'action'; action: string; arg?: string }
  | { kind: 'tab'; tabsId: string; tabId: string }
  | { kind: 'toggle'; action?: string; next: boolean }
  | { kind: 'radio'; action?: string; value: string }
  | { kind: 'dropdown'; id: string }
  | { kind: 'input'; action?: string; value: string }
  | { kind: 'slider'; action?: string; min: number; max: number; step: number; trackX: number; trackW: number }
  | { kind: 'modalClose'; action?: string }
  | { kind: 'absorb' };

interface Region extends Rect { hit: Hit }

export interface CanvasUIRenderOpts extends LayoutOpts {
  /** 图片解析器：src → 已加载位图（缺省画占位）。createWechatUI 维护缓存并在加载完重绘。 */
  image?: (src: string) => CanvasImageSource | null;
  /** 当前展开的 Dropdown 节点 id（在其下方画选项浮层）。 */
  openDropdown?: string;
}

export class CanvasUI {
  private regions: Region[] = [];
  private viewport: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private opts: CanvasUIRenderOpts = {};
  private dropdowns = new Map<string, { rect: Rect; node: LayoutNode }>();

  constructor(private readonly ctx: Ctx, private readonly theme: UITheme) {}

  render(root: LayoutNode, viewport: Rect, opts: CanvasUIRenderOpts = {}): void {
    this.viewport = viewport;
    this.opts = opts;
    this.regions = [];
    this.dropdowns.clear();
    const laid = layoutTree(root, viewport, opts);
    const ctx = this.ctx;
    ctx.save();
    ctx.textBaseline = 'middle';
    for (const l of laid) this.draw(l);
    // 展开的下拉浮层画在最上层。
    if (opts.openDropdown && this.dropdowns.has(opts.openDropdown)) {
      this.drawDropdownPopup(this.dropdowns.get(opts.openDropdown)!);
    }
    ctx.restore();
  }

  hit(px: number, py: number): Hit | null {
    for (let i = this.regions.length - 1; i >= 0; i--) {
      const r = this.regions[i];
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return r.hit;
    }
    return null;
  }

  // 在底部居中画一条非交互 Toast（createWechatUI 的定时飘字用，画在所有内容之上、不进热区）。
  overlayToast(text: string, tone?: ToastProps['tone']): void {
    const t = this.theme; const v = this.viewport;
    const c = tone === 'warn' ? t.warn : tone === 'danger' ? t.danger : tone === 'dim' ? t.dim : tone === 'accent' ? t.jade : t.ok;
    const ctx = this.ctx;
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.font = this.font(14, true);
    const w = Math.min(v.w - 40, Math.max(120, ctx.measureText(text).width + 40));
    const x = v.x + (v.w - w) / 2; const y = v.y + v.h - 80; const h = 38;
    this.rect(t.bg3, x, y, w, h); this.stroke(c, x, y, w, h);
    ctx.fillStyle = c; this.text(text, x + w / 2, y + h / 2, 'center');
    ctx.restore();
  }

  // ── 绘制基元 ──
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
  private rect(c: string, x: number, y: number, w: number, h: number): void {
    this.ctx.fillStyle = c; this.ctx.fillRect(x, y, w, h);
  }
  private stroke(c: string, x: number, y: number, w: number, h: number): void {
    this.ctx.strokeStyle = c; this.ctx.lineWidth = 1; this.ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
  private region(hit: Hit, x: number, y: number, w: number, h: number): void {
    this.regions.push({ x, y, w, h, hit });
  }

  private draw(l: LaidOut): void {
    const { node, x, y, w, h } = l;
    const t = this.theme;
    switch (node.type) {
      case 'Screen': this.rect((node.props as ScreenProps).bg ?? t.pageBg, x, y, w, h); break;
      case 'Panel': this.drawPanel(node, x, y, w, h); break;
      case 'Label': this.drawLabel(node.props as LabelProps, x, y, h); break;
      case 'Button': this.drawButton(node.props as ButtonProps, x, y, w, h); break;
      case 'Badge': this.drawBadge(node.props as BadgeProps, x, y, w, h); break;
      case 'Tag': this.drawTag(node, x, y, w, h); break;
      case 'Divider': this.rect(t.line, x, y + Math.floor(h / 2), w, 1); break;
      case 'ProgressBar': this.drawProgress(node.props as ProgressBarProps, x, y, w, h); break;
      case 'Table': this.drawTable(node, x, y, w); break;
      case 'Checkbox': this.drawCheckbox(node, x, y, h); break;
      case 'Toggle': this.drawToggle(node, x, y, w, h); break;
      case 'RadioGroup': this.drawRadio(node, x, y, w); break;
      case 'Dropdown': this.drawDropdown(node, x, y, w, h); break;
      case 'Input': this.drawInput(node, x, y, w, h); break;
      case 'Slider': this.drawSlider(node, x, y, w, h); break;
      case 'Tabs': this.drawTabsHeader(node, x, y, w); break;
      case 'Image': this.drawImage(node.props as ImageProps, x, y, w, h); break;
      case 'Toast': this.drawToast(node.props as ToastProps, x, y, w, h); break;
      case 'Modal': this.drawModal(node, x, y, w, h); break;
      default: break;
    }
  }

  private drawPanel(node: LayoutNode, x: number, y: number, w: number, h: number): void {
    const t = this.theme; const p = node.props as PanelProps;
    this.rect(t.bg1, x, y, w, h); this.stroke(t.line, x, y, w, h);
    if (p.title) {
      this.ctx.font = this.font(13, true); this.ctx.fillStyle = t.sub;
      this.text(p.title, x + 12, y + 15);
      this.rect(t.line, x + 1, y + 28, w - 2, 1);
    }
  }

  private drawLabel(p: LabelProps, x: number, y: number, h: number): void {
    this.ctx.font = this.font(FONT_PX[p.size ?? 'md'], p.bold, p.mono);
    this.ctx.fillStyle = this.color(p.color ?? 'text');
    this.text(p.text, x + 2, y + h / 2);
  }

  private drawButton(p: ButtonProps, x: number, y: number, w: number, h: number): void {
    const t = this.theme; const kind = p.kind ?? 'primary';
    const bg = p.disabled ? 'rgba(255,255,255,0.03)' : kind === 'primary' ? t.jadeWash : kind === 'ghost' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0)';
    const fg = p.disabled ? t.dim : kind === 'primary' ? t.jade : t.sub;
    this.rect(bg, x, y, w, h);
    this.stroke(kind === 'primary' && !p.disabled ? t.jadeLine : t.line, x, y, w, h);
    this.ctx.font = this.font(15, kind === 'primary'); this.ctx.fillStyle = fg;
    this.text(p.label, x + w / 2, y + h / 2, 'center');
    if (p.action && !p.disabled) this.region({ kind: 'action', action: p.action, arg: p.actionArg }, x, y, w, h);
  }

  private drawBadge(p: BadgeProps, x: number, y: number, w: number, h: number): void {
    const t = this.theme;
    const c = p.tone === 'warn' ? t.warn : p.tone === 'dim' ? t.dim : t.ok;
    const wash = p.tone === 'warn' ? t.warnWash : p.tone === 'dim' ? 'rgba(255,255,255,0.04)' : t.okWash;
    this.rect(wash, x, y, w, h);
    this.ctx.font = this.font(12, true); this.ctx.fillStyle = c;
    this.text(p.text, x + w / 2, y + h / 2, 'center');
  }

  private drawTag(node: LayoutNode, x: number, y: number, w: number, h: number): void {
    const t = this.theme; const p = node.props as TagProps;
    this.rect(p.active ? t.jadeWash : 'rgba(255,255,255,0.04)', x, y, w, h);
    this.stroke(p.active ? t.jadeLine : t.line, x, y, w, h);
    this.ctx.font = this.font(13, p.active); this.ctx.fillStyle = p.active ? t.jade : t.sub;
    this.text(p.removable ? `${p.label}  ×` : p.label, x + w / 2, y + h / 2, 'center');
    if (p.action) this.region({ kind: 'action', action: p.action, arg: p.actionArg }, x, y, w, h);
  }

  private drawProgress(p: ProgressBarProps, x: number, y: number, w: number, h: number): void {
    const t = this.theme; const max = p.max ?? 1;
    const ratio = Math.max(0, Math.min(1, p.value / (max || 1)));
    const tone = p.tone === 'gold' ? t.gold : p.tone === 'ok' ? t.ok : p.tone === 'warn' ? t.warn : p.tone === 'danger' ? t.danger : t.jade;
    const by = y + h / 2 - 4;
    this.rect(t.bg3, x, by, w, 8); this.rect(tone, x, by, w * ratio, 8);
    if (p.showValue) {
      this.ctx.font = this.font(11); this.ctx.fillStyle = t.dim;
      this.text(max === 1 ? `${Math.round(ratio * 100)}%` : `${p.value}/${max}`, x + w, y + h / 2, 'right');
    }
  }

  private drawCheckbox(node: LayoutNode, x: number, y: number, h: number): void {
    const t = this.theme; const p = node.props as CheckboxProps;
    const cy = y + h / 2; const bs = 18;
    this.stroke(p.checked ? t.jadeLine : t.line, x, cy - bs / 2, bs, bs);
    if (p.checked) { this.rect(t.jadeWash, x, cy - bs / 2, bs, bs); this.ctx.font = this.font(13, true); this.ctx.fillStyle = t.jade; this.text('✓', x + bs / 2, cy, 'center'); }
    this.ctx.font = this.font(14); this.ctx.fillStyle = t.text;
    this.text(p.label, x + bs + 8, cy);
    this.region({ kind: 'toggle', action: p.action, next: !p.checked }, x, y, x + bs + 8 + 200, h);
  }

  private drawToggle(node: LayoutNode, x: number, y: number, w: number, h: number): void {
    const t = this.theme; const p = node.props as ToggleProps;
    const cy = y + h / 2; const tw = 40; const th = 22; const tx = x;
    this.rect(p.checked ? t.jade : t.bg3, tx, cy - th / 2, tw, th);
    this.rect('#fff', p.checked ? tx + tw - 18 : tx + 2, cy - 9, 16, 18);
    this.ctx.font = this.font(14); this.ctx.fillStyle = t.text;
    this.text(p.label, tx + tw + 10, cy);
    this.region({ kind: 'toggle', action: p.action, next: !p.checked }, x, y, w, h);
  }

  private drawRadio(node: LayoutNode, x: number, y: number, w: number): void {
    const t = this.theme; const p = node.props as RadioGroupProps;
    p.options.forEach((o, i) => {
      const oy = y + i * 30; const cy = oy + 15;
      this.ctx.strokeStyle = o.value === p.value ? t.jadeLine : t.line; this.ctx.lineWidth = 1;
      this.ctx.beginPath(); this.ctx.arc(x + 9, cy, 8, 0, Math.PI * 2); this.ctx.stroke();
      if (o.value === p.value) { this.ctx.fillStyle = t.jade; this.ctx.beginPath(); this.ctx.arc(x + 9, cy, 4, 0, Math.PI * 2); this.ctx.fill(); }
      this.ctx.font = this.font(14); this.ctx.fillStyle = t.text; this.text(o.label, x + 26, cy);
      this.region({ kind: 'radio', action: p.action, value: o.value }, x, oy, w, 30);
    });
  }

  private drawDropdown(node: LayoutNode, x: number, y: number, w: number, h: number): void {
    const t = this.theme; const p = node.props as DropdownProps;
    const sel = p.options.find((o) => o.value === p.value);
    this.rect(t.bg2, x, y, w, h); this.stroke(t.line, x, y, w, h);
    this.ctx.font = this.font(14); this.ctx.fillStyle = sel ? t.text : t.dim;
    this.text(sel ? sel.label : (p.placeholder ?? '请选择'), x + 10, y + h / 2);
    this.ctx.fillStyle = t.sub; this.text('▼', x + w - 18, y + h / 2);
    this.dropdowns.set(node.id, { rect: { x, y, w, h }, node });
    this.region({ kind: 'dropdown', id: node.id }, x, y, w, h);
  }

  private drawDropdownPopup(d: { rect: Rect; node: LayoutNode }): void {
    const t = this.theme; const p = d.node.props as DropdownProps; const { x, y, w, h } = d.rect;
    const itemH = 36; const py = y + h + 2;
    this.rect(t.bg3, x, py, w, p.options.length * itemH); this.stroke(t.jadeLine, x, py, w, p.options.length * itemH);
    p.options.forEach((o, i) => {
      const iy = py + i * itemH;
      this.ctx.font = this.font(14); this.ctx.fillStyle = o.value === p.value ? t.jade : t.text;
      this.text(o.label, x + 10, iy + itemH / 2);
      if (i < p.options.length - 1) this.rect(t.line, x, iy + itemH, w, 1);
      // 选项点击：发 action(value)。push 在最后→优先级最高（盖过下方控件）。
      this.region(p.action ? { kind: 'action', action: p.action, arg: o.value } : { kind: 'absorb' }, x, iy, w, itemH);
    });
  }

  private drawInput(node: LayoutNode, x: number, y: number, w: number, h: number): void {
    const t = this.theme; const p = node.props as InputProps;
    this.rect(t.bg2, x, y, w, h); this.stroke(t.line, x, y, w, h);
    this.ctx.font = this.font(14); this.ctx.fillStyle = p.value ? t.text : t.dim;
    this.text(p.value || p.placeholder || '', x + 10, y + h / 2);
    this.region({ kind: 'input', action: p.action, value: p.value ?? '' }, x, y, w, h);
  }

  private drawSlider(node: LayoutNode, x: number, y: number, w: number, h: number): void {
    const t = this.theme; const p = node.props as SliderProps;
    const min = p.min ?? 0; const max = p.max ?? 100; const val = p.value ?? min;
    const trackX = x + 4; const trackW = w - 8; const cy = y + h - 14;
    if (p.label) { this.ctx.font = this.font(13); this.ctx.fillStyle = t.sub; this.text(`${p.label}：${val}`, x + 2, y + 12); }
    this.rect(t.bg3, trackX, cy - 3, trackW, 6);
    const ratio = max > min ? (val - min) / (max - min) : 0;
    this.rect(t.jade, trackX, cy - 3, trackW * ratio, 6);
    this.ctx.fillStyle = '#fff'; this.ctx.beginPath(); this.ctx.arc(trackX + trackW * ratio, cy, 9, 0, Math.PI * 2); this.ctx.fill();
    this.region({ kind: 'slider', action: p.action, min, max, step: p.step ?? 1, trackX, trackW }, x, y, w, h);
  }

  private drawTabsHeader(node: LayoutNode, x: number, y: number, w: number): void {
    const t = this.theme; const p = node.props as TabsProps;
    const active = this.opts.activeTab?.[node.id] ?? p.active ?? p.tabs[0]?.id;
    const tw = w / Math.max(1, p.tabs.length);
    p.tabs.forEach((tab, i) => {
      const tx = x + i * tw; const on = tab.id === active;
      this.rect(on ? t.jadeWash : 'rgba(0,0,0,0)', tx, y, tw, TAB_H - 6);
      this.ctx.font = this.font(14, on); this.ctx.fillStyle = on ? t.jade : t.sub;
      this.text(tab.label, tx + tw / 2, y + (TAB_H - 6) / 2, 'center');
      this.rect(on ? t.jade : t.line, tx, y + TAB_H - 6, tw, on ? 2 : 1);
      this.region({ kind: 'tab', tabsId: node.id, tabId: tab.id }, tx, y, tw, TAB_H);
    });
  }

  private drawImage(p: ImageProps, x: number, y: number, w: number, h: number): void {
    const t = this.theme;
    const bmp = this.opts.image?.(p.src);
    if (bmp) {
      this.ctx.drawImage(bmp, x, y, w, h);
    } else {
      this.rect(t.bg3, x, y, w, h); this.stroke(t.line, x, y, w, h);
      this.ctx.font = this.font(12); this.ctx.fillStyle = t.dim;
      this.text(p.alt ?? '图片', x + w / 2, y + h / 2, 'center');
    }
  }

  private drawToast(p: ToastProps, x: number, y: number, w: number, h: number): void {
    const t = this.theme;
    const c = p.tone === 'warn' ? t.warn : p.tone === 'danger' ? t.danger : p.tone === 'dim' ? t.dim : p.tone === 'accent' ? t.jade : t.ok;
    this.rect(t.bg3, x, y, w, h); this.stroke(c, x, y, w, h);
    this.ctx.font = this.font(13, true); this.ctx.fillStyle = c;
    this.text(p.text, x + w / 2, y + h / 2, 'center');
  }

  private drawModal(node: LayoutNode, x: number, y: number, w: number, h: number): void {
    const t = this.theme; const p = node.props as ModalProps; const v = this.viewport;
    // 全屏遮罩（最低优先级热区：点遮罩关闭）。
    this.rect('rgba(0,0,0,0.55)', v.x, v.y, v.w, v.h);
    this.region({ kind: 'modalClose', action: p.closeAction }, v.x, v.y, v.w, v.h);
    // 居中盒 + 吸收热区（点盒身不关闭）。
    this.rect(t.bg1, x, y, w, h); this.stroke(t.jadeLine, x, y, w, h);
    this.region({ kind: 'absorb' }, x, y, w, h);
    if (p.title) { this.ctx.font = this.font(15, true); this.ctx.fillStyle = t.text; this.text(p.title, x + 14, y + 16); this.rect(t.line, x + 1, y + 28, w - 2, 1); }
    if (p.closable !== false) {
      const bs = 26; const bx = x + w - bs - 6; const by = y + 4;
      this.ctx.font = this.font(18); this.ctx.fillStyle = t.sub; this.text('×', bx + bs / 2, by + bs / 2, 'center');
      this.region({ kind: 'modalClose', action: p.closeAction }, bx, by, bs, bs);
    }
  }

  private drawTable(node: LayoutNode, x: number, y: number, w: number): void {
    const t = this.theme; const p = node.props as TableProps;
    let cy = y;
    if (p.title) { this.ctx.font = this.font(13, true); this.ctx.fillStyle = t.sub; this.text(p.title, x + 2, cy + 13); cy += 26; }
    const cols = p.columns; const colW = w / Math.max(1, cols.length);
    this.rect(t.bg2, x, cy, w, 30); this.ctx.font = this.font(12, true); this.ctx.fillStyle = t.dim;
    cols.forEach((c, i) => {
      const al = c.align === 'right' ? 'right' : c.align === 'center' ? 'center' : 'left';
      const tx = al === 'right' ? x + (i + 1) * colW - 8 : al === 'center' ? x + i * colW + colW / 2 : x + i * colW + 8;
      this.text(c.label, tx, cy + 15, al);
    });
    cy += 30; this.ctx.font = this.font(13);
    for (const row of p.rows) {
      const fg = row.tone === 'accent' ? t.jade : row.tone === 'dim' ? t.dim : t.text;
      cols.forEach((c, i) => {
        const al = c.align === 'right' ? 'right' : c.align === 'center' ? 'center' : 'left';
        const tx = al === 'right' ? x + (i + 1) * colW - 8 : al === 'center' ? x + i * colW + colW / 2 : x + i * colW + 8;
        this.ctx.fillStyle = fg; this.text(row.cells[c.key] ?? '', tx, cy + 15, al);
      });
      if (row.action) this.region({ kind: 'action', action: row.action, arg: row.id }, x, cy, w, 30);
      this.rect(t.line, x, cy + 29, w, 1); cy += 30;
    }
  }
}
