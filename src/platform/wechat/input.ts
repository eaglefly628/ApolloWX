import { QueuedInputSource, canvasPointerToScreen } from '@net/index.js';
// synthesizeDrag 未进 @net barrel（其它消费方不需要），直接从源模块取。
import { synthesizeDrag } from '@net/queued-input.js';
import type { WxTouch, WxTouchEvent } from './wx.js';

export interface WechatTouchOptions {
  /** 是否上报 move（拖拽/滑动需要）。默认 false（只 down/up，省命令量）。 */
  move?: boolean;
  /** 拖拽阈值（逻辑像素）。down→up 超过则合成 drag，否则算点击。 */
  dragThreshold?: number;
  /** 本地相机逆投影（canvas 逻辑像素 → 世界坐标）。带相机的游戏必须传，保证联机确定性。 */
  worldFromScreen?: (sx: number, sy: number) => { x: number; y: number };
}

// 微信小游戏触摸输入源 —— 监听 wx.onTouchStart/Move/End，映射为 canvas 逻辑像素后按 tick 确定性注入。
// 与浏览器 PointerInputSource 同纪律：**屏幕→世界逆投影在本地、入网前完成**，注入世界坐标 → lockstep 安全。
//
// 微信小游戏 canvas 为全屏上屏画布：触点 clientX/Y（CSS 逻辑像素）相对屏幕左上角，rect 即整屏。
// 渲染器把 canvas.width 设为「逻辑尺寸×pixelRatio」，故逻辑宽 = canvas.width / dpr（与渲染一致）。
export class WechatTouchInputSource extends QueuedInputSource {
  private downAt: { x: number; y: number } | null = null;
  private disposed = false;

  constructor(
    private readonly pid: string,
    private readonly canvas: { width: number; height: number },
    private readonly dpr: number,
    private readonly screen: { width: number; height: number },
    private readonly opts: WechatTouchOptions = {},
  ) {
    super(pid);
    wx.onTouchStart(this.onStart);
    wx.onTouchEnd(this.onEnd);
    wx.onTouchCancel(this.onEnd);
    if (opts.move) wx.onTouchMove(this.onMove);
  }

  // 触点 → 世界坐标（逆投影在采集期完成）。
  private toWorld(t: WxTouch): { x: number; y: number } {
    const clientX = t.clientX ?? t.x ?? 0;
    const clientY = t.clientY ?? t.y ?? 0;
    const rect = { left: 0, top: 0, width: this.screen.width, height: this.screen.height };
    const p = canvasPointerToScreen(
      clientX,
      clientY,
      rect,
      this.canvas.width / this.dpr,
      this.canvas.height / this.dpr,
    );
    return this.opts.worldFromScreen ? this.opts.worldFromScreen(p.x, p.y) : p;
  }

  private first(e: WxTouchEvent): WxTouch | undefined {
    return e.changedTouches[0] ?? e.touches[0];
  }

  private readonly onStart = (e: WxTouchEvent) => {
    if (this.disposed) return;
    const t = this.first(e);
    if (!t) return;
    const w = this.toWorld(t);
    this.enqueue({ source: this.pid, x: w.x, y: w.y, phase: 'down' });
    this.downAt = { x: w.x, y: w.y };
  };

  private readonly onMove = (e: WxTouchEvent) => {
    if (this.disposed) return;
    const t = this.first(e);
    if (!t) return;
    const w = this.toWorld(t);
    this.enqueue({ source: this.pid, x: w.x, y: w.y, phase: 'move' });
  };

  // up 与 drag 二选一：超阈值=拖（只发 drag），阈值内=真点击（发 up）。与浏览器路径一致。
  private readonly onEnd = (e: WxTouchEvent) => {
    if (this.disposed) return;
    const t = this.first(e);
    if (!t) return;
    const w = this.toWorld(t);
    if (this.downAt) {
      const d = synthesizeDrag(this.pid, this.downAt, w, this.opts.dragThreshold);
      if (d) this.enqueue(d);
      else this.enqueue({ source: this.pid, x: w.x, y: w.y, phase: 'up' });
      this.downAt = null;
      return;
    }
    this.enqueue({ source: this.pid, x: w.x, y: w.y, phase: 'up' });
  };

  dispose(): void {
    // wx 无 offTouch* 的逐回调移除（仅整体 off），故用标志位短路；引擎单例输入生命周期 = 应用生命周期。
    this.disposed = true;
  }
}
