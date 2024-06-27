import { V2 } from "./vector";

export type M3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number],
];

export function multiplyM3V2(mat: M3, v2: V2): V2 {
  const [[a, b, u], [c, d, v], [e, f, w]] = mat;
  const [x, y, z] = [...v2, 1];
  const res = [
    a * x + b * y + u * z,
    c * x + d * y + v * z,
    e * x + f * y + w * z,
  ];
  return [res[0], res[1]];
}

export function multiplyM3M3(mat1: M3, mat2: M3, ...mats: M3[]): M3 {
  let res: M3 = mat1;
  for (const m of [mat2, ...mats]) {
    const [[a1, b1, u1], [c1, d1, v1], [e1, f1, w1]] = res;
    const [[a2, b2, u2], [c2, d2, v2], [e2, f2, w2]] = m;
    res = [
      [
        a1 * a2 + b1 * c2 + u1 * e2,
        a1 * b2 + b1 * d2 + u1 * f2,
        a1 * u2 + b1 * v2 + u1 * w2,
      ],
      [
        c1 * a2 + d1 * c2 + v1 * e2,
        c1 * b2 + d1 * d2 + v1 * f2,
        c1 * u2 + d1 * v2 + v1 * w2,
      ],
      [
        e1 * a2 + f1 * c2 + w1 * e2,
        e1 * b2 + f1 * d2 + w1 * f2,
        e1 * u2 + f1 * v2 + w1 * w2,
      ],
    ];
  }
  return res;
}

/**
 * Construct a matrix which apply transforms in reverse order
 * @param mat1
 * @param mat2
 * @param mats
 * @returns
 */
export function composeTransformation(mat1: M3, mat2: M3, ...mats: M3[]): M3 {
  let _mat1 = mat2;
  let _mat2 = mat1;
  let remaining: M3[] = [];
  if (mats.length >= 2) {
    _mat1 = mats[mats.length - 1];
    _mat2 = mats[mats.length - 2];
    remaining = [...mats.slice(0, mats.length - 2), mat2, mat1];
  } else if (mats.length === 1) {
    _mat1 = mats[mats.length - 1];
    _mat2 = mat2;
    remaining = [mat1];
  }
  return multiplyM3M3(_mat1, _mat2, ...remaining);
}

export function translate(x: number, y: number): M3 {
  return [
    [1, 0, x],
    [0, 1, y],
    [0, 0, 1],
  ];
}

export function scale(x: number, y: number = x): M3 {
  return [
    [x, 0, 0],
    [0, y, 0],
    [0, 0, 1],
  ];
}
