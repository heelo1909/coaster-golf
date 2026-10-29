import { describe, expect, it } from 'vitest';
import { evaluate, parseEquation } from './index';

// What the track height is at x for what the player typed.
function at(input: string, x: number): number {
  const r = parseEquation(input);
  if (!r.ok) throw new Error(`expected "${input}" to parse, got: ${r.error.message}`);
  return evaluate(r.expr, x);
}

const XS = [-2, -0.5, 0, 1.5, 3];

describe('evaluate: what each part of an equation is worth', () => {
  it.each([
    ['3', 0, 3],
    ['.5', 7, 0.5],
    ['x', -4, -4],
    ['pi', 0, Math.PI],
    ['e', 0, Math.E],
    ['-x', 2, -2],
    ['x+1', 2, 3],
    ['x-1', 2, 1],
    ['3x', 2, 6],
    ['x/4', 2, 0.5],
    ['x^3', 2, 8],
    ['|x-5|', 2, 3],
    ['y=x+1', 2, 3],
  ])('%s at x=%d is %d', (input, x, value) => {
    expect(at(input, x)).toBe(value);
  });

  it.each([
    ['sin(x)', 1, Math.sin(1)],
    ['cos(x)', 1, Math.cos(1)],
    ['tan(x)', 1, Math.tan(1)],
    ['abs(x)', -1.5, 1.5],
    ['sqrt(x)', 9, 3],
    ['log(x)', 1000, 3],
    ['ln(x)', Math.E, 1],
    ['exp(x)', 1, Math.E],
    ['min(x,1)', 3, 1],
    ['max(x,1)', 3, 3],
    ['min(x,1,-2)', 3, -2],
    ['max(1,x,-2)', 3, 3],
    ['floor(x)', 2.7, 2],
    ['floor(x)', -2.2, -3],
  ])('%s at x=%d is %d', (input, x, value) => {
    expect(at(input, x)).toBe(value);
  });

  it('reads LaTeX input the same as plain math', () => {
    for (const x of XS) {
      expect(at(String.raw`\frac{x}{2}+\sqrt{x^2}`, x)).toBe(at('x/2+sqrt(x^2)', x));
      expect(at(String.raw`\lfloor x\rfloor\cdot\pi`, x)).toBe(at('floor(x)*pi', x));
    }
  });
});

describe('evaluate: undefined points are NaN, so the track has a gap there', () => {
  it.each([
    ['sqrt(x)', -1],
    ['1/x', 0],
    ['x/0', 0],
    ['0/x', 0],
    ['ln(x)', 0],
    ['ln(x)', -1],
    ['log(x)', 0],
    ['x^0.5', -4],
    ['x^(1/3)', -8],
    ['x^-1', 0],
    ['exp(x)', 1000],
    ['x^x', 1000],
    ['10^x', 400],
    ['min(1/x,1)', 0],
    ['sin(1/x)', 0],
    ['x*1/x', 0],
  ])('%s at x=%d', (input, x) => {
    expect(at(input, x)).toBeNaN();
  });

  it('keeps NaN once it appears, instead of turning it back into a number', () => {
    expect(at('0*(1/x)', 0)).toBeNaN();
    expect(at('1/(1/x)', 0)).toBeNaN();
    expect(at('floor(1/x)', 0)).toBeNaN();
  });

  it('is defined right next to the gap', () => {
    expect(at('1/x', 1e-9)).toBeCloseTo(1e9);
    expect(at('sqrt(x)', 0)).toBe(0);
    expect(at('x^0', 0)).toBe(1);
  });
});

describe('evaluate: precedence and associativity, checked by value', () => {
  it.each<[string, (x: number) => number]>([
    ['1+2*x', (x) => 1 + 2 * x],
    ['x-1-2', (x) => x - 1 - 2],
    ['x/2/3', (x) => x / 2 / 3],
    ['x/2*3', (x) => (x / 2) * 3],
    ['2^3^x', (x) => 2 ** (3 ** x)],
    ['-x^2', (x) => -(x ** 2)],
    ['2^-x', (x) => 2 ** -x],
    ['-2^-x', (x) => -(2 ** -x)],
    ['--x', (x) => -(-x)],
    ['x*-2', (x) => x * -2],
    ['(x-3)^2/2', (x) => (x - 3) ** 2 / 2],
    ['2x^2', (x) => 2 * x ** 2],
    ['1/2x', (x) => (1 / 2) * x],
    ['2(x)(x)', (x) => 2 * x * x],
    ['pix', (x) => Math.PI * x],
    ['ex', (x) => Math.E * x],
    ['exp(x)', (x) => Math.exp(x)],
    ['1-x+2', (x) => 1 - x + 2],
    ['sin(x)^2', (x) => Math.sin(x) ** 2],
    ['-sin(x)', (x) => -Math.sin(x)],
    ['1/x^2', (x) => (x === 0 ? NaN : 1 / x ** 2)],
    ['2-x', (x) => 2 - x],
    ['||x|-1|', (x) => Math.abs(Math.abs(x) - 1)],
    ['2|x|x', (x) => 2 * Math.abs(x) * x],
  ])('%s', (input, expected) => {
    for (const x of XS) expect(at(input, x)).toBe(expected(x));
  });
});

describe('evaluate: the same equation always gives the same track', () => {
  it('returns identical values on repeated calls', () => {
    const r = parseEquation('sin(3x)/(x^2+1)+floor(x/2)');
    if (!r.ok) throw new Error('should parse');
    for (let x = -10; x <= 10; x += 0.25) {
      expect(evaluate(r.expr, x)).toBe(evaluate(r.expr, x));
    }
  });
});
