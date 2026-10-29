import { describe, expect, it } from 'vitest';
import { parseEquation, toLatex, type Expr } from './index';

function tree(input: string): Expr {
  const r = parseEquation(input);
  if (!r.ok) throw new Error(`expected "${input}" to parse, got: ${r.error.message}`);
  return r.expr;
}

const latexOf = (input: string) => toLatex(tree(input));

describe('toLatex: how the preview shows an equation', () => {
  it.each([
    ['sqrt(x)', String.raw`\sqrt{x}`],
    ['x^2', String.raw`x^{2}`],
    ['(x-3)/2', String.raw`\frac{x-3}{2}`],
    ['y=(x-3)^2/2', String.raw`\frac{\left(x-3\right)^{2}}{2}`],
    ['2x', '2x'],
    ['2*3', String.raw`2\cdot3`],
    ['x*2', String.raw`x\cdot2`],
    ['pix', String.raw`\pi\cdot x`],
    ['2pi', String.raw`2\pi`],
    ['2sin(x)', String.raw`2\sin\left(x\right)`],
    ['3(x+1)', String.raw`3\left(x+1\right)`],
    ['(x-1)(x+2)', String.raw`\left(x-1\right)\cdot\left(x+2\right)`],
    ['1/2x', String.raw`\frac{1}{2}\cdot x`],
    ['2(1/3)', String.raw`2\cdot\frac{1}{3}`],
    ['2|x|', String.raw`2\cdot\left|x\right|`],
    ['|x-2|', String.raw`\left|x-2\right|`],
    ['||x|-1|', String.raw`\left|\left|x\right|-1\right|`],
    ['-x^2', '-x^{2}'],
    ['-(x+1)', String.raw`-\left(x+1\right)`],
    ['x-(1-x)', String.raw`x-\left(1-x\right)`],
    ['x-1-2', 'x-1-2'],
    ['x+2x', 'x+2x'],
    ['x-(-1)', String.raw`x-\left(-1\right)`],
    ['x*-2', String.raw`x\cdot\left(-2\right)`],
    ['2^3^2', '2^{3^{2}}'],
    ['(2^3)^2', String.raw`\left(2^{3}\right)^{2}`],
    ['(x/2)^2', String.raw`\left(\frac{x}{2}\right)^{2}`],
    ['2^-x', '2^{-x}'],
    ['e^x', 'e^{x}'],
    ['sin(x)^2', String.raw`\sin\left(x\right)^{2}`],
    ['floor(x)', String.raw`\lfloor x\rfloor`],
    ['min(x,1)', String.raw`\min\left(x, 1\right)`],
    ['max(x,1,2)', String.raw`\max\left(x, 1, 2\right)`],
    ['.5', '0.5'],
  ])('%s shows as %s', (input, latex) => {
    expect(latexOf(input)).toBe(latex);
  });

  it('writes huge and tiny numbers as powers of ten, since there is no 1e3 notation', () => {
    expect(latexOf('1234567890123456789012')).toBe(String.raw`1.2345678901234568\times10^{21}`);
    expect(latexOf('.0000001')).toBe(String.raw`1\times10^{-7}`);
    expect(latexOf('2*1234567890123456789012')).toBe(
      String.raw`2\left(1.2345678901234568\times10^{21}\right)`,
    );
  });
});

describe('toLatex: the preview reads back as the same equation', () => {
  // parse(toLatex(parse(input))) must give the identical tree, which means the same value at
  // every x. That is stricter than checking a few points, and needs no evaluator.
  it.each([
    '(x-3)^2/2',
    'x',
    '2x',
    '-x^2',
    '2^-x',
    '2^3^2',
    '(2^3)^2',
    'x-1-2',
    'x-(1-x)',
    'x+-1',
    'x-(-x)',
    'x+2x',
    '1/2x',
    'x/2/3',
    'x/(2/3)',
    '(x/2)^2',
    'sqrt(x)',
    'sqrt(x/2+1)',
    '|x-2|',
    '||x|-1|',
    '|||x|-1|-2|',
    '2|x|',
    '|x||x|',
    '|x*|x||',
    '|x-|x||',
    '|(2|x|)|',
    'sin(x)^2',
    '2sin(pix)',
    'cos(x)+tan(x)',
    'ln(x)-log(x)',
    'exp(-x^2)',
    'min(x,1)',
    'max(x,1,2)',
    'floor(x/2)',
    '2floor(x)',
    'floor(|x|)',
    'e^x',
    'pi*e',
    'xpi',
    '3(x+1)',
    '(x-1)(x+2)',
    '2*3',
    '2*(3*x)',
    '(2*3)*x',
    'x*-2',
    '-(x+1)',
    '--x',
    '-sin(x)',
    '1/x^2',
    'x^(1/2)',
    '(x+1)^-2',
    '2^(x+1)^2',
    '.5x',
    'x^2*3',
    '2x^2',
    '-(x/2)',
    'sqrt(|x|)+floor(x)^2',
  ])('%s', (input) => {
    const once = tree(input);
    expect(tree(toLatex(once))).toEqual(once);
  });

  it('may regroup a negated product, which keeps its value', () => {
    // -(2x) shows as -2x, which reads back as (-2)·x: the same number for every x.
    expect(latexOf('-(2x)')).toBe('-2x');
    expect(tree('-2x')).toEqual(tree('(-2)*x'));
  });

  it('reads huge numbers back as a power of ten', () => {
    expect(tree(latexOf('1234567890123456789012'))).toEqual(tree('1.2345678901234568*10^21'));
  });

  it('gives the same preview whether the player typed plain math or LaTeX', () => {
    expect(latexOf(String.raw`\frac{x-3}{2}`)).toBe(latexOf('(x-3)/2'));
    expect(latexOf(String.raw`\left|x\right|\cdot\sqrt{x}`)).toBe(latexOf('|x|*sqrt(x)'));
  });
});
