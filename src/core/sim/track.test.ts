import { describe, expect, it } from 'vitest';
import { evaluate, parseEquation } from '../equation';
import { SAMPLE_STEP, sampleTrack } from './index';

// The function the cart rides for what the player typed.
function track(input: string): (x: number) => number {
  const r = parseEquation(input);
  if (!r.ok) throw new Error(`expected "${input}" to parse, got: ${r.error.message}`);
  return (x) => evaluate(r.expr, x);
}

describe('sampleTrack: the track runs from the start station to the end station', () => {
  it('samples every SAMPLE_STEP, from the start x to the end x inclusive', () => {
    const t = sampleTrack(track('x'), 0, 3);
    expect(SAMPLE_STEP).toBe(0.01);
    expect(t.count).toBe(301);
    expect(t.x[0]).toBe(0);
    expect(t.x[t.count - 1]).toBe(3);
    for (let i = 1; i < t.count; i++) {
      expect(t.x[i]! - t.x[i - 1]!).toBeCloseTo(0.01, 12);
    }
  });

  it('positions come from the start plus a whole number of steps, so they never drift', () => {
    const t = sampleTrack(track('x'), -7, 7);
    expect(t.count).toBe(1401);
    for (let i = 0; i < t.count - 1; i++) expect(t.x[i]).toBe(-7 + i * 0.01);
  });

  it('a range that is not a whole number of steps still ends exactly at the end station', () => {
    const t = sampleTrack(track('x'), 0, 1.005);
    expect(t.count).toBe(102);
    expect(t.x[100]).toBe(1);
    expect(t.x[101]).toBe(1.005);
  });

  it('a range shorter than one step is still a track with both ends', () => {
    const t = sampleTrack(track('x'), 2, 2.001);
    expect(t.count).toBe(2);
    expect([t.x[0], t.x[1]]).toEqual([2, 2.001]);
  });

  it('a custom step is honored', () => {
    const t = sampleTrack(track('x'), 0, 1, 0.25);
    expect(Array.from(t.x)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it('the height at each sample is the equation evaluated there', () => {
    const t = sampleTrack(track('(x-3)^2/2'), 0, 6, 0.5);
    for (let i = 0; i < t.count; i++) {
      expect(t.y[i]).toBe((t.x[i]! - 3) ** 2 / 2);
    }
  });
});

describe('sampleTrack: slope and curvature, which the physics needs', () => {
  it('a straight downhill line has a constant slope and no curvature', () => {
    const t = sampleTrack(track('5-x/2'), 0, 10);
    for (let i = 0; i < t.count; i++) {
      expect(t.slope[i]).toBeCloseTo(-0.5, 6);
      expect(t.curvature[i]).toBeCloseTo(0, 3);
    }
  });

  it('a valley curves up (positive) and a hilltop curves down (negative)', () => {
    const valley = sampleTrack(track('x^2'), -1, 1, 0.5);
    const hill = sampleTrack(track('-x^2'), -1, 1, 0.5);
    // At the bottom of x^2: slope 0, curvature f'' = 2.
    expect(valley.slope[2]).toBeCloseTo(0, 6);
    expect(valley.curvature[2]).toBeCloseTo(2, 3);
    expect(hill.curvature[2]).toBeCloseTo(-2, 3);
  });

  it('curvature accounts for slope: a steep part of the same parabola curves less', () => {
    const t = sampleTrack(track('x^2'), 0, 2, 1);
    // At x = 1: f' = 2, f'' = 2, so κ = 2 / (1 + 4)^1.5.
    expect(t.slope[1]).toBeCloseTo(2, 6);
    expect(t.curvature[1]).toBeCloseTo(2 / 5 ** 1.5, 3);
  });

  it('a circle of radius 2 has curvature 1/2 everywhere on it', () => {
    const t = sampleTrack(track('-sqrt(4-x^2)'), -1.5, 1.5, 0.1);
    for (let i = 0; i < t.count; i++) expect(t.curvature[i]).toBeCloseTo(0.5, 3);
  });
});

describe('sampleTrack: gaps are kept for the broken-track check', () => {
  it('where the equation is undefined, the height, slope and curvature are NaN', () => {
    const t = sampleTrack(track('1/x'), -1, 1, 0.5);
    expect(t.x[2]).toBe(0);
    expect(t.y[2]).toBeNaN();
    expect(Number.isNaN(t.slope[2]!) || Math.abs(t.slope[2]!) > 1e6).toBe(true);
    expect(t.y[0]).toBe(-1);
  });

  it('a sqrt that ends inside the range turns into NaN past its edge', () => {
    const t = sampleTrack(track('sqrt(1-x)'), 0, 2, 0.5);
    expect(t.y[1]).toBeCloseTo(Math.sqrt(0.5), 12);
    expect(t.y[3]).toBeNaN();
    expect(t.slope[3]).toBeNaN();
    expect(t.curvature[3]).toBeNaN();
  });
});

describe('sampleTrack: same input, same track', () => {
  it('sampling twice gives bit-identical arrays', () => {
    const f = track('sin(3x)+x^2/4');
    const a = sampleTrack(f, -4, 4);
    const b = sampleTrack(f, -4, 4);
    expect(b).toEqual(a);
  });
});

describe('sampleTrack: programmer errors throw', () => {
  it.each([
    [1, 1],
    [2, 1],
    [NaN, 1],
    [0, Infinity],
  ])('from %d to %d is not a range', (from, to) => {
    expect(() => sampleTrack(track('x'), from, to)).toThrow(RangeError);
  });

  it.each([0, -0.1, NaN])('a step of %d is refused', (step) => {
    expect(() => sampleTrack(track('x'), 0, 1, step)).toThrow(RangeError);
  });
});
