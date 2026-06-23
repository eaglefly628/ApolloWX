// ═══════════════════════════════════════════════════════════════
//  微信小游戏适配层 —— 把 Apollo 引擎（确定性 ECS 解释器）接到 wx 运行时。
//  端口/适配器哲学：引擎与 sim 完全平台无关；本层只提供 wx 的 IO 后端与上屏引导，
//  与浏览器后端（Web Audio / localStorage / DOM canvas）等价、可互换。
// ═══════════════════════════════════════════════════════════════

export { createWechatGame } from './bootstrap.js';
export type { WechatGame, WechatGameOptions } from './bootstrap.js';

// 3D：原生 WebGL 后端 + 3D 演示蓝图（createWechatGame({ renderer: '3d', ... }) 即用）。
export { WebGLRenderer, type WebGLRendererOptions } from '@renderer/webgl-renderer.js';
export { playground3dBlueprint } from '../../assembly/playground3d.assembly.js';

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
