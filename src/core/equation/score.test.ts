import { describe, expect, it } from 'vitest';
import { parseEquation, scoreEquation } from './index';

describe('scoreEquation: the score is how many characters the player typed', () => {
  it.each([
    ['y = (x-3)^2/2', 9],
    ['(x-3)^2/2', 9],
    ['x', 1],
    ['pi', 2],
    ['sin(x)', 6],
    ['sqrt(x)', 7],
    ['|x-2|', 5],
    ['abs(x-2)', 8],
    ['2x', 2],
    ['.5x', 3],
  ])('%s scores %d', (input, score) => {
    expect(scoreEquation(input)).toBe(score);
  });

  it('spaces, tabs and newlines anywhere cost nothing', () => {
    expect(scoreEquation('  x ^ 2  ')).toBe(3);
    expect(scoreEquation('x\t+\n1')).toBe(3);
    expect(scoreEquation('s in(x)')).toBe(6);
  });

  it('a leading y= is free, with or without spaces around it', () => {
    expect(scoreEquation('y=x^2')).toBe(3);
    expect(scoreEquation(' y = x^2')).toBe(3);
    expect(scoreEquation('y =x^2')).toBe(scoreEquation('x^2'));
  });

  it('only one leading y= is dropped, and a y anywhere else still counts', () => {
    expect(scoreEquation('y=y=x')).toBe(3);
    expect(scoreEquation('xy=')).toBe(3);
    expect(scoreEquation('Y=x')).toBe(3);
  });

  it('LaTeX counts every typed character, so it is never shorter than plain math', () => {
    expect(scoreEquation('\\frac{x}{2}')).toBe(11);
    expect(scoreEquation('x/2')).toBe(3);
    expect(scoreEquation('\\sqrt{x}')).toBeGreaterThan(scoreEquation('sqrt(x)'));
    expect(scoreEquation('\\pi')).toBeGreaterThan(scoreEquation('pi'));
  });

  it('an empty box or a bare y= scores 0', () => {
    expect(scoreEquation('')).toBe(0);
    expect(scoreEquation('   ')).toBe(0);
    expect(scoreEquation('y=')).toBe(0);
  });

  it('the score matches the source the leaderboard shows, minus whitespace and y=', () => {
    const input = 'y = 2 x + 1';
    const r = parseEquation(input);
    expect(r.ok).toBe(true);
    if (r.ok) expect(scoreEquation(r.source)).toBe('2x+1'.length);
  });

  it('is the same every time for the same input', () => {
    const input = 'y = sin(x)/2 + |x - pi|';
    expect(scoreEquation(input)).toBe(scoreEquation(input));
    expect(scoreEquation(input)).toBe(15);
  });
});
