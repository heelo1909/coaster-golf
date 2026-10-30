// Turns pointer and wheel input on the canvas into zoom, pan and tap: pinch with two fingers,
// scroll (or trackpad-pinch) to zoom toward the cursor, drag to pan, double-click or
// double-tap to fit the whole level again. A press that barely moves is a tap (it skips a
// ride). The maths is in pure helpers so it can be tested.

// How far (px) a press may wander and still count as a tap rather than a drag.
export const TAP_SLOP = 6;

type Point = { x: number; y: number };

// The zoom factor for one wheel event. A trackpad pinch arrives as a wheel event with ctrlKey
// and small deltas, so it gets a stronger rate. Line-based deltas (deltaMode 1) are about 16px.
export function wheelFactor(deltaY: number, deltaMode: number, ctrlKey: boolean): number {
  const px = deltaMode === 1 ? deltaY * 16 : deltaY;
  return Math.exp(-px * (ctrlKey ? 0.01 : 0.0015));
}

// One step of a two-finger gesture: how much it zoomed (the change in finger spread), about
// which point (the old midpoint), and how far the midpoint moved (a pan).
export function pinchStep(
  before: readonly [Point, Point],
  after: readonly [Point, Point],
): { factor: number; at: Point; dx: number; dy: number } {
  const spread = (p: readonly [Point, Point]) => Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  const mid = (p: readonly [Point, Point]) => ({
    x: (p[0].x + p[1].x) / 2,
    y: (p[0].y + p[1].y) / 2,
  });
  const a = mid(before);
  const b = mid(after);
  const s0 = spread(before);
  return { factor: s0 > 0 ? spread(after) / s0 : 1, at: a, dx: b.x - a.x, dy: b.y - a.y };
}

export interface GestureHandlers {
  zoomAt(factor: number, sx: number, sy: number): void;
  panBy(dx: number, dy: number): void;
  tap(): void;
  reset(): void;
}

export function attachGestures(canvas: HTMLCanvasElement, on: GestureHandlers): void {
  const pointers = new Map<number, Point>();
  let pressStart: Point | null = null; // set while a one-finger press could still be a tap

  // Pointer position in CSS px within the canvas.
  function local(e: { clientX: number; clientY: number }): Point {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.set(e.pointerId, p);
    pressStart = pointers.size === 1 ? p : null; // a second finger is never a tap
  });

  canvas.addEventListener('pointermove', (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const p = local(e);
    if (pointers.size === 1) {
      if (pressStart && Math.hypot(p.x - pressStart.x, p.y - pressStart.y) <= TAP_SLOP) return;
      pressStart = null;
      on.panBy(p.x - prev.x, p.y - prev.y);
      pointers.set(e.pointerId, p);
      return;
    }
    if (pointers.size === 2) {
      const [idA, idB] = [...pointers.keys()];
      const before = [pointers.get(idA!)!, pointers.get(idB!)!] as const;
      pointers.set(e.pointerId, p);
      const after = [pointers.get(idA!)!, pointers.get(idB!)!] as const;
      const step = pinchStep(before, after);
      on.zoomAt(step.factor, step.at.x, step.at.y);
      on.panBy(step.dx, step.dy);
    }
  });

  function release(e: PointerEvent): void {
    if (!pointers.delete(e.pointerId)) return;
    if (e.type === 'pointerup' && pressStart && pointers.size === 0) on.tap();
    pressStart = null;
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault(); // zoom the track, not the page
      const p = local(e);
      on.zoomAt(wheelFactor(e.deltaY, e.deltaMode, e.ctrlKey), p.x, p.y);
    },
    { passive: false },
  );

  canvas.addEventListener('dblclick', () => on.reset());
}
