import { CanvasUI } from '@ui/canvas-ui.js';
import { DEFAULT_THEME } from '@ui/theme.js';
import type { LayoutNode, UITheme, HandlerMap } from '@ui/components/types.js';
import type { WxCanvas, WxTouchEvent } from './wx.js';

export interface WechatUIOptions {
  /** 要渲染的 UI 数据树（根通常是 Screen）。 */
  root: LayoutNode;
  /** 信号名 → 回调（工程师写；数据里只出现信号名字符串）。 */
  handlers?: HandlerMap;
  /** 主题令牌；缺省用引擎默认皮。 */
  theme?: UITheme;
  /** 复用已有 canvas（如与游戏共用上屏画布做 HUD）；缺省新建一张上屏画布。 */
  canvas?: WxCanvas;
}

export interface WechatUI {
  canvas: WxCanvas;
  ui: CanvasUI;
  /** 换一棵新树并重绘（状态变化后调用，实现"数据变→界面变"）。 */
  setRoot(root: LayoutNode): void;
  /** 用当前树重绘。 */
  redraw(): void;
  /** 取消触摸监听（wx 仅整体 off，这里用标志位短路）。 */
  dispose(): void;
}

// 微信小游戏数据驱动 UI 引导：建上屏画布 → CanvasUI 解释 LayoutNode 树并绘制 →
// wx.onTouchStart 命中测试 → 派发信号名给 handlers。同一份 UI 数据，微信端零手写 DOM。
export function createWechatUI(opts: WechatUIOptions): WechatUI {
  const sys = wx.getSystemInfoSync();
  const dpr = sys.pixelRatio || 1;
  const W = sys.windowWidth;
  const H = sys.windowHeight;

  const canvas = opts.canvas ?? wx.createCanvas();
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr); // 逻辑坐标系绘制（清晰），触摸坐标即逻辑像素、无需换算

  const theme: UITheme = opts.theme ?? DEFAULT_THEME;
  const ui = new CanvasUI(ctx, theme);
  const viewport = { x: 0, y: 0, w: W, h: H };
  let root = opts.root;
  let disposed = false;

  const redraw = (): void => {
    ctx.clearRect(0, 0, W, H);
    ui.render(root, viewport);
  };
  redraw();

  wx.onTouchStart((e: WxTouchEvent) => {
    if (disposed) return;
    const tch = e.touches[0] ?? e.changedTouches[0];
    if (!tch) return;
    const px = tch.clientX ?? tch.x ?? 0;
    const py = tch.clientY ?? tch.y ?? 0;
    const hit = ui.hit(px, py);
    if (hit) opts.handlers?.[hit.action]?.(hit.arg);
  });

  return {
    canvas,
    ui,
    setRoot: (r: LayoutNode) => {
      root = r;
      redraw();
    },
    redraw,
    dispose: () => {
      disposed = true;
    },
  };
}
