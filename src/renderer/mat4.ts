// 极简 4x4 矩阵数学（列主序 Float32Array(16)，WebGL 约定）。零依赖、纯函数 → node 可单测。
// 仅覆盖渲染所需：perspective / lookAt / 模型变换（平移·欧拉旋转·缩放）。不进 sim、不进 hash。

export type Mat4 = Float32Array;

export function identity(): Mat4 {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

// out = a * b（列主序）。out 可与 a/b 不同；省略则新建。
export function multiply(a: Mat4, b: Mat4, out: Mat4 = new Float32Array(16)): Mat4 {
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  for (let i = 0; i < 4; i++) {
    const b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
    out[i * 4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[i * 4 + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[i * 4 + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[i * 4 + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  }
  return out;
}

// 透视投影矩阵。fovy 弧度；aspect=宽/高。
export function perspective(fovy: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) * nf;
  m[11] = -1;
  m[14] = 2 * far * near * nf;
  return m;
}

// 视图矩阵：相机在 eye、看向 center、上方向 up。
export function lookAt(
  eye: readonly [number, number, number],
  center: readonly [number, number, number],
  up: readonly [number, number, number],
): Mat4 {
  let zx = eye[0] - center[0], zy = eye[1] - center[1], zz = eye[2] - center[2];
  let zl = Math.hypot(zx, zy, zz) || 1;
  zx /= zl; zy /= zl; zz /= zl;
  let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
  const xl = Math.hypot(xx, xy, xz) || 1;
  xx /= xl; xy /= xl; xz /= xl;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  const m = new Float32Array(16);
  m[0] = xx; m[1] = yx; m[2] = zx; m[3] = 0;
  m[4] = xy; m[5] = yy; m[6] = zy; m[7] = 0;
  m[8] = xz; m[9] = yz; m[10] = zz; m[11] = 0;
  m[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
  m[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
  m[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
  m[15] = 1;
  return m;
}

// 模型矩阵 = T · Rx · Ry · Rz · S（先缩放、再绕 z/y/x 旋转、最后平移）。
export function model(
  tx: number, ty: number, tz: number,
  rx: number, ry: number, rz: number,
  sx: number, sy: number, sz: number,
): Mat4 {
  const cx = Math.cos(rx), sxr = Math.sin(rx);
  const cy = Math.cos(ry), syr = Math.sin(ry);
  const cz = Math.cos(rz), szr = Math.sin(rz);
  // 旋转矩阵 R = Rx·Ry·Rz（行向量展开），列主序写入。
  const r00 = cy * cz, r01 = -cy * szr, r02 = syr;
  const r10 = sxr * syr * cz + cx * szr, r11 = -sxr * syr * szr + cx * cz, r12 = -sxr * cy;
  const r20 = -cx * syr * cz + sxr * szr, r21 = cx * syr * szr + sxr * cz, r22 = cx * cy;
  const m = new Float32Array(16);
  m[0] = r00 * sx; m[1] = r10 * sx; m[2] = r20 * sx; m[3] = 0;
  m[4] = r01 * sy; m[5] = r11 * sy; m[6] = r21 * sy; m[7] = 0;
  m[8] = r02 * sz; m[9] = r12 * sz; m[10] = r22 * sz; m[11] = 0;
  m[12] = tx; m[13] = ty; m[14] = tz; m[15] = 1;
  return m;
}
