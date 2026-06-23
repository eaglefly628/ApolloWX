import type { IWorld, RendererBackend } from '@engine/core/types.js';
import type { Mesh3D, Shape } from '@engine/protocol/components.js';
import { collectRenderables, chooseRenderMode, type Renderable } from './renderable.js';
import { renderablePose, poseBounds, fitPerspective, mesh3dDepth, flipEuler, type Pose3D } from './three-projection.js';
import { perspective, lookAt, model, multiply, type Mat4 } from './mat4.js';

// ═══════════════════════════════════════════════════════════════
//  WebGLRenderer —— **零依赖**的通用 3D 渲染后端（RendererBackend 的原生 WebGL 实现）。
//  与 Canvas/Ascii/Three 后端**读同一份 collectRenderables**：Mesh3D→有体积 box / 薄片 plane，
//  普通 Shape+Color→着色立方块；Transform 给位姿、相机自适配包围盒、简单方向光着色。
//
//  为什么不直接用 ThreeRenderer：three.js 在微信小游戏需整套 weapp-adapter 垫片(window/document/...)，
//  体积大且易碎。本后端只用裸 WebGL 调用 + 注入的 canvas/gl，**保证在 wx.createCanvas('webgl') 上能跑**、
//  打包仅几 KB。投影/几何复用 three-projection 的纯函数（已单测），与 ThreeRenderer 行为一致。
//
//  **纯表现**：只读 world、只写 GPU，不写 sim、不进 hash。仅 init/sync 触碰 WebGL。
//  注：basic 后端用 frontTint 单色 + 光照区分各面；backTint/edgeTint/贴图属进阶，暂未实现。
// ═══════════════════════════════════════════════════════════════

export interface WebGLRendererOptions {
  width?: number;
  height?: number;
  background?: number; // 0xRRGGBB
  fov?: number; // 透视 fov（度）
  zStep?: number; // zOrder → z 深度步长
  /** 平台 WebGL canvas（微信 wx.createCanvas()）。提供则不依赖 DOM。 */
  canvas?: HTMLCanvasElement;
  /** 直接注入 gl 上下文（测试/特殊宿主）。优先级高于 canvas。 */
  gl?: WebGLRenderingContext;
}

const VERT = `
attribute vec3 aPos;
attribute vec3 aNormal;
uniform mat4 uProj;
uniform mat4 uView;
uniform mat4 uModel;
varying vec3 vNormal;
void main() {
  vNormal = mat3(uModel) * aNormal;
  gl_Position = uProj * uView * uModel * vec4(aPos, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec3 vNormal;
uniform vec3 uColor;
void main() {
  vec3 n = normalize(vNormal);
  vec3 lightDir = normalize(vec3(0.4, 0.7, 1.0));
  float diff = max(dot(n, lightDir), 0.0);
  float l = 0.45 + 0.65 * diff; // 环境 + 漫反射
  gl_FragColor = vec4(uColor * l, 1.0);
}`;

// 单位立方体 [-0.5,0.5]^3：每面 4 顶点（带面法线）、共 24 顶点 / 36 索引。
function unitCube(): { positions: Float32Array; normals: Float32Array; indices: Uint16Array } {
  const faces = [
    { n: [0, 0, 1], v: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]] }, // +z
    { n: [0, 0, -1], v: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]] }, // -z
    { n: [1, 0, 0], v: [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]] }, // +x
    { n: [-1, 0, 0], v: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]] }, // -x
    { n: [0, 1, 0], v: [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]] }, // +y
    { n: [0, -1, 0], v: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]] }, // -y
  ];
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  faces.forEach((f, fi) => {
    for (const p of f.v) {
      positions.push(p[0], p[1], p[2]);
      normals.push(f.n[0], f.n[1], f.n[2]);
    }
    const o = fi * 4;
    indices.push(o, o + 1, o + 2, o, o + 2, o + 3);
  });
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint16Array(indices) };
}

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error('WebGLRenderer: shader 编译失败 — ' + gl.getShaderInfoLog(sh));
  }
  return sh;
}

export class WebGLRenderer implements RendererBackend {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private posBuf: WebGLBuffer | null = null;
  private normBuf: WebGLBuffer | null = null;
  private idxBuf: WebGLBuffer | null = null;
  private idxCount = 0;
  private loc: {
    aPos: number; aNormal: number;
    uProj: WebGLUniformLocation | null; uView: WebGLUniformLocation | null;
    uModel: WebGLUniformLocation | null; uColor: WebGLUniformLocation | null;
  } | null = null;

  private readonly width: number;
  private readonly height: number;
  private readonly bg: [number, number, number];
  private readonly fov: number;
  private readonly zStep: number;
  private canvas?: HTMLCanvasElement;

  constructor(private readonly opts: WebGLRendererOptions = {}) {
    this.width = opts.width ?? 640;
    this.height = opts.height ?? 400;
    this.fov = opts.fov ?? 50;
    this.zStep = opts.zStep ?? 0.01;
    const bg = opts.background ?? 0x0a0a14;
    this.bg = [((bg >> 16) & 0xff) / 255, ((bg >> 8) & 0xff) / 255, (bg & 0xff) / 255];
  }

  init(container?: HTMLElement): void {
    // 取 gl：注入 > 平台 canvas > 浏览器自建。
    let gl = this.opts.gl ?? null;
    if (!gl) {
      const canvas = this.opts.canvas ?? (typeof document !== 'undefined' ? document.createElement('canvas') : null);
      if (!canvas) throw new Error('WebGLRenderer: 无 canvas/gl，且当前环境无 document');
      canvas.width = this.width;
      canvas.height = this.height;
      const style = (canvas as { style?: CSSStyleDeclaration }).style;
      if (style) { style.width = `${this.width}px`; style.height = `${this.height}px`; }
      if (container && !this.opts.canvas) container.appendChild(canvas);
      this.canvas = canvas;
      gl = (canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    }
    if (!gl) throw new Error('WebGLRenderer: 无法获取 WebGL 上下文');
    this.gl = gl;

    const program = gl.createProgram()!;
    gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('WebGLRenderer: program 链接失败 — ' + gl.getProgramInfoLog(program));
    }
    this.program = program;
    this.loc = {
      aPos: gl.getAttribLocation(program, 'aPos'),
      aNormal: gl.getAttribLocation(program, 'aNormal'),
      uProj: gl.getUniformLocation(program, 'uProj'),
      uView: gl.getUniformLocation(program, 'uView'),
      uModel: gl.getUniformLocation(program, 'uModel'),
      uColor: gl.getUniformLocation(program, 'uColor'),
    };

    const cube = unitCube();
    this.posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, cube.positions, gl.STATIC_DRAW);
    this.normBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuf);
    gl.bufferData(gl.ARRAY_BUFFER, cube.normals, gl.STATIC_DRAW);
    this.idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cube.indices, gl.STATIC_DRAW);
    this.idxCount = cube.indices.length;

    gl.enable(gl.DEPTH_TEST);
    gl.viewport(0, 0, this.width, this.height);
  }

  // shape → 世界尺寸（box: w/h；circle: 2r；缺省 32）。
  private shapeSize(s: Shape | undefined): { w: number; h: number } {
    if (!s) return { w: 32, h: 32 };
    if (s.kind === 'circle') { const d = (s.radius ?? 16) * 2; return { w: d, h: d }; }
    return { w: s.width ?? 32, h: s.height ?? 32 };
  }

  sync(world: IWorld): void {
    const gl = this.gl;
    const loc = this.loc;
    if (!gl || !loc || !this.program) return;

    // 收集要画的实体 + 其模型矩阵 + 颜色。
    const draws: Array<{ m: Mat4; color: [number, number, number] }> = [];
    const poses: Pose3D[] = [];

    for (const r of collectRenderables(world)) {
      const pose = renderablePose(r, this.zStep);
      if (r.mesh3d) {
        const m3 = r.mesh3d;
        const depth = mesh3dDepth(m3.shape, m3.width, m3.height, m3.depth);
        const fe = flipEuler(r.rotation, m3.flipAxis);
        const sz = m3.shape === 'plane' ? Math.max(depth, 1) : depth;
        draws.push({
          m: model(pose.x, pose.y, pose.z, fe.x, fe.y, 0, m3.width * pose.sx, m3.height * pose.sy, sz),
          color: hexToRgb(m3.frontTint),
        });
        poses.push(pose);
        continue;
      }
      // 普通 2D 实体：sprite/text 在本基础 3D 后端退化为着色块（无贴图）；none 跳过。
      const mode = chooseRenderMode(r, false);
      if (mode === 'none') continue;
      const { w, h } = this.shapeSize(r.shape);
      draws.push({
        m: model(pose.x, pose.y, pose.z, 0, 0, pose.rotZ, w * pose.sx, h * pose.sy, Math.max(2, Math.min(w, h) * 0.1)),
        color: hexToRgb(r.color?.tint ?? 0xcccccc),
      });
      poses.push(pose);
    }

    // 相机自适配：框住全场包围盒。
    const fit = fitPerspective(poseBounds(poses), this.fov, this.width / this.height);
    const proj = perspective((this.fov * Math.PI) / 180, this.width / this.height, 0.1, fit.dist * 4 + 2000);
    const view = lookAt([fit.cx, fit.cy, fit.dist], [fit.cx, fit.cy, 0], [0, 1, 0]);

    gl.clearColor(this.bg[0], this.bg[1], this.bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.enableVertexAttribArray(loc.aPos);
    gl.vertexAttribPointer(loc.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuf);
    gl.enableVertexAttribArray(loc.aNormal);
    gl.vertexAttribPointer(loc.aNormal, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuf);

    gl.uniformMatrix4fv(loc.uProj, false, proj);
    gl.uniformMatrix4fv(loc.uView, false, view);
    for (const d of draws) {
      gl.uniformMatrix4fv(loc.uModel, false, d.m);
      gl.uniform3fv(loc.uColor, d.color);
      gl.drawElements(gl.TRIANGLES, this.idxCount, gl.UNSIGNED_SHORT, 0);
    }
  }

  destroy(): void {
    const gl = this.gl;
    if (gl) {
      if (this.posBuf) gl.deleteBuffer(this.posBuf);
      if (this.normBuf) gl.deleteBuffer(this.normBuf);
      if (this.idxBuf) gl.deleteBuffer(this.idxBuf);
      if (this.program) gl.deleteProgram(this.program);
    }
    this.canvas?.remove?.();
    this.gl = null;
    this.program = null;
  }
}

function hexToRgb(hex: number): [number, number, number] {
  return [((hex >> 16) & 0xff) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255];
}
