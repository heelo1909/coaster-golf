import { describe, expect, it } from 'vitest';
import { evaluate, parseEquation } from '../equation';
import { DRAG, DT, G, sampleTrack, startCart, stepCart } from './index';
import type { Cart, Track } from './index';

// The track the cart rides for what the player typed, from `from` to `to`.
function trackFor(input: string, from: number, to: number): Track {
  const r = parseEquation(input);
  if (!r.ok) throw new Error(`expected "${input}" to parse, got: ${r.error.message}`);
  const expr = r.expr;
  return sampleTrack((x) => evaluate(expr, x), from, to);
}

// Steps the cart `steps` times (or until it reaches the end) and returns it.
function ride(track: Track, speed: number, steps: number, drag: number = DRAG): Cart {
  const cart = startCart(track, speed);
  const end = track.x[track.count - 1]!;
  for (let n = 0; n < steps && cart.x < end; n++) stepCart(track, cart, drag);
  return cart;
}

function energy(cart: Cart): number {
  return 0.5 * cart.v * cart.v + G * cart.y;
}

describe('startCart: the cart starts at the start station', () => {
  it('sits on the first sample at the station speed, on the track', () => {
    const cart = startCart(trackFor('(x-3)^2/2', 0, 6), 2);
    expect(cart.t).toBe(0);
    expect(cart.x).toBe(0);
    expect(cart.y).toBe(4.5);
    expect(cart.v).toBe(2);
    expect(cart.angle).toBeCloseTo(Math.atan(-3), 6);
  });
});

describe('stepCart: gravity pulls the cart along the slope', () => {
  it('the physics runs at a fixed 1/240 s step', () => {
    expect(DT).toBe(1 / 240);
    const cart = ride(trackFor('5-x', 0, 10), 0, 240);
    expect(cart.t).toBeCloseTo(1, 12);
  });

  it('on a 45° downhill from rest, speed grows by g·sin 45° each second', () => {
    const cart = ride(trackFor('5-x', 0, 20), 0, 240, 0);
    expect(cart.v).toBeCloseTo(G / Math.SQRT2, 9);
  });

  it('a steeper downhill speeds the cart up faster', () => {
    const gentle = ride(trackFor('5-x/4', 0, 20), 0, 120);
    const steep = ride(trackFor('5-2x', 0, 20), 0, 120);
    expect(steep.v).toBeGreaterThan(gentle.v);
  });

  it('on a 45° uphill the cart loses g·sin 45° of speed each second', () => {
    const cart = ride(trackFor('x', 0, 20), 10, 240, 0);
    expect(cart.v).toBeCloseTo(10 - G / Math.SQRT2, 9);
  });

  it('moving along a slope covers ground at v·cos θ in x', () => {
    const cart = ride(trackFor('x', 0, 20), 5, 1, 0);
    const v = 5 - (G / Math.SQRT2) * DT;
    expect(cart.x).toBeCloseTo(v * DT * Math.SQRT1_2, 12);
    expect(cart.y).toBeCloseTo(cart.x, 9);
  });
});

describe('stepCart: a little friction', () => {
  it('on flat ground the cart slowly loses speed to drag', () => {
    const cart = ride(trackFor('1', 0, 1000), 5, 2400);
    expect(DRAG).toBe(0.02);
    // 10 s of drag 0.02: about 5·e^(-0.2).
    expect(cart.v).toBeCloseTo(5 * Math.exp(-0.2), 3);
  });

  it('without drag, a valley gives back the speed it took: energy is kept', () => {
    const track = trackFor('x^2/4', -3, 3);
    const cart = startCart(track, 3);
    const e0 = energy(cart);
    while (cart.x < 3) {
      stepCart(track, cart, 0);
      expect(Math.abs(energy(cart) - e0) / e0).toBeLessThan(0.01);
    }
    expect(Math.abs(cart.v - 3)).toBeLessThan(0.05);
  });

  it('with drag, the cart climbs out of the same valley a bit slower than it went in', () => {
    const cart = ride(trackFor('x^2/4', -3, 3), 3, 100_000);
    expect(cart.x).toBe(3);
    expect(cart.v).toBeLessThan(2.9);
    expect(cart.v).toBeGreaterThan(2.6);
  });
});

describe('stepCart: the cart only moves forward and stops at the end', () => {
  it('a cart with no speed on flat ground does not move', () => {
    const cart = ride(trackFor('1', 0, 5), 0, 10);
    expect(cart.x).toBe(0);
    expect(cart.v).toBe(0);
  });

  it('a cart pushed backward by a hill stays put instead of rolling back', () => {
    const track = trackFor('x', 0, 5);
    const cart = startCart(track, 0.1);
    let furthest = 0;
    for (let n = 0; n < 100; n++) {
      stepCart(track, cart);
      expect(cart.x).toBeGreaterThanOrEqual(furthest);
      furthest = cart.x;
    }
    expect(cart.v).toBeLessThanOrEqual(0);
  });

  it('never goes past the end station', () => {
    const track = trackFor('5-x', 0, 2);
    const cart = startCart(track, 3);
    for (let n = 0; n < 1000; n++) stepCart(track, cart);
    expect(cart.x).toBe(2);
    expect(cart.y).toBe(3);
  });
});

describe('stepCart: the normal force says whether the cart stays on the track', () => {
  it('on flat ground it is just gravity', () => {
    const cart = ride(trackFor('1', 0, 10), 3, 10);
    expect(cart.normal).toBeCloseTo(G, 9);
  });

  it('at the bottom of a valley it presses harder; on a hilltop it lightens', () => {
    // At x = 0: slope 0, curvature ±2, so N = g ± 2v².
    const valley = startCart(trackFor('x^2', 0, 1), 1.5);
    const hill = startCart(trackFor('-x^2', 0, 1), 1.5);
    expect(valley.normal).toBeCloseTo(G + 2 * 1.5 ** 2, 3);
    expect(hill.normal).toBeCloseTo(G - 2 * 1.5 ** 2, 3);
  });

  it('a fast cart over a sharp hilltop gets a negative normal force', () => {
    expect(startCart(trackFor('-x^2', 0, 1), 3).normal).toBeLessThan(0);
  });
});

describe('stepCart: same ride, same result', () => {
  it('two runs on the same track are bit-identical at every step', () => {
    const track = trackFor('sin(3x)/3+2-x/2', 0, 8);
    const a = startCart(track, 2);
    const b = startCart(track, 2);
    for (let n = 0; n < 2000; n++) {
      stepCart(track, a);
      stepCart(track, b);
      expect(b).toEqual(a);
    }
  });
});
