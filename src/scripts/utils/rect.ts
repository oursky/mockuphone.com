import { Quad } from "./quad";

export interface Rect {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export function fromDimension(width: number, height: number): Rect {
  return {
    width,
    height,
    centerX: width / 2,
    centerY: height / 2,
  };
}

export function fromQuad(quad: Quad): Rect {
  const minX = Math.min(...quad.map((c) => c[0]));
  const maxX = Math.max(...quad.map((c) => c[0]));
  const minY = Math.min(...quad.map((c) => c[1]));
  const maxY = Math.max(...quad.map((c) => c[1]));
  return {
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}
