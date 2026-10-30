import { describe, expect, it } from 'vitest';
import { CONFETTI_PIECES, confettiAt } from './confetti';

describe('confettiAt: the burst for a win at or under par', () => {
  it('starts with every piece at the end station, fully visible', () => {
    const pieces = confettiAt(6, 0, 0);
    expect(pieces).toHaveLength(CONFETTI_PIECES);
    for (const p of pieces) expect(p).toMatchObject({ x: 6, y: 0, alpha: 1 });
  });

  it('flies up and out to both sides, then falls back and fades', () => {
    const early = confettiAt(6, 0, 0.2);
    expect(early.some((p) => p.x < 6)).toBe(true);
    expect(early.some((p) => p.x > 6)).toBe(true);
    expect(early.every((p) => p.y > 0)).toBe(true);
    const peak = Math.max(...early.map((p) => p.y));
    const late = confettiAt(6, 0, 0.95);
    expect(Math.max(...late.map((p) => p.y))).toBeLessThan(peak);
    expect(late[0]!.alpha).toBeLessThan(0.2);
  });

  it('is the same burst every time and uses all three colours', () => {
    expect(confettiAt(1, 2, 0.5)).toEqual(confettiAt(1, 2, 0.5));
    expect(new Set(confettiAt(0, 0, 0.5).map((p) => p.colour))).toEqual(new Set([0, 1, 2]));
  });

  it('draws nothing once it is over', () => {
    expect(confettiAt(0, 0, 1)).toEqual([]);
    expect(confettiAt(0, 0, -0.1)).toEqual([]);
  });
});
