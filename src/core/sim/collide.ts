// An obstacle in world units, as a level describes it (see level/CLAUDE.md).
export type Obstacle =
  | { kind: 'rect'; x: number; y: number; w: number; h: number } // x, y = bottom-left
  | { kind: 'circle'; x: number; y: number; r: number };

// True when a circle at (cx, cy) with radius r touches the obstacle (edges touching counts).
export function circleTouches(cx: number, cy: number, r: number, o: Obstacle): boolean {
  if (o.kind === 'circle') {
    const dx = cx - o.x;
    const dy = cy - o.y;
    const reach = r + o.r;
    return dx * dx + dy * dy <= reach * reach;
  }
  // Distance from the circle's center to the nearest point of the rectangle.
  const dx = cx - clamp(cx, o.x, o.x + o.w);
  const dy = cy - clamp(cy, o.y, o.y + o.h);
  return dx * dx + dy * dy <= r * r;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
