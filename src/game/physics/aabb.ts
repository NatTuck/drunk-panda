export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function overlaps(a: Rect, b: Rect, epsilon = 0): boolean {
  return (
    a.x + a.w > b.x + epsilon &&
    a.x < b.x + b.w - epsilon &&
    a.y + a.h > b.y + epsilon &&
    a.y < b.y + b.h - epsilon
  );
}

export function overlapsHorizontally(a: Rect, b: Rect, epsilon = 0): boolean {
  return a.x + a.w > b.x + epsilon && a.x < b.x + b.w - epsilon;
}

export function rectCenter(rect: Rect): { x: number; y: number } {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}
