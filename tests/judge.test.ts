import { describe, expect, it } from 'vitest';
import { judge } from '../src/core';
import type { Level } from '../src/core';

// A gentle slope from (0, 5) down to (10, 0); 5-x/2 rides it.
const slope: Level = {
  id: 'test-slope',
  name: 'Test Slope',
  bounds: { xMin: -1, xMax: 11, yMin: -2, yMax: 8 },
  start: { x: 0, y: 5, speed: 1 },
  end: { x: 10, y: 0 },
  obstacles: [],
  par: 5,
  reference: '5-x/2',
};

describe('judge: typed equation → ride → score', () => {
  it('a winning equation wins, scored by its typed length', () => {
    const j = judge(slope, 'y = 5 - x/2');
    expect(j.ok).toBe(true);
    if (!j.ok) return;
    expect(j.result.success).toBe(true);
    expect(j.score).toBe(5);
  });

  it('the LaTeX form of the same track also wins, but costs more characters', () => {
    const j = judge(slope, '5-\\frac{x}{2}');
    expect(j.ok && j.result.success).toBe(true);
    expect(j.ok && j.score).toBe(13);
  });

  it('an equation that parses but misses the end station fails with its reason', () => {
    const j = judge(slope, '5-x');
    expect(j.ok).toBe(true);
    if (!j.ok) return;
    expect(j.result.success).toBe(false);
    expect(j.result.reason).toBe('MISSED_END');
    expect(j.score).toBe(3);
  });

  it('an equation that does not parse gives the parse error and no ride', () => {
    const j = judge(slope, '5-sinx');
    expect(j.ok).toBe(false);
    if (j.ok) return;
    expect(j.parseError.message).toBe('"sin" needs parentheses, like sin(x)');
    expect(j.parseError.position).toBe(2);
  });

  it('judging the same equation twice gives the same answer', () => {
    expect(judge(slope, '5-x/2')).toStrictEqual(judge(slope, '5-x/2'));
  });
});
