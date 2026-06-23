import { describe, it, expect } from 'vitest';
import { THEMES, THEME_LABELS, getTheme, DEFAULT_THEME } from './theme.js';
import type { UITheme } from './components/types.js';

const REQUIRED: (keyof UITheme)[] = [
  'bg0', 'bg1', 'bg2', 'bg3', 'pageBg', 'line', 'text', 'sub', 'dim',
  'jade', 'jadeWash', 'jadeLine', 'gold', 'ok', 'okWash', 'warn', 'warnWash', 'danger', 'fontUi', 'fontMono',
];

describe('主题包（风格化）', () => {
  it('每个皮都齐全（必填令牌都是非空字符串）', () => {
    for (const [id, theme] of Object.entries(THEMES)) {
      for (const k of REQUIRED) {
        expect(typeof theme[k], `${id}.${String(k)}`).toBe('string');
        expect((theme[k] as string).length, `${id}.${String(k)}`).toBeGreaterThan(0);
      }
      expect(THEME_LABELS[id], `label ${id}`).toBeTruthy();
    }
  });

  it('至少 5 套且风格各异（强调色 jade 不重复）', () => {
    const ids = Object.keys(THEMES);
    expect(ids.length).toBeGreaterThanOrEqual(5);
    const accents = new Set(ids.map((id) => THEMES[id].jade));
    expect(accents.size).toBe(ids.length); // 每皮主强调色都不同
  });

  it('getTheme 命中返回对应皮，未知回退默认', () => {
    expect(getTheme('cyber')).toBe(THEMES.cyber);
    expect(getTheme('不存在')).toBe(DEFAULT_THEME);
  });
});
