import { DRAG, DT, G } from './constants';
import type { Track } from './track';

// Where the cart is and how it's moving. One object, updated in place by stepCart, so the
// run loop allocates nothing per step.
export interface Cart {
  t: number; // seconds since the start
  x: number;
  y: number; // track height at x
  v: number; // speed along the track, positive toward +x
  angle: number; // slope angle at x, atan(f'(x)), in radians
  normal: number; // normal force per unit mass at x: g·cos θ + v²·κ (below 0 = leaving the track)
  segment: number; // index i with track.x[i] ≤ x ≤ track.x[i + 1]; only ever grows
}

// A cart at the first sample of the track with the station's starting speed.
export function startCart(track: Track, speed: number): Cart {
  const cart: Cart = { t: 0, x: track.x[0]!, y: 0, v: speed, angle: 0, normal: 0, segment: 0 };
  readTrack(track, cart);
  return cart;
}

// One fixed step of semi-implicit Euler along the arc: v += a·dt first, then the cart moves
// v·dt along the track, which is v·dt·cos θ in x. a = -g·sin θ - drag·v.
// If the new speed is 0 or less the cart stays where it is; it only ever moves forward, and
// deciding that it stalled is the caller's job. It never moves past the last sample either:
// reaching the end station is the caller's win check.
export function stepCart(track: Track, cart: Cart, drag: number = DRAG): void {
  const theta = cart.angle;
  cart.v += (-G * Math.sin(theta) - drag * cart.v) * DT;
  cart.t += DT;
  if (cart.v > 0) {
    const end = track.x[track.count - 1]!;
    cart.x = Math.min(end, cart.x + cart.v * DT * Math.cos(theta));
  }
  readTrack(track, cart);
}

// Fills y, angle and normal at cart.x by linear interpolation between the two samples around
// it, moving the segment index forward as needed.
function readTrack(track: Track, cart: Cart): void {
  const last = track.count - 2;
  let i = cart.segment;
  while (i < last && track.x[i + 1]! <= cart.x) i++;
  cart.segment = i;

  const x0 = track.x[i]!;
  const u = (cart.x - x0) / (track.x[i + 1]! - x0);
  const slope = lerp(track.slope[i]!, track.slope[i + 1]!, u);
  const curvature = lerp(track.curvature[i]!, track.curvature[i + 1]!, u);
  cart.y = lerp(track.y[i]!, track.y[i + 1]!, u);
  cart.angle = Math.atan(slope);
  cart.normal = G * Math.cos(cart.angle) + cart.v * cart.v * curvature;
}

function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}
