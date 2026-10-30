import { describe, expect, it } from 'vitest';
import { SHARE_URL, buildShareText } from './share';

describe('the share text says how you did, never how', () => {
  it('a solved daily shows the number, the score against par, the streak and the link', () => {
    expect(buildShareText({ daily: 42, par: 14, score: 11, streak: 3 })).toBe(
      ['Coaster Golf #42 🎢', '11 chars (par 14) ⛳', '🔥 3-day streak', SHARE_URL].join('\n'),
    );
  });

  it('says "1 char" for a one-character answer', () => {
    expect(buildShareText({ daily: 1, par: 1, score: 1, streak: 1 })).toContain('1 char (par 1)');
  });

  it('leaves the streak line out when there is no streak', () => {
    expect(buildShareText({ daily: 42, par: 14, score: 11, streak: 0 })).toBe(
      ['Coaster Golf #42 🎢', '11 chars (par 14) ⛳', SHARE_URL].join('\n'),
    );
  });

  it('an unsolved daily says "not yet"', () => {
    expect(buildShareText({ daily: 42, par: 14, streak: 0 })).toBe(
      `Coaster Golf #42 🎢 — not yet! 💥\n${SHARE_URL}`,
    );
  });

  it('never contains the equation, even one made of the same digits', () => {
    // A player solved #42 with "|x-14|/11"; nothing in the text gives it away.
    const equation = '|x-14|/11';
    const text = buildShareText({ daily: 42, par: 14, score: equation.length, streak: 3 });
    expect(text).not.toContain(equation);
    // The URL line is fixed (and has its own slashes); everything above it comes from the run.
    expect(
      text.endsWith(`
${SHARE_URL}`),
    ).toBe(true);
    const fromRun = text.slice(0, -SHARE_URL.length);
    for (const piece of ['|', '/', '^', '(x', 'x-']) expect(fromRun).not.toContain(piece);
  });

  it('uses the link it is given', () => {
    expect(buildShareText({ daily: 2, par: 5, streak: 0, url: 'example.org' })).toMatch(
      /\nexample\.org$/,
    );
  });
});
