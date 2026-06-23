import { describe, it, expect } from 'vitest';
import { identity, multiply, perspective, lookAt, model } from './mat4.js';

const near = (a: number, b: number, eps = 1e-5) => Math.abs(a - b) < eps;
const vecNear = (a: ArrayLike<number>, b: number[]) =>
  b.every((v, i) => near(a[i], v));

// 把列主序 4x4 矩阵作用到列向量 [x,y,z,w]。
function apply(m: Float32Array, v: [number, number, number, number]): number[] {
  const out = [0, 0, 0, 0];
  for (let r = 0; r < 4; r++)
    out[r] = m[0 + r] * v[0] + m[4 + r] * v[1] + m[8 + r] * v[2] + m[12 + r] * v[3];
  return out;
}

describe('mat4', () => {
  it('identity 是乘法单位元', () => {
    const a = perspective(1, 1.5, 0.1, 100);
    expect(vecNear(multiply(a, identity()), Array.from(a))).toBe(true);
    expect(vecNear(multiply(identity(), a), Array.from(a))).toBe(true);
  });

  it('model 平移把原点搬到 (tx,ty,tz)', () => {
    const m = model(3, -4, 5, 0, 0, 0, 1, 1, 1);
    expect(vecNear(apply(m, [0, 0, 0, 1]), [3, -4, 5, 1])).toBe(true);
  });

  it('model 缩放作用于坐标', () => {
    const m = model(0, 0, 0, 0, 0, 0, 2, 3, 4);
    expect(vecNear(apply(m, [1, 1, 1, 1]), [2, 3, 4, 1])).toBe(true);
  });

  it('model 绕 z 旋转 90° 把 +x 变 +y', () => {
    const m = model(0, 0, 0, 0, 0, Math.PI / 2, 1, 1, 1);
    expect(vecNear(apply(m, [1, 0, 0, 1]), [0, 1, 0, 1])).toBe(true);
  });

  it('model 绕 y 旋转 90° 把 +z 变 +x', () => {
    const m = model(0, 0, 0, 0, Math.PI / 2, 0, 1, 1, 1);
    expect(vecNear(apply(m, [0, 0, 1, 1]), [1, 0, 0, 1])).toBe(true);
  });

  it('lookAt 把相机位置映射到原点（视图空间）', () => {
    const v = lookAt([0, 0, 10], [0, 0, 0], [0, 1, 0]);
    expect(vecNear(apply(v, [0, 0, 10, 1]), [0, 0, 0, 1])).toBe(true);
  });

  it('perspective 把近裁剪面中心点投到 z=-1（NDC 前）', () => {
    const p = perspective(Math.PI / 2, 1, 1, 100);
    const clip = apply(p, [0, 0, -1, 1]); // 近面中心
    // 透视除法后 z/w 应为 -1（近裁剪面）。
    expect(near(clip[2] / clip[3], -1)).toBe(true);
  });
});
