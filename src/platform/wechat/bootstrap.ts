import { Engine } from '@runtime/engine.js';
import { CanvasRenderer } from '@renderer/canvas-renderer.js';
import type { WorldBlueprint } from '../../assembly/demo.assembly.js';
import type { AssetManager } from '@assets/index.js';
import { WechatTouchInputSource, type WechatTouchOptions } from './input.js';
import type { WxCanvas } from './wx.js';

export interface WechatGameOptions {
  /** 要加载运行的世界蓝图（引擎是确定性解释器，玩法全在数据里）。 */
  blueprint: WorldBlueprint;
  /** 模拟频率（Hz）。固定步长 → 任何刷新率下一个 tick 都是同份模拟时间。默认 60。 */
  tickRate?: number;
  /** 画布背景色。默认深色；'transparent' 则不铺底。 */
  background?: string;
  /** 逻辑分辨率。默认取屏幕逻辑尺寸（windowWidth/Height）。 */
  width?: number;
  height?: number;
  /** 提供则 sprite 画真实贴图（配 WechatImageAssetLoader 加载）。 */
  assets?: AssetManager;
  /** 触摸输入配置；传入则挂载触摸输入源（玩家 id 默认 'p1'）。 */
  touch?: WechatTouchOptions & { playerId?: string };
}

export interface WechatGame {
  engine: Engine;
  renderer: CanvasRenderer;
  canvas: WxCanvas;
  input: WechatTouchInputSource | null;
  /** 屏幕/画布信息（逆投影、UI 布局用）。 */
  view: { dpr: number; width: number; height: number; screenW: number; screenH: number };
  /** 启动主循环（requestAnimationFrame 驱动的固定步长）。 */
  start(): void;
  /** 停止主循环。 */
  stop(): void;
}

// 微信小游戏引导：拿到上屏主画布 → 接 Canvas2D 渲染后端 → 装载蓝图 → 起固定步长循环。
// 这就是浏览器 `attachRenderer(renderer, container)` 在无 DOM 环境的等价物：渲染器自带平台 canvas。
export function createWechatGame(opts: WechatGameOptions): WechatGame {
  const sys = wx.getSystemInfoSync();
  const dpr = sys.pixelRatio || 1;
  const width = opts.width ?? sys.windowWidth;
  const height = opts.height ?? sys.windowHeight;

  // 首个 wx.createCanvas() 即上屏主画布。
  const canvas = wx.createCanvas();

  const renderer = new CanvasRenderer({
    canvas: canvas as unknown as HTMLCanvasElement,
    width,
    height,
    background: opts.background,
    assets: opts.assets,
  });

  let input: WechatTouchInputSource | null = null;
  if (opts.touch) {
    input = new WechatTouchInputSource(
      opts.touch.playerId ?? 'p1',
      { width: canvas.width || Math.round(width * dpr), height: canvas.height || Math.round(height * dpr) },
      dpr,
      { width: sys.windowWidth, height: sys.windowHeight },
      opts.touch,
    );
  }

  const engine = new Engine({ tickRate: opts.tickRate ?? 60, input: input ?? undefined });
  engine.load(opts.blueprint);
  // 无 container：渲染器用平台 canvas。
  engine.attachRenderer(renderer);

  return {
    engine,
    renderer,
    canvas,
    input,
    view: { dpr, width, height, screenW: sys.windowWidth, screenH: sys.windowHeight },
    start: () => engine.start(),
    stop: () => engine.stop(),
  };
}
