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
