import { describe, expect, it } from 'vitest';
import { evaluate, parseEquation, scoreEquation, toLatex } from './index';

// A seeded generator (mulberry32) instead of Math.random: src/core bans randomness, and a
// failing string can be reproduced from the seed.
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Single characters a player could type, plus whole pieces so that some strings are valid
// equations and reach the evaluator, not just the error paths.
const CHARS = [...'0123456789.xyepiabcdfglmnoqrstw+-*/^(){}|,= \\'];
const PIECES = [
  ...['x', 'x', '2', '.5', '10', 'pi', 'e', 'y='],
  ...['+', '-', '-', '*', '/', '^', '(', ')', '|', ','],
  ...['sin(', 'cos(', 'tan(', 'abs(', 'sqrt(', 'log(', 'ln(', 'exp(', 'min(', 'max(', 'floor('],
  ...['\\frac{', '}{', '}', '{', '\\sqrt{', '\\sin(', '\\pi', '\\cdot', '\\left(', '\\right)'],
  ...['\\lfloor', '\\rfloor', '\\left|', '\\right|', '\\alpha', '−', '²', '😀'],
];

const pick = <T>(next: () => number, list: readonly T[]): T =>
  list[Math.floor(next() * list.length)] as T;

// Follows the grammar, so the result is usually a valid equation (it can still be too long
// or too deep, which is fine).
function randomEquation(next: () => number, depth: number): string {
  const leaf = () => pick(next, ['x', 'x', '2', '.5', '3.25', 'pi', 'e', '\\pi', '100']);
  if (depth <= 0) return leaf();
  const sub = () => randomEquation(next, depth - 1);
  switch (Math.floor(next() * 9)) {
    case 0:
      return leaf();
    case 1:
      return `${sub()}${pick(next, ['+', '-', '*', '/', '^', '\\cdot'])}${sub()}`;
    case 2:
      return `-${sub()}`;
    case 3:
      return `(${sub()})`;
    case 4:
      return `|${sub()}|`;
    case 5:
      return `${pick(next, ['sin', 'cos', 'tan', 'abs', 'sqrt', 'log', 'ln', 'exp', 'floor', '\\sin', '\\ln'])}(${sub()})`;
    case 6:
      return `${pick(next, ['min', 'max'])}(${sub()},${sub()})`;
    case 7:
      return `\\frac{${sub()}}{${sub()}}`;
    default:
      return `${pick(next, ['2', '3', 'x', 'pi'])}${pick(next, ['x', '(x+1)', 'sin(x)', '\\sqrt{x}'])}`;
  }
}

function randomString(next: () => number): string {
  const kind = next();
  if (kind < 0.4)
    return (next() < 0.3 ? 'y=' : '') + randomEquation(next, 1 + Math.floor(next() * 5));
  const pool = kind < 0.7 ? PIECES : CHARS;
  // Mostly short strings, with some long enough to hit the 200-character limit.
  const count = next() < 0.05 ? 150 + Math.floor(next() * 150) : Math.floor(next() * 30);
  let s = '';
  for (let i = 0; i < count; i++) s += pool[Math.floor(next() * pool.length)];
  return s;
}

const XS = [-3, -0.5, 0, 1, 2.5, 100];

// Everything the game does with a typed string: parse, score, draw the track, show the preview.
function runEngine(input: string) {
  const r = parseEquation(input);
  const score = scoreEquation(input);
  if (!r.ok) return { r, score, ys: [], preview: '', back: r };
  const preview = toLatex(r.expr);
  return {
    r,
    score,
    ys: XS.map((x) => evaluate(r.expr, x)),
    preview,
    back: parseEquation(preview),
  };
}

// Wall-clock time of the engine alone, without the test's own expect() calls.
function timeEngine(input: string): { ms: number; out: ReturnType<typeof runEngine> } {
  const start = performance.now();
  const out = runEngine(input);
  return { ms: performance.now() - start, out };
}

describe('fuzz: no typed string can crash or freeze the equation engine', () => {
  it('10,000 random strings never throw, never give Infinity, and each takes under 5 ms', () => {
    const next = rng(20261028);
    let parsed = 0;
    const slow: string[] = [];

    for (let i = 0; i < 10_000; i++) {
      const input = randomString(next);
      const { ms, out } = timeEngine(input);
      if (ms >= 5) slow.push(input);

      const { r, score, ys, preview, back } = out;
      expect(score).toBeLessThanOrEqual(input.length);
      if (r.ok) {
        parsed++;
        for (const y of ys) {
          expect(Number.isNaN(y) || Number.isFinite(y), `${input} gave ${y}`).toBe(true);
        }
        // The preview reads back, unless its \left| and \frac{} push it past 200 characters.
        if (preview.length <= 200) expect(back.ok, `preview of ${input}`).toBe(true);
        else expect(!back.ok && back.error.position).toBe(200);
      } else {
        expect(r.error.message.length).toBeGreaterThan(0);
        expect(r.error.position).toBeGreaterThanOrEqual(0);
        expect(r.error.position).toBeLessThanOrEqual(input.length);
      }
    }

    // A garbage-collection pause can make even "pi+e" take a few ms once. A slow string is
    // re-timed on its own, best of three: a truly slow input stays slow, a pause doesn't.
    for (const input of slow) {
      const best = Math.min(...[0, 1, 2].map(() => timeEngine(input).ms));
      expect(best, `slow input: ${JSON.stringify(input)}`).toBeLessThan(5);
    }
    // The fuzz must reach the evaluator, not only the error messages.
    expect(parsed).toBeGreaterThan(500);
  });
});
