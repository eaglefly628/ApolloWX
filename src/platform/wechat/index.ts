// ═══════════════════════════════════════════════════════════════
//  微信小游戏适配层 —— 把 Apollo 引擎（确定性 ECS 解释器）接到 wx 运行时。
//  端口/适配器哲学：引擎与 sim 完全平台无关；本层只提供 wx 的 IO 后端与上屏引导，
//  与浏览器后端（Web Audio / localStorage / DOM canvas）等价、可互换。
// ═══════════════════════════════════════════════════════════════

export { createWechatGame } from './bootstrap.js';
export type { WechatGame, WechatGameOptions } from './bootstrap.js';

// 3D（成熟可靠 · three.js）：weapp 适配垫片 + ThreeRenderer 引导。
export { createWechatThreeGame, type WechatThreeGameOptions } from './three-game.js';
export { installWeappAdapter, patchCanvas } from './adapter.js';
// 3D（零依赖 lite）：原生 WebGL 后端（createWechatGame({ renderer: '3d', ... }) 即用）。
export { WebGLRenderer, type WebGLRendererOptions } from '@renderer/webgl-renderer.js';
export { playground3dBlueprint } from '../../assembly/playground3d.assembly.js';
export { interactive3dBlueprint } from '../../assembly/interactive3d.assembly.js';

// 数据驱动 UI（canvas 解释器 · 无 DOM）+ §4 世界绑定。
export { createWechatUI, type WechatUI, type WechatUIOptions } from './ui.js';
export { CanvasUI, DEFAULT_THEME, layoutTree, hitTest, resolveBindings } from '@ui/index.js';
export type { LayoutNode, UITheme, HandlerMap, Hit, ResourceReader, ResourceView } from '@ui/index.js';
export { buildUiWorldBlueprint, economyCapability } from '../../assembly/ui-world.assembly.js';

export { WechatStoragePort } from './storage.js';
export { WechatAudioPort } from './audio.js';
export { WechatImageAssetLoader } from './image-loader.js';
export { WechatTouchInputSource, type WechatTouchOptions } from './input.js';
export { WechatSyncChannel } from './net.js';

export type {
  Wx,
  WxCanvas,
  WxImage,
  WxInnerAudioContext,
  WxTouch,
  WxTouchEvent,
  WxSystemInfo,
  WxSocketTask,
} from './wx.js';
