// 微信小游戏运行时（wx）最小类型声明 —— 仅覆盖本适配层用到的 API 子集。
// 完整定义见官方 `miniprogram-api-typings`；这里自带一份避免引入额外依赖、保证引擎可独立类型检查。

export interface WxCanvas extends HTMLCanvasElement {
  // wx.createCanvas() 返回的画布：Canvas2D / WebGL 上下文均可取；首个 createCanvas 为上屏主画布。
  getContext(contextId: '2d'): CanvasRenderingContext2D;
  getContext(contextId: 'webgl' | 'webgl2', options?: unknown): WebGLRenderingContext;
}

export interface WxImage {
  src: string;
  width: number;
  height: number;
  onload: (() => void) | null;
  onerror: ((e?: unknown) => void) | null;
}

export interface WxInnerAudioContext {
  src: string;
  loop: boolean;
  volume: number;
  autoplay: boolean;
  play(): void;
  stop(): void;
  pause(): void;
  seek(sec: number): void;
  destroy(): void;
  onError(cb: (err: unknown) => void): void;
}

export interface WxTouch {
  identifier: number;
  clientX: number;
  clientY: number;
  // 部分基础库下触点坐标字段为 x/y（逻辑像素）；clientX/Y 更通用，二者择一存在。
  x?: number;
  y?: number;
}

export interface WxTouchEvent {
  touches: WxTouch[];
  changedTouches: WxTouch[];
  timeStamp: number;
}

export interface WxSystemInfo {
  pixelRatio: number;
  windowWidth: number;
  windowHeight: number;
  screenWidth: number;
  screenHeight: number;
  platform: string;
}

export interface WxSocketTask {
  send(opts: { data: string | ArrayBuffer }): void;
  close(opts?: { code?: number; reason?: string }): void;
  onOpen(cb: () => void): void;
  onMessage(cb: (res: { data: string | ArrayBuffer }) => void): void;
  onClose(cb: () => void): void;
  onError(cb: (err: unknown) => void): void;
}

export interface Wx {
  createCanvas(): WxCanvas;
  createImage(): WxImage;
  createInnerAudioContext(): WxInnerAudioContext;
  getSystemInfoSync(): WxSystemInfo;

  setStorageSync(key: string, data: unknown): void;
  getStorageSync(key: string): unknown;
  removeStorageSync(key: string): void;
  clearStorageSync(): void;

  onTouchStart(cb: (e: WxTouchEvent) => void): void;
  onTouchMove(cb: (e: WxTouchEvent) => void): void;
  onTouchEnd(cb: (e: WxTouchEvent) => void): void;
  onTouchCancel(cb: (e: WxTouchEvent) => void): void;

  connectSocket(opts: { url: string; protocols?: string[] }): WxSocketTask;

  onShow(cb: () => void): void;
  onHide(cb: () => void): void;
}

declare global {
  // 微信小游戏全局对象。
  const wx: Wx;
  // 部分 API（requestAnimationFrame/performance）挂在 GameGlobal 上；新基础库已提升为全局。
  // eslint-disable-next-line no-var
  var GameGlobal: typeof globalThis & { wx?: Wx };
}

export {};
