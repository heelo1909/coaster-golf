import { circleTouches } from './collide';
import type { Obstacle } from './collide';
import {
  CART_RADIUS,
  DT,
  JUMP_THRESHOLD,
  MAX_SLOPE,
  MAX_TIME,
  PATH_EVERY,
  STATION_TOLERANCE,
} from './constants';
import { startCart, stepCart } from './physics';
import type { Cart } from './physics';
import { sampleTrack } from './track';
import type { Track } from './track';

export type FailReason =
  | 'FLEW_OFF'
  | 'STALLED'
  | 'HIT_OBSTACLE'
  | 'OUT_OF_BOUNDS'
  | 'BROKEN_TRACK'
  | 'MISSED_START'
  | 'MISSED_END'
  | 'TIMEOUT';

export interface PathPoint {
  t: number;
  x: number;
  y: number;
  angle: number;
}

export interface SimResult {
  success: boolean;
  reason?: FailReason;
  failAt?: { x: number; y: number; t: number };
  path: PathPoint[]; // for the renderer
  duration: number;
}

// The parts of a level the simulation reads. Section 4's full Level has all of these, so it
// can be passed straight in.
export interface SimLevel {
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  start: { x: number; y: number; speed: number };
  end: { x: number; y: number };
  obstacles: readonly Obstacle[];
}

// Whole steps in MAX_TIME. Counting steps (not adding up t) keeps the cutoff exact.
const MAX_STEPS = Math.round(MAX_TIME / DT);

// Rides the cart along y = f(x) from the start station to the end station, in the order of
// checks in sim/CLAUDE.md: checks 1–5 look at the track alone and fail fast at t = 0; only a
// track that passes them gets ridden. Those fail-fast results have an empty path: there's no
// ride to replay, only the failure marker.
export function simulate(level: SimLevel, f: (x: number) => number): SimResult {
  const { start, end, bounds } = level;
  const track = sampleTrack(f, start.x, end.x);
  const last = track.count - 1;

  const broken = findBreak(track);
  if (broken !== -1) {
    return fail('BROKEN_TRACK', track.x[broken]!, lastFiniteY(track, broken, start.y), 0);
  }
  if (Math.abs(track.y[0]! - start.y) > STATION_TOLERANCE) {
    return fail('MISSED_START', start.x, track.y[0]!, 0);
  }
  if (Math.abs(track.y[last]! - end.y) > STATION_TOLERANCE) {
    return fail('MISSED_END', end.x, track.y[last]!, 0);
  }
  for (let i = 0; i <= last; i++) {
    const y = track.y[i]!;
    if (y < bounds.yMin || y > bounds.yMax) return fail('OUT_OF_BOUNDS', track.x[i]!, y, 0);
  }
  const hit = findHit(track, level.obstacles);
  if (hit !== -1) return fail('HIT_OBSTACLE', track.x[hit]!, track.y[hit]!, 0);

  // The path starts at the station and gets a point every PATH_EVERY steps. A run that ends
  // between those gets its last point too, so the replay ends exactly where the run did.
  const cart = startCart(track, start.speed);
  const path = [pointAt(cart)];
  for (let n = 1; n <= MAX_STEPS; n++) {
    stepCart(track, cart);
    const recorded = n % PATH_EVERY === 0;
    if (recorded) path.push(pointAt(cart));
    const reason = rideOver(cart, end.x);
    if (reason !== undefined) {
      if (!recorded) path.push(pointAt(cart));
      if (reason === 'WON') return { success: true, path, duration: cart.t };
      return fail(reason, cart.x, cart.y, cart.t, path);
    }
  }
  return fail('TIMEOUT', cart.x, cart.y, cart.t, path);
}

// Why the ride stops after this step, in the order sim/CLAUDE.md gives; undefined while it
// carries on.
function rideOver(cart: Cart, endX: number): 'FLEW_OFF' | 'WON' | 'STALLED' | undefined {
  if (cart.normal < 0) return 'FLEW_OFF';
  if (cart.x >= endX) return 'WON';
  if (cart.v <= 0) return 'STALLED';
  return undefined;
}

function pointAt(cart: Cart): PathPoint {
  return { t: cart.t, x: cart.x, y: cart.y, angle: cart.angle };
}

function fail(
  reason: FailReason,
  x: number,
  y: number,
  t: number,
  path: PathPoint[] = [],
): SimResult {
  return { success: false, reason, failAt: { x, y, t }, path, duration: t };
}

// Index of the first sample where the track is broken, or -1. A sample is broken when its
// height, slope or curvature isn't finite or its slope is steeper than MAX_SLOPE. A jump
// between samples i and i + 1 is reported at i, the last point before the gap.
function findBreak(track: Track): number {
  for (let i = 0; i < track.count; i++) {
    const y = track.y[i]!;
    const slope = track.slope[i]!;
    if (!Number.isFinite(y) || !Number.isFinite(slope) || !Number.isFinite(track.curvature[i]!)) {
      return i;
    }
    if (Math.abs(slope) > MAX_SLOPE) return i;
    // A NaN at i + 1 isn't a jump; the loop reports it on the next pass.
    if (i + 1 < track.count && Math.abs(track.y[i + 1]! - y) > JUMP_THRESHOLD) return i;
  }
  return -1;
}

// A height to draw the failure marker at when the broken sample itself has none.
function lastFiniteY(track: Track, from: number, fallback: number): number {
  for (let i = from; i >= 0; i--) {
    const y = track.y[i]!;
    if (Number.isFinite(y)) return y;
  }
  return fallback;
}

// Index of the first sample where the cart, a circle sitting on the track (its center
// CART_RADIUS along the track's upward normal), touches an obstacle; -1 if none. The circle
// passes through the track point, so the track touching an obstacle counts too.
function findHit(track: Track, obstacles: readonly Obstacle[]): number {
  if (obstacles.length === 0) return -1;
  for (let i = 0; i < track.count; i++) {
    const slope = track.slope[i]!;
    const len = Math.sqrt(1 + slope * slope);
    const cx = track.x[i]! - (CART_RADIUS * slope) / len;
    const cy = track.y[i]! + CART_RADIUS / len;
    for (const o of obstacles) {
      if (circleTouches(cx, cy, CART_RADIUS, o)) return i;
    }
  }
  return -1;
}
