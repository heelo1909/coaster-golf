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
  return speedAt(path, Infinity);
}

// The cart's speed at time t, in world units per second: the distance over the recorded step
// around t. 0 before the path starts or with fewer than two points; after the end, the last
// step's speed. The rolling sound follows it.
export function speedAt(path: readonly PathPoint[], t: number): number {
  if (path.length < 2 || t < path[0]!.t) return 0;
  // Binary search for the first point at or after t (the last point when t is past it).
  let lo = 1;
  let hi = path.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (path[mid]!.t < t) lo = mid + 1;
    else hi = mid;
  }
  const a = path[lo - 1]!;
  const b = path[lo]!;
  if (b.t <= a.t) return 0;
  return Math.hypot(b.x - a.x, b.y - a.y) / (b.t - a.t);
}

// Whether a fail reason has an effect worth playing after the path ends.
export function hasFailEffect(reason: FailReason | undefined): boolean {
  return reason === 'HIT_OBSTACLE' || reason === 'FLEW_OFF' || reason === 'STALLED';
}

// The cart rocks on its wheels as it rides: a small extra tilt (radians) that swings back and
// forth at WOBBLE_HZ, sized by how fast the track is turning around t. It's 0 on a straight,
// never more than WOBBLE_MAX, and settles to 0 over the ride's last WOBBLE_SETTLE seconds, so
// the cart comes to rest level with the track. Only the drawing tilts; the path is untouched.
export const WOBBLE_MAX = 0.12;
const WOBBLE_HZ = 3.5;
const WOBBLE_GAIN = 0.04; // radians of tilt per radian per second of turning
const WOBBLE_WINDOW = 0.15; // seconds either side of t over which the turning is averaged
const WOBBLE_SETTLE = 0.3;

export function wobbleAt(path: readonly PathPoint[], t: number): number {
  const first = path[0];
  const last = path.at(-1);
  if (!first || !last || t <= first.t || t >= last.t) return 0;
  const before = poseAt(path, Math.max(t - WOBBLE_WINDOW, first.t))!;
  const after = poseAt(path, Math.min(t + WOBBLE_WINDOW, last.t))!;
  const turning = Math.abs(after.angle - before.angle) / (2 * WOBBLE_WINDOW);
  const size = Math.min(turning * WOBBLE_GAIN, WOBBLE_MAX);
  const settle = Math.min((last.t - t) / WOBBLE_SETTLE, (t - first.t) / WOBBLE_SETTLE, 1);
  return size * settle * Math.sin(2 * Math.PI * WOBBLE_HZ * t);
}
