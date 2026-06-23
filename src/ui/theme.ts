import type { UITheme } from './components/types.js';

// 默认 UI 主题（引擎 SHELL 脸的令牌值）。游戏可传自己的一份实现「同数据换皮」。
// 注：canvas fillStyle 支持 '#rrggbb' / 'rgba(...)'，但不支持 'linear-gradient(...)' 字符串
// → pageBg 用纯色（CanvasUI 只取纯色；需渐变可在渲染层另做）。
export const DEFAULT_THEME: UITheme = {
  bg0: '#06080d',
  bg1: '#0a0e17',
  bg2: '#0f1523',
  bg3: '#151c2e',
  pageBg: '#06080d',
  line: 'rgba(154,170,196,0.18)',
  text: '#e3e8f0',
  sub: '#96a2b8',
  dim: '#5d6880',
  jade: '#9cd2c5',
  jadeWash: 'rgba(156,210,197,0.12)',
  jadeLine: 'rgba(156,210,197,0.40)',
  gold: '#d4bd8a',
  ok: '#84c7a4',
  okWash: 'rgba(132,199,164,0.14)',
  warn: '#d6b277',
  warnWash: 'rgba(214,178,119,0.14)',
  danger: '#d99090',
  // canvas 字体串（多备选字族）。微信优先用系统中文字体。
  fontUi: 'sans-serif',
  fontMono: 'monospace',
};
