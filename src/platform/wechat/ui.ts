import { CanvasUI, type Hit } from '@ui/canvas-ui.js';
import { DEFAULT_THEME } from '@ui/theme.js';
import { resolveBindings, type ResourceReader } from '@ui/bind.js';
import type { LayoutNode, UITheme, HandlerMap, ToastProps } from '@ui/components/types.js';
import type { WxCanvas, WxTouchEvent, WxImage } from './wx.js';

export interface WechatUIOptions {
  /** 要渲染的 UI 数据树（根通常是 Screen）。 */
  root: LayoutNode;
  /** 信号名 → 回调（工程师写；数据里只出现信号名字符串）。 */
  handlers?: HandlerMap;
  /** 主题令牌；缺省用引擎默认皮。 */
  theme?: UITheme;
  /** 复用已有 canvas（与游戏共用上屏画布做 HUD）；缺省新建一张上屏画布。 */
  canvas?: WxCanvas;
  /** §4 世界绑定读值器：bind 的 Resource id → 当前值。设了它，绑定节点每次重绘自动反映世界。 */
  bind?: ResourceReader;
}

export interface WechatUI {
  canvas: WxCanvas;
  ui: CanvasUI;
  /** 换一棵新树并重绘（状态变化后调用，实现"数据变→界面变"）。 */
  setRoot(root: LayoutNode): void;
  /** 用当前树重绘。 */
  redraw(): void;
  /** 同 redraw：世界变化后由引擎循环调用，重新解析绑定并重绘。 */
  refresh(): void;
  /** 飘字提示（非模态，定时自消）。对应网页 showToast。 */
  toast(text: string, tone?: ToastProps['tone'], duration?: number): void;
  /** 取消触摸监听。 */
  dispose(): void;
}

// 微信小游戏数据驱动 UI 引导：CanvasUI 解释 LayoutNode 树并绘制 → wx 触摸命中 → 按热区类型派发：
// 按钮/行→信号名；Tabs→引擎内切页（不重建）；下拉→浮层选择；开关/单选→信号名；滑块→拖动改值；
// 输入→拉起 wx 原生键盘；模态→遮罩/×关闭；图片→异步加载缓存后重绘。同一份 UI 数据，微信端零手写 DOM。
export function createWechatUI(opts: WechatUIOptions): WechatUI {
  const sys = wx.getSystemInfoSync();
  const dpr = sys.pixelRatio || 1;
  const W = sys.windowWidth;
  const H = sys.windowHeight;

  const canvas = opts.canvas ?? wx.createCanvas();
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr); // 逻辑坐标系绘制；触摸坐标即逻辑像素

  const theme: UITheme = opts.theme ?? DEFAULT_THEME;
  const ui = new CanvasUI(ctx, theme);
  const handlers = opts.handlers ?? {};
  const viewport = { x: 0, y: 0, w: W, h: H };

  let root = opts.root;
  let disposed = false;
  const activeTab: Record<string, string> = {};
  let openDropdown: string | null = null;
  let slider: Extract<Hit, { kind: 'slider' }> | null = null;
  let currentToast: { text: string; tone?: ToastProps['tone'] } | null = null;
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  // 图片缓存：首次请求异步 wx.createImage，加载完触发重绘。
  const images = new Map<string, { bmp?: WxImage }>();
  const imageResolver = (src: string): CanvasImageSource | null => {
    let e = images.get(src);
    if (!e) {
      e = {};
      images.set(src, e);
      const img = wx.createImage();
      img.onload = () => { e!.bmp = img; redraw(); };
      img.onerror = () => { /* 加载失败保持占位 */ };
      img.src = src;
    }
    return e.bmp ? (e.bmp as unknown as CanvasImageSource) : null;
  };

  const redraw = (): void => {
    if (disposed) return;
    // 有世界绑定则先按当前世界值解析（同一份数据，值随 world 变）。
    const tree = opts.bind ? resolveBindings(root, opts.bind) : root;
    ctx.clearRect(0, 0, W, H);
    ui.render(tree, viewport, { activeTab, openDropdown: openDropdown ?? undefined, image: imageResolver });
    if (currentToast) ui.overlayToast(currentToast.text, currentToast.tone);
  };

  const sliderValue = (h: Extract<Hit, { kind: 'slider' }>, px: number): number => {
    const ratio = Math.max(0, Math.min(1, (px - h.trackX) / (h.trackW || 1)));
    const raw = h.min + ratio * (h.max - h.min);
    const stepped = Math.round(raw / h.step) * h.step;
    return Math.max(h.min, Math.min(h.max, stepped));
  };

  const openKeyboard = (action: string | undefined, value: string): void => {
    wx.showKeyboard({ defaultValue: value, maxLength: 120, multiple: false, confirmHold: false, confirmType: 'done' });
    const done = (res: { value: string }): void => {
      wx.offKeyboardConfirm(done);
      wx.offKeyboardComplete(complete);
      wx.hideKeyboard();
      if (action) handlers[action]?.(res.value);
    };
    const complete = (): void => { wx.offKeyboardConfirm(done); wx.offKeyboardComplete(complete); };
    wx.onKeyboardConfirm(done);
    wx.onKeyboardComplete(complete);
  };

  const dispatch = (hit: Hit | null): void => {
    const wasOpen = openDropdown;
    switch (hit?.kind) {
      case 'action':
        openDropdown = null;
        handlers[hit.action]?.(hit.arg);
        if (wasOpen) redraw();
        break;
      case 'tab':
        activeTab[hit.tabsId] = hit.tabId;
        redraw();
        break;
      case 'toggle':
        openDropdown = null;
        if (hit.action) handlers[hit.action]?.(String(hit.next));
        break;
      case 'radio':
        openDropdown = null;
        if (hit.action) handlers[hit.action]?.(hit.value);
        break;
      case 'dropdown':
        openDropdown = openDropdown === hit.id ? null : hit.id;
        redraw();
        break;
      case 'input':
        openDropdown = null;
        openKeyboard(hit.action, hit.value);
        if (wasOpen) redraw();
        break;
      case 'modalClose':
        openDropdown = null;
        if (hit.action) handlers[hit.action]?.();
        break;
      case 'absorb':
        if (wasOpen) { openDropdown = null; redraw(); }
        break;
      default: // 空白处
        if (wasOpen) { openDropdown = null; redraw(); }
        break;
    }
  };

  wx.onTouchStart((e: WxTouchEvent) => {
    if (disposed) return;
    const tc = e.touches[0] ?? e.changedTouches[0];
    if (!tc) return;
    const px = tc.clientX ?? tc.x ?? 0;
    const py = tc.clientY ?? tc.y ?? 0;
    const hit = ui.hit(px, py);
    if (hit?.kind === 'slider') {
      slider = hit;
      if (hit.action) handlers[hit.action]?.(String(sliderValue(hit, px))); // 点即跳到该值
      return;
    }
    dispatch(hit);
  });

  wx.onTouchMove((e: WxTouchEvent) => {
    if (disposed || !slider) return;
    const tc = e.touches[0] ?? e.changedTouches[0];
    if (!tc) return;
    const px = tc.clientX ?? tc.x ?? 0;
    if (slider.action) handlers[slider.action]?.(String(sliderValue(slider, px)));
  });
  const endSlide = (): void => { slider = null; };
  wx.onTouchEnd(endSlide);
  wx.onTouchCancel(endSlide);

  redraw();

  return {
    canvas,
    ui,
    setRoot: (r: LayoutNode) => { root = r; redraw(); },
    redraw,
    refresh: redraw,
    toast: (text, tone, duration = 2600) => {
      currentToast = { text, tone };
      redraw();
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { currentToast = null; redraw(); }, duration);
    },
    dispose: () => { disposed = true; },
  };
}
