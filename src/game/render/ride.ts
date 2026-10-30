// Ride playback maths, kept pure so it can be unit-tested. The cart's motion comes only from
// the recorded SimResult.path (see render/CLAUDE.md); this file just interpolates between its
// points and adds the short visual effect after a failed ride. Nothing here decides anything.

import type { FailReason, PathPoint } from '../../core';

// Where the cart is drawn: on the track at (x, y), tilted by `angle` (radians, the slope's
// angle). `spark` (0–1) grows the crash spark; it's 0 when there isn't one.
export interface CartPose {
  x: number;
  y: number;
  angle: number;
  spark: number;
}

// How long the fail effect plays after the path ends, in seconds.
export const FAIL_EFFECT_SECONDS = 0.9;

// With prefers-reduced-motion the ride plays this many times faster and the fail effect is
// skipped (its last frame shows straight away).
export const REDUCED_MOTION_SPEED = 3;

// The cart's pose at time t along the path, interpolating linearly between the two recorded
// points around t. Before the first point it sits on the first; after the last, on the last.
export function poseAt(path: readonly PathPoint[], t: number): CartPose | null {
  const first = path[0];
  const last = path.at(-1);
  if (!first || !last) return null;
  if (t <= first.t) return { x: first.x, y: first.y, angle: first.angle, spark: 0 };
  if (t >= last.t) return { x: last.x, y: last.y, angle: last.angle, spark: 0 };

  // Binary search for the last point at or before t.
  let lo = 0;
  let hi = path.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (path[mid]!.t <= t) lo = mid;
    else hi = mid;
  }
  const a = path[lo]!;
  const b = path[hi]!;
  const k = (t - a.t) / (b.t - a.t);
  return {
    x: a.x + (b.x - a.x) * k,
    y: a.y + (b.y - a.y) * k,
    angle: a.angle + (b.angle - a.angle) * k,
    spark: 0,
  };
}

// The cart's pose `k` of the way (0–1) through the fail effect that follows the path's last
// point. A crash sparks, a flown-off cart tumbles away along its last direction and falls, and
// a stalled cart wobbles back and forth as it settles. Other fails just stop.
export function failPose(
  path: readonly PathPoint[],
  reason: FailReason | undefined,
  k: number,
): CartPose | null {
  const end = poseAt(path, Infinity);
  if (!end) return null;
  const s = Math.min(Math.max(k, 0), 1);
  const dirX = Math.cos(end.angle);
  const dirY = Math.sin(end.angle);

  if (reason === 'HIT_OBSTACLE') return { ...end, spark: s };

  if (reason === 'FLEW_OFF') {
    const v = lastSpeed(path);
    const t = s * FAIL_EFFECT_SECONDS;
    return {
      x: end.x + dirX * v * t,
      y: end.y + dirY * v * t - 4.9 * t * t,
      angle: end.angle - s * 2 * Math.PI, // one full turn, clockwise as it heads right
      spark: 0,
    };
  }

  if (reason === 'STALLED') {
    // It rolls back a little and rocks to rest, in world units along the track.
    const along = -0.25 * Math.sin(s * 3 * Math.PI) * (1 - s);
    return { ...end, x: end.x + dirX * along, y: end.y + dirY * along };
  }

  return end;
}

// The cart's speed over the last recorded step, in world units per second.
function lastSpeed(path: readonly PathPoint[]): number {
  const a = path.at(-2);
  const b = path.at(-1);
  if (!a || !b || b.t <= a.t) return 0;
  return Math.hypot(b.x - a.x, b.y - a.y) / (b.t - a.t);
}

// Whether a fail reason has an effect worth playing after the path ends.
export function hasFailEffect(reason: FailReason | undefined): boolean {
  return reason === 'HIT_OBSTACLE' || reason === 'FLEW_OFF' || reason === 'STALLED';
}
