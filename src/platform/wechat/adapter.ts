// 微信小游戏 · three.js 适配垫片（weapp-adapter 精简版）。
// 依据对 three r162 源码的静态分析，只补它真正触碰的 DOM 全局/方法：
//   document.createElementNS('canvas')、navigator.userAgent、window.innerWidth/Height/devicePixelRatio、
//   canvas.addEventListener('webglcontextlost'…)、canvas.style、canvas.getBoundingClientRect。
// 幂等：已存在的全局不覆盖。必须在 new THREE.WebGLRenderer 之前调用 installWeappAdapter()。

type AnyObj = Record<string, unknown>;

// 给微信 canvas/image 补 three（及多数 web 库）期望的 DOM 方法/属性。幂等。
export function patchCanvas<T>(canvas: T): T {
  const c = canvas as unknown as AnyObj & {
    width?: number; height?: number; style?: AnyObj;
    addEventListener?: unknown; removeEventListener?: unknown;
    getBoundingClientRect?: unknown; remove?: unknown;
    clientWidth?: number; clientHeight?: number;
  };
  if (!c.style) c.style = {};
  if (typeof c.addEventListener !== 'function') c.addEventListener = () => {};
  if (typeof c.removeEventListener !== 'function') c.removeEventListener = () => {};
  if (typeof c.remove !== 'function') c.remove = () => {};
  if (typeof c.getBoundingClientRect !== 'function') {
    c.getBoundingClientRect = () => ({
      left: 0, top: 0, right: c.width ?? 0, bottom: c.height ?? 0, width: c.width ?? 0, height: c.height ?? 0,
    });
  }
  if (c.clientWidth === undefined) {
    try {
      Object.defineProperty(c, 'clientWidth', { get() { return c.width ?? 0; }, configurable: true });
      Object.defineProperty(c, 'clientHeight', { get() { return c.height ?? 0; }, configurable: true });
    } catch { /* 已不可配置则忽略 */ }
  }
  return canvas;
}

let installed = false;

export function installWeappAdapter(): void {
  if (installed) return;
  installed = true;

  const g = globalThis as unknown as AnyObj & {
    self?: unknown; window?: AnyObj; document?: AnyObj; navigator?: AnyObj;
    HTMLCanvasElement?: unknown; HTMLImageElement?: unknown; HTMLElement?: unknown;
  };

  const sys =
    typeof wx !== 'undefined'
      ? wx.getSystemInfoSync()
      : ({ windowWidth: 375, windowHeight: 667, pixelRatio: 2 } as { windowWidth: number; windowHeight: number; pixelRatio: number });

  const createEl = (name: string): unknown => {
    const n = String(name).toLowerCase();
    if (n === 'canvas') return patchCanvas(wx.createCanvas());
    if (n === 'img' || n === 'image') return wx.createImage();
    return { style: {}, setAttribute() {}, appendChild() {}, addEventListener() {}, removeEventListener() {} };
  };

  // 安全赋值：宿主对象的属性可能只读（Node/浏览器的 navigator.userAgent 等）→ 吞掉异常，不崩。
  const set = (obj: AnyObj, key: string, val: unknown): void => {
    try {
      if (obj[key] === undefined) obj[key] = val;
    } catch { /* 只读属性忽略 */ }
  };

  if (typeof g.self === 'undefined') g.self = g;

  // document：three 用 createElementNS('canvas') 建内部画布；偶用 getElementById；可见性监听 no-op。
  if (typeof g.document === 'undefined') {
    g.document = {
      createElementNS: (_ns: string, name: string) => createEl(name),
      createElement: (name: string) => createEl(name),
      getElementById: () => null,
      addEventListener: () => {},
      removeEventListener: () => {},
      hidden: false,
      readyState: 'complete',
      documentElement: { style: {} },
      body: { appendChild: () => {}, removeChild: () => {}, style: {} },
    };
  }

  // window：尺寸 / dpr / 事件 no-op。微信里 window 即全局。
  if (typeof g.window === 'undefined') g.window = g;
  const w = g.window;
  set(w, 'innerWidth', sys.windowWidth);
  set(w, 'innerHeight', sys.windowHeight);
  set(w, 'devicePixelRatio', sys.pixelRatio || 1);
  if (typeof w.addEventListener !== 'function') set(w, 'addEventListener', () => {});
  if (typeof w.removeEventListener !== 'function') set(w, 'removeEventListener', () => {});

  // navigator：three 读 userAgent 做能力/兼容分支。
  if (typeof g.navigator === 'undefined') g.navigator = {};
  set(g.navigator, 'userAgent', 'WeChatMiniGame');
  set(g.navigator, 'platform', 'WeChat');

  // instanceof 守卫：三方库偶用 data instanceof HTMLImageElement/HTMLCanvasElement；给空类避免抛错。
  if (typeof g.HTMLElement === 'undefined') g.HTMLElement = class {};
  if (typeof g.HTMLCanvasElement === 'undefined') g.HTMLCanvasElement = class {};
  if (typeof g.HTMLImageElement === 'undefined') g.HTMLImageElement = class {};
}
