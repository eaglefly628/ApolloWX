import { describe, it, expect } from 'vitest';
import { patchCanvas, installWeappAdapter } from './adapter.js';

// patchCanvas 是纯函数（不碰 wx），可直接测：给"裸 canvas"补齐 three 需要的 DOM 方法/属性。
describe('patchCanvas', () => {
  it('为裸 canvas 补齐 style / 事件 / getBoundingClientRect / remove / client 尺寸', () => {
    const bare = { width: 320, height: 480 } as Record<string, unknown>;
    const c = patchCanvas(bare) as Record<string, unknown> & {
      style: unknown; addEventListener: () => void; removeEventListener: () => void;
      remove: () => void; getBoundingClientRect: () => { width: number; height: number };
      clientWidth: number; clientHeight: number;
    };
    expect(typeof c.style).toBe('object');
    expect(typeof c.addEventListener).toBe('function');
    expect(typeof c.removeEventListener).toBe('function');
    expect(typeof c.remove).toBe('function');
    const rect = c.getBoundingClientRect();
    expect(rect).toMatchObject({ width: 320, height: 480 });
    expect(c.clientWidth).toBe(320);
    expect(c.clientHeight).toBe(480);
    // 三个 webglcontext* 监听调用不应抛（three 在 WebGLRenderer 构造里会调）。
    expect(() => c.addEventListener()).not.toThrow();
  });

  it('已有方法不被覆盖（幂等）', () => {
    const fn = () => {};
    const c = patchCanvas({ width: 1, height: 1, addEventListener: fn } as Record<string, unknown>) as { addEventListener: unknown };
    expect(c.addEventListener).toBe(fn);
  });
});

describe('installWeappAdapter', () => {
  it('幂等执行不抛，并补齐 three 所需全局（self/window/document/navigator）', () => {
    expect(() => installWeappAdapter()).not.toThrow();
    expect(() => installWeappAdapter()).not.toThrow(); // 二次调用幂等
    const g = globalThis as unknown as {
      self?: unknown; window?: unknown; document?: { createElementNS?: unknown }; navigator?: { userAgent?: string };
      HTMLImageElement?: unknown;
    };
    expect(g.self).toBeDefined();
    expect(g.window).toBeDefined();
    expect(typeof g.document?.createElementNS).toBe('function'); // three 建内部 canvas 用
    expect(typeof g.navigator?.userAgent).toBe('string'); // three 读 userAgent
    expect(g.HTMLImageElement).toBeDefined();
  });
});
