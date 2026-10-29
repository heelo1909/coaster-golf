import { describe, expect, it } from 'vitest';
import { trackPolylines } from './scene';

describe('trackPolylines', () => {
  it('draws a smooth curve as one line covering the whole range, ends included', () => {
    const lines = trackPolylines((x) => (x - 3) ** 2 / 9 - 1, 0, 6, 0.05, 100);
    expect(lines).toHaveLength(1);
    const [line] = lines;
    expect(line?.xs[0]).toBe(0);
    expect(line?.xs.at(-1)).toBe(6);
    expect(line?.ys[0]).toBeCloseTo(0);
    expect(line?.xs).toHaveLength(121);
  });

  it('ends exactly at the right edge even when the range is not a whole number of steps', () => {
    const [line] = trackPolylines((x) => x, 0, 1, 0.3, 100);
    expect(line?.xs).toHaveLength(5);
    expect(line?.xs.at(-2)).toBeCloseTo(0.9);
    expect(line?.xs.at(-1)).toBe(1);
  });

  it('breaks the line where the track is undefined instead of bridging the gap', () => {
    const lines = trackPolylines((x) => Math.sqrt(4 - x * x), -3, 3, 0.01, 100);
    expect(lines).toHaveLength(1); // NaN outside [-2, 2] is simply not drawn
    const gap = trackPolylines((x) => (Math.abs(x) < 1 ? NaN : x), -3, 3, 0.01, 100);
    expect(gap).toHaveLength(2);
    expect(gap[0]?.xs.at(-1)).toBeLessThan(-0.99);
    expect(gap[1]?.xs[0]).toBeGreaterThan(0.99);
  });

  it('never draws a vertical line across a jump', () => {
    const step = trackPolylines((x) => (x < 2 ? 0 : 3), 0, 4, 0.01, 100);
    expect(step).toHaveLength(2);
    // Near a pole the curve is a wall, so it may split into many pieces; none may cross it.
    const pole = trackPolylines((x) => 1 / (x - 2.005), 0, 4, 0.01, 1000);
    for (const { xs } of pole) {
      expect((xs[0] ?? 0) < 2.005 && (xs.at(-1) ?? 0) > 2.005).toBe(false);
    }
    expect(pole[0]?.xs[0]).toBe(0);
    expect(pole.at(-1)?.xs.at(-1)).toBe(4);
  });

  it('keeps a steep but continuous line in one piece', () => {
    expect(trackPolylines((x) => 15 * x, 0, 1, 0.02, 100)).toHaveLength(1);
  });

  it('clamps huge heights so they stay drawable', () => {
    const [line] = trackPolylines((x) => 1e300 * x, 1, 2, 0.5, 50);
    expect(line?.ys.every((y) => y === 50)).toBe(true);
  });

  it('returns nothing for an empty range or a bad step', () => {
    expect(trackPolylines((x) => x, 2, 2, 0.1, 10)).toEqual([]);
    expect(trackPolylines((x) => x, 0, 2, 0, 10)).toEqual([]);
    expect(trackPolylines(() => NaN, 0, 2, 0.1, 10)).toEqual([]);
  });
});
