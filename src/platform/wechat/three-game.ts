import { Engine } from '@runtime/engine.js';
import { ThreeRenderer } from '@renderer/three-renderer.js';
import type { RendererBackend } from '@engine/core/types.js';
import type { WorldBlueprint } from '../../assembly/demo.assembly.js';
import type { AssetManager } from '@assets/index.js';
import { WechatTouchInputSource, type WechatTouchOptions } from './input.js';
import { installWeappAdapter, patchCanvas } from './adapter.js';
import type { WechatGame } from './bootstrap.js';

export interface WechatThreeGameOptions {
  /** 要加载运行的世界蓝图。3D 物件用 Mesh3D 组件描述（box/plane + 颜色 + 翻面）。 */
  blueprint: WorldBlueprint;
  /** 模拟频率（Hz）。默认 60。 */
  tickRate?: number;
  /** 背景色 0xRRGGBB。默认深色。 */
  background?: number;
  /** 透视相机 fov（度）。默认 50。 */
  fov?: number;
  /** 逻辑分辨率。默认取屏幕逻辑尺寸；内部按 dpr 放大为物理像素缓冲。 */
  width?: number;
  height?: number;
  /** 提供则 sprite/text 走真实贴图（three CanvasTexture）。 */
  assets?: AssetManager;
  /** 触摸输入配置；传入则挂载触摸输入源（玩家 id 默认 'p1'）。 */
  touch?: WechatTouchOptions & { playerId?: string };
}

// 微信小游戏 · three.js 3D 引导（最成熟可靠的 3D 路径）。
// 先装 weapp 适配垫片 → 拿上屏主画布（打补丁）→ 接 ThreeRenderer（消费同一份 Mesh3D 数据）→ 起循环。
// three r162（保留 WebGL1 回退）+ 适配层，覆盖微信广泛设备。
export function createWechatThreeGame(opts: WechatThreeGameOptions): WechatGame {
  installWeappAdapter();

  const sys = wx.getSystemInfoSync();
  const dpr = sys.pixelRatio || 1;
  const logicalW = opts.width ?? sys.windowWidth;
  const logicalH = opts.height ?? sys.windowHeight;
  // three 的绘制缓冲按物理像素分配（清晰）；相机宽高比用同一尺寸即可。
  const bufW = Math.round(logicalW * dpr);
  const bufH = Math.round(logicalH * dpr);

  const canvas = patchCanvas(wx.createCanvas());

  const renderer: RendererBackend = new ThreeRenderer({
    canvas: canvas as unknown as HTMLCanvasElement,
    width: bufW,
    height: bufH,
    background: opts.background ?? 0x0a0a14,
    fov: opts.fov ?? 50,
    assets: opts.assets,
  });

  let input: WechatTouchInputSource | null = null;
  if (opts.touch) {
    input = new WechatTouchInputSource(
      opts.touch.playerId ?? 'p1',
      { width: bufW, height: bufH },
      dpr,
      { width: sys.windowWidth, height: sys.windowHeight },
      opts.touch,
    );
  }

  const engine = new Engine({ tickRate: opts.tickRate ?? 60, input: input ?? undefined });
  engine.load(opts.blueprint);
  engine.attachRenderer(renderer);

  return {
    engine,
    renderer,
    canvas,
    input,
    view: { dpr, width: logicalW, height: logicalH, screenW: sys.windowWidth, screenH: sys.windowHeight },
    start: () => engine.start(),
    stop: () => engine.stop(),
  };
}
