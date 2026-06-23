import type { UITheme } from './components/types.js';

// UI 主题令牌包（风格化）。游戏传任意一份即「同数据换皮」——红线不变：只填令牌（颜色/字体/圆角），不写 CSS/DOM。
// jade 三件套(jade/jadeWash/jadeLine) = 主强调色；gold = 次强调；ok/warn/danger = 语义色；radius = 形状风格。
// canvas fillStyle 支持 '#rrggbb' / 'rgba(...)'，不支持渐变串 → pageBg 用纯色。

// 雅致深色（引擎缺省脸 · 玉色强调）。
export const DARK_THEME: UITheme = {
  bg0: '#06080d', bg1: '#0f1523', bg2: '#0f1523', bg3: '#1b2233', pageBg: '#06080d',
  line: 'rgba(154,170,196,0.18)',
  text: '#e3e8f0', sub: '#96a2b8', dim: '#5d6880',
  jade: '#9cd2c5', jadeWash: 'rgba(156,210,197,0.14)', jadeLine: 'rgba(156,210,197,0.42)',
  gold: '#d4bd8a',
  ok: '#84c7a4', okWash: 'rgba(132,199,164,0.14)', warn: '#d6b277', warnWash: 'rgba(214,178,119,0.14)', danger: '#d99090',
  fontUi: 'sans-serif', fontMono: 'monospace', radius: 10,
};

// 霓虹赛博（暗底 + 青/品红光）。
export const CYBER_THEME: UITheme = {
  bg0: '#05060f', bg1: '#0b1020', bg2: '#0e1530', bg3: '#15203f', pageBg: '#05060f',
  line: 'rgba(34,211,238,0.22)',
  text: '#e6f7ff', sub: '#7fb7cc', dim: '#4a6b80',
  jade: '#22d3ee', jadeWash: 'rgba(34,211,238,0.16)', jadeLine: 'rgba(34,211,238,0.55)',
  gold: '#f0abfc',
  ok: '#34d399', okWash: 'rgba(52,211,153,0.16)', warn: '#fbbf24', warnWash: 'rgba(251,191,36,0.16)', danger: '#fb7185',
  fontUi: 'sans-serif', fontMono: 'monospace', radius: 4,
};

// 水墨（宣纸浅底 + 墨字 + 黛蓝）。
export const INK_THEME: UITheme = {
  bg0: '#efeae0', bg1: '#f6f2e9', bg2: '#efe9dc', bg3: '#e2dccd', pageBg: '#efeae0',
  line: 'rgba(60,60,70,0.18)',
  text: '#2b2b30', sub: '#5f5f68', dim: '#9a958b',
  jade: '#4f6b78', jadeWash: 'rgba(79,107,120,0.12)', jadeLine: 'rgba(79,107,120,0.40)',
  gold: '#8a7a52',
  ok: '#4e8a6a', okWash: 'rgba(78,138,106,0.12)', warn: '#b08433', warnWash: 'rgba(176,132,51,0.12)', danger: '#b0524f',
  fontUi: 'serif', fontMono: 'monospace', radius: 8,
};

// 三国织锦（暖奶油 + 玫瑰 + 描金 · 取自源 sanguo 浅皮）。
export const BROCADE_THEME: UITheme = {
  bg0: '#ecd6cf', bg1: '#fffdfa', bg2: '#fbeee4', bg3: '#f3e3d4', pageBg: '#f3e2dc',
  line: 'rgba(216,164,78,0.40)',
  text: '#5a3f44', sub: '#a98b8f', dim: '#c2a9a0',
  jade: '#d8607b', jadeWash: 'rgba(216,96,123,0.16)', jadeLine: 'rgba(216,96,123,0.45)',
  gold: '#cf9a3f',
  ok: '#54ad8e', okWash: 'rgba(84,173,142,0.14)', warn: '#e0a94e', warnWash: 'rgba(224,169,78,0.14)', danger: '#d65668',
  fontUi: 'serif', fontMono: 'monospace', radius: 14,
};

// 樱花乙女（柔粉 · 立绘剧情向）。
export const SAKURA_THEME: UITheme = {
  bg0: '#f7e6ee', bg1: '#fff5fa', bg2: '#fde9f1', bg3: '#f8dbe8', pageBg: '#f7e6ee',
  line: 'rgba(232,97,140,0.30)',
  text: '#5b3a47', sub: '#a9788a', dim: '#cda6b4',
  jade: '#e8618c', jadeWash: 'rgba(232,97,140,0.14)', jadeLine: 'rgba(232,97,140,0.45)',
  gold: '#e0a96d',
  ok: '#7bc4a0', okWash: 'rgba(123,196,160,0.14)', warn: '#e6b15a', warnWash: 'rgba(230,177,90,0.14)', danger: '#e0697f',
  fontUi: 'sans-serif', fontMono: 'monospace', radius: 18,
};

// 主题注册表（id → UITheme）。换肤即换这里的一份。
export const THEMES: Record<string, UITheme> = {
  dark: DARK_THEME,
  cyber: CYBER_THEME,
  ink: INK_THEME,
  brocade: BROCADE_THEME,
  sakura: SAKURA_THEME,
};

export const THEME_LABELS: Record<string, string> = {
  dark: '雅致', cyber: '赛博', ink: '水墨', brocade: '织锦', sakura: '樱花',
};

export function getTheme(id: string): UITheme {
  return THEMES[id] ?? DARK_THEME;
}

// 兼容旧引用：DEFAULT_THEME = 雅致深色。
export const DEFAULT_THEME = DARK_THEME;
