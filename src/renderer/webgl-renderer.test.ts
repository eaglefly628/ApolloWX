import { describe, it, expect } from 'vitest';
import { WebGLRenderer } from './webgl-renderer.js';
import { Engine } from '@runtime/engine.js';
import { playground3dBlueprint } from '../assembly/playground3d.assembly.js';

// 假 WebGL 上下文：实现 WebGLRenderer 用到的方法/常量，记录绘制调用。
// 无需真 GPU 即可端到端验证「数据 → 收集 → 每实体一次 drawElements」的渲染胶水。
function fakeGL() {
  const calls = { drawElements: 0, clear: 0, useProgram: 0, bufferData: 0 };
  const gl: Record<string, unknown> = {
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4,
    ARRAY_BUFFER: 5, ELEMENT_ARRAY_BUFFER: 6, STATIC_DRAW: 7, DEPTH_TEST: 8,
    COLOR_BUFFER_BIT: 16, DEPTH_BUFFER_BIT: 32, TRIANGLES: 4, UNSIGNED_SHORT: 9, FLOAT: 10,
    createShader: () => ({}), shaderSource: () => {}, compileShader: () => {},
    getShaderParameter: () => true, getShaderInfoLog: () => '',
    createProgram: () => ({}), attachShader: () => {}, linkProgram: () => {},
    getProgramParameter: () => true, getProgramInfoLog: () => '',
    getAttribLocation: () => 0, getUniformLocation: () => ({}),
    createBuffer: () => ({}), bindBuffer: () => {}, bufferData: () => { calls.bufferData++; },
    enable: () => {}, viewport: () => {}, clearColor: () => {},
    clear: () => { calls.clear++; }, useProgram: () => { calls.useProgram++; },
    enableVertexAttribArray: () => {}, vertexAttribPointer: () => {},
    uniformMatrix4fv: () => {}, uniform3fv: () => {},
    drawElements: () => { calls.drawElements++; },
    deleteBuffer: () => {}, deleteProgram: () => {},
  };
  return { gl: gl as unknown as WebGLRenderingContext, calls };
}

describe('WebGLRenderer', () => {
  it('init 编译着色器/建几何，sync 为每个 Mesh3D 实体发一次 drawElements', () => {
    const { gl, calls } = fakeGL();
    const r = new WebGLRenderer({ gl, width: 320, height: 480 });
    r.init();
    expect(calls.bufferData).toBe(3); // 位置 + 法线 + 索引三个 buffer

    const engine = new Engine();
    engine.load(playground3dBlueprint); // 3 个 Mesh3D 实体
    r.sync(engine.world);

    expect(calls.clear).toBe(1);
    expect(calls.useProgram).toBe(1);
    expect(calls.drawElements).toBe(3); // 每实体一次
  });

  it('空世界 sync 不绘制也不抛', () => {
    const { gl, calls } = fakeGL();
    const r = new WebGLRenderer({ gl });
    r.init();
    const engine = new Engine();
    expect(() => r.sync(engine.world)).not.toThrow();
    expect(calls.drawElements).toBe(0);
  });

  it('未 init 时 sync 安全空转', () => {
    const r = new WebGLRenderer({});
    const engine = new Engine();
    expect(() => r.sync(engine.world)).not.toThrow();
  });
});
