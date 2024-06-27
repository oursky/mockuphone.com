import { M3, multiplyM3V2 } from "./matrix";
import { V2 } from "./vector";

type Point = V2;
export type Quad = [Point, Point, Point, Point];

export function center(quad: Quad): Point {
  const minX = Math.min(...quad.map((c) => c[0]));
  const maxX = Math.max(...quad.map((c) => c[0]));
  const minY = Math.min(...quad.map((c) => c[1]));
  const maxY = Math.max(...quad.map((c) => c[1]));
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

export function transformWithMatrix(quad: Quad, mat: M3): Quad {
  const [p1, p2, p3, p4] = quad;
  return [
    multiplyM3V2(mat, p1),
    multiplyM3V2(mat, p2),
    multiplyM3V2(mat, p3),
    multiplyM3V2(mat, p4),
  ];
}
