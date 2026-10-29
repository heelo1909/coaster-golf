import { describe, expect, it } from 'vitest';
import { parseEquation, type Expr } from './index';

// Fully bracketed view of the tree, so each test states exactly how an equation is read.
function show(e: Expr): string {
  switch (e.type) {
    case 'num':
      return String(e.value);
    case 'x':
      return 'x';
    case 'const':
      return e.name;
    case 'neg':
      return `(-${show(e.arg)})`;
    case 'binary':
      return `(${show(e.left)}${e.op}${show(e.right)})`;
    case 'call':
      return `${e.fn}(${e.args.map(show).join(',')})`;
  }
}

function read(input: string): string {
  const r = parseEquation(input);
  if (!r.ok) throw new Error(`expected "${input}" to parse, got: ${r.error.message}`);
  return show(r.expr);
}

function errorOf(input: string): { message: string; position: number } {
  const r = parseEquation(input);
  if (r.ok) throw new Error(`expected "${input}" to fail, got ${show(r.expr)}`);
  return r.error;
}

describe('parseEquation: what players can type', () => {
  it.each([
    ['3', '3'],
    ['3.5', '3.5'],
    ['.5', '0.5'],
    ['x', 'x'],
    ['pi', 'pi'],
    ['e', 'e'],
    ['sin(x)', 'sin(x)'],
    ['cos(x)+tan(x)', '(cos(x)+tan(x))'],
    ['sqrt(x)', 'sqrt(x)'],
    ['log(x)-ln(x)', '(log(x)-ln(x))'],
    ['exp(x)', 'exp(x)'],
    ['abs(x)', 'abs(x)'],
    ['floor(x)', 'floor(x)'],
    ['min(x,1)', 'min(x,1)'],
    ['max(x,1,2)', 'max(x,1,2)'],
  ])('%s reads as %s', (input, tree) => {
    expect(read(input)).toBe(tree);
  });

  it('keeps the original input as the source', () => {
    const r = parseEquation('y = (x-3)^2/2');
    expect(r.ok && r.source).toBe('y = (x-3)^2/2');
  });

  it('treats a leading y= the same as no y=', () => {
    expect(read('y=x^2')).toBe(read('x^2'));
    expect(read(' y = x ^ 2 ')).toBe(read('x^2'));
  });

  it('ignores spaces everywhere, the same way scoring does', () => {
    expect(read('s i n ( x )')).toBe('sin(x)');
    expect(read('1 2 x')).toBe('(12*x)');
  });
});

describe('parseEquation: precedence and associativity', () => {
  it.each([
    ['1+2*x', '(1+(2*x))'],
    ['1*2+x', '((1*2)+x)'],
    ['x-1-2', '((x-1)-2)'],
    ['x/2/3', '((x/2)/3)'],
    ['x/2*3', '((x/2)*3)'],
    ['2^3^2', '(2^(3^2))'],
    ['-x^2', '(-(x^2))'],
    ['2^-x', '(2^(-x))'],
    ['-2^-x', '(-(2^(-x)))'],
    ['--x', '(-(-x))'],
    ['x*-2', '(x*(-2))'],
    ['(x-3)^2/2', '(((x-3)^2)/2)'],
    ['2*x^2', '(2*(x^2))'],
    ['x^2*3', '((x^2)*3)'],
    ['(1+x)*2', '((1+x)*2)'],
    ['1-x+2', '((1-x)+2)'],
    ['sin(x)^2', '(sin(x)^2)'],
    ['-sin(x)', '(-sin(x))'],
    ['x^(1/2)', '(x^(1/2))'],
    ['1/x^2', '(1/(x^2))'],
    ['2-x', '(2-x)'],
  ])('%s reads as %s', (input, tree) => {
    expect(read(input)).toBe(tree);
  });
});

describe('parseEquation: implicit multiplication', () => {
  it.each([
    ['2x', '(2*x)'],
    ['3(x+1)', '(3*(x+1))'],
    ['(x-1)(x+2)', '((x-1)*(x+2))'],
    ['2sin(x)', '(2*sin(x))'],
    ['xpi', '(x*pi)'],
    ['pix', '(pi*x)'],
    ['ex', '(e*x)'],
    ['2(x)(x)', '((2*x)*x)'],
    ['2x^2', '(2*(x^2))'],
    ['-2x', '((-2)*x)'],
    ['1e3', '((1*e)*3)'], // not 1000: there is no 1e3 notation
  ])('%s reads as %s', (input, tree) => {
    expect(read(input)).toBe(tree);
  });

  it('binds exactly like *, so 1/2x is half of x', () => {
    expect(read('1/2x')).toBe('((1/2)*x)');
  });

  it('reads exp as the function, not e times x times p', () => {
    expect(read('exp(x)')).toBe('exp(x)');
  });

  it('never turns a minus into implicit multiplication', () => {
    expect(read('2-x')).toBe('(2-x)');
    expect(read('x-1')).toBe('(x-1)');
  });
});

describe('parseEquation: absolute value bars', () => {
  it.each([
    ['|x|', 'abs(x)'],
    ['|x-2|', 'abs((x-2))'],
    ['||x|-1|', 'abs((abs(x)-1))'],
    ['|||x|-1|-2|', 'abs((abs((abs(x)-1))-2))'],
    ['2|x|', '(2*abs(x))'],
    ['|x|*|x|', '(abs(x)*abs(x))'],
    ['|x||x|', '(abs(x)*abs(x))'],
    ['|-x|', 'abs((-x))'],
    ['|2(x-|x|)|', 'abs((2*(x-abs(x))))'],
    ['|(2|x|)|', 'abs((2*abs(x)))'],
    ['sin(|x|)', 'sin(abs(x))'],
  ])('%s reads as %s', (input, tree) => {
    expect(read(input)).toBe(tree);
  });
});

describe('parseEquation: friendly errors with positions', () => {
  it.each([
    ['', 'type an equation', 0],
    ['   ', 'type an equation', 0],
    ['sn(x)', 'unknown word "sn" at 0', 0],
    ['2+qx', 'unknown word "qx" at 2', 2],
    ['x + sn(x)', 'unknown word "sn" at 4', 4],
    ['sin(x', 'missing ")"', 3],
    ['(x+1', 'missing ")"', 0],
    ['|x', 'missing closing "|"', 0],
    ['sinx', '"sin" needs parentheses, like sin(x)', 0],
    ['2+sqrt', '"sqrt" needs parentheses, like sqrt(x)', 2],
    ['x^', 'nothing after "^"', 1],
    ['x +', 'nothing after "+"', 2],
    ['y=', 'nothing after "="', 1],
    ['(', 'nothing after "("', 0],
    ['x)', 'unexpected ")"', 1],
    ['(x,1)', 'unexpected ","', 2],
    ['x^)', 'unexpected ")"', 2],
    ['+x', 'unexpected "+"', 0],
    ['x==1', 'unexpected "="', 1],
    ['3.', 'unexpected "."', 1],
    ['1.2.3', 'unexpected "."', 3],
    ['.', 'unexpected "."', 0],
    ['X', 'use lowercase letters, like "x"', 0],
    ['x#2', '"#" isn\'t allowed here', 1],
    ['x=y', 'unexpected "="', 1],
    ['x+y', '"y" can only start the equation, like y=x', 2],
    ['y x', '"y" can only start the equation, like y=x', 0],
    ['2y', '"y" can only start the equation, like y=x', 1],
    ['sin(x,1)', '"sin" takes one input, like sin(x)', 0],
    ['min(x)', '"min" needs at least two inputs, like min(x,1)', 0],
  ])('%j → %s', (input, message, position) => {
    expect(errorOf(input)).toEqual({ message, position });
  });
});

describe('parseEquation: LaTeX input reads the same as plain math', () => {
  it.each([
    [String.raw`\frac{x}{2}`, '(x)/(2)'],
    [String.raw`\frac{1}{2}x`, '(1/2)x'],
    [String.raw`\frac{x-3}{2}^2`, '((x-3)/2)^2'],
    [String.raw`\sqrt{x}`, 'sqrt(x)'],
    [String.raw`\sqrt(x+1)`, 'sqrt(x+1)'],
    [String.raw`x^{2}`, 'x^(2)'],
    [String.raw`2^{x+1}`, '2^(x+1)'],
    [String.raw`{x+1}2`, '(x+1)2'],
    [String.raw`2{x-1}`, '2(x-1)'],
    [String.raw`\sin(x)`, 'sin(x)'],
    [String.raw`\sin{x}`, 'sin(x)'],
    [String.raw`\cos(x)`, 'cos(x)'],
    [String.raw`\tan{x}`, 'tan(x)'],
    [String.raw`\ln(x)`, 'ln(x)'],
    [String.raw`\log{x}`, 'log(x)'],
    [String.raw`\exp(x)`, 'exp(x)'],
    [String.raw`\left(x+1\right)^2`, '(x+1)^2'],
    [String.raw`\left|x-2\right|`, '|x-2|'],
    [String.raw`\left|\left|x\right|-1\right|`, '||x|-1|'],
    [String.raw`2\cdot x`, '2*x'],
    [String.raw`2\times x`, '2*x'],
    [String.raw`\pi x`, 'pix'],
    [String.raw`2\pi`, '2pi'],
    [String.raw`y=\frac{x}{2}`, 'x/2'],
    [String.raw`\min\left(x, 1\right)`, 'min(x,1)'],
    [String.raw`\max(x,1,2)`, 'max(x,1,2)'],
    [String.raw`\lfloor x\rfloor`, 'floor(x)'],
    [String.raw`2\lfloor x/2\rfloor`, '2floor(x/2)'],
    [String.raw`\left|\lfloor x\rfloor\right|`, '|floor(x)|'],
  ])('%s reads like %s', (latex, plain) => {
    expect(read(latex)).toBe(read(plain));
  });

  it('mixes freely with plain math', () => {
    expect(read(String.raw`\frac{x}{2}+sin(x)`)).toBe(read('x/2+sin(x)'));
    expect(read(String.raw`|x|\cdot\sqrt{x}`)).toBe(read('|x|*sqrt(x)'));
    expect(read(String.raw`\left(x-1\right)(x+2)`)).toBe(read('(x-1)(x+2)'));
  });

  it('handles nested fractions and roots', () => {
    expect(read(String.raw`\frac{\frac{x}{2}}{3}`)).toBe('((x/2)/3)');
    expect(read(String.raw`\frac{1}{\frac{1}{x}}`)).toBe('(1/(1/x))');
    expect(read(String.raw`\sqrt{\frac{x}{2}}`)).toBe('sqrt((x/2))');
  });

  it('ignores spaces between a command and what follows', () => {
    expect(read(String.raw`\frac {x} {2}`)).toBe('(x/2)');
    expect(read(String.raw`2 \cdot x`)).toBe('(2*x)');
    expect(read(String.raw`\left( x \right)`)).toBe('x');
  });
});

describe('parseEquation: LaTeX errors', () => {
  it.each([
    [String.raw`\alpha`, String.raw`unknown command "\alpha"`, 0],
    [String.raw`x+\alpha`, String.raw`unknown command "\alpha"`, 2],
    [String.raw`\Sin(x)`, String.raw`unknown command "\Sin"`, 0],
    [String.raw`\,`, String.raw`unknown command "\,"`, 0],
    ['x\\', 'unknown command "\\"', 1],
    [String.raw`\frac{x}`, String.raw`"\frac" needs two parts in braces, like \frac{x}{2}`, 0],
    [String.raw`\frac x2`, String.raw`"\frac" needs two parts in braces, like \frac{x}{2}`, 0],
    [String.raw`\sqrt x`, String.raw`"\sqrt" needs braces, like \sqrt{x}`, 0],
    [String.raw`\sin x`, String.raw`"\sin" needs parentheses, like \sin(x)`, 0],
    [String.raw`\left x`, String.raw`"\left" needs "(", ")" or "|" right after it`, 0],
    [String.raw`x\right`, String.raw`"\right" needs "(", ")" or "|" right after it`, 1],
    [String.raw`\left(x`, 'missing ")"', 0],
    [String.raw`{x`, 'missing "}"', 0],
    [String.raw`\sin{x`, 'missing "}"', 4],
    [String.raw`x}`, 'unexpected "}"', 1],
    [String.raw`(x}`, 'unexpected "}"', 2],
    [String.raw`{x)`, 'unexpected ")"', 2],
    [String.raw`\cdot x`, String.raw`unexpected "\cdot"`, 0],
    [String.raw`\lfloor x`, String.raw`missing "\rfloor"`, 0],
    [String.raw`(x\rfloor`, String.raw`unexpected "\rfloor"`, 2],
  ])('%j → %s', (input, message, position) => {
    expect(errorOf(input)).toEqual({ message, position });
  });
});
