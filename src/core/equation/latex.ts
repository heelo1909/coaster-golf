import type { Expr } from './parser';

// Binding strength of what an Expr renders as, low → high. A fraction renders as a single
// \frac{…}{…} block, so it counts as an atom even though it is a division.
const SUM = 1;
const PRODUCT = 2;
const UNARY = 3;
const ATOM = 5;

// Display only: turns a parsed tree into LaTeX for the KaTeX preview. The output always reads
// back through parseEquation() as the same tree (see latex.test.ts), so it's safe to show it
// as "this is how your equation was understood".
export function toLatex(expr: Expr): string {
  switch (expr.type) {
    case 'num':
      return number(expr.value);
    case 'x':
      return 'x';
    case 'const':
      return expr.name === 'pi' ? '\\pi' : 'e';
    case 'neg': {
      // -2x reads back as (-2)·x, which has the same value, so only a sum needs brackets.
      const arg = toLatex(expr.arg);
      return '-' + (strength(expr.arg) === SUM ? wrap(arg) : arg);
    }
    case 'binary':
      return binary(expr.op, expr.left, expr.right);
    case 'call': {
      const args = expr.args.map(toLatex);
      switch (expr.fn) {
        case 'abs':
          return `\\left|${args.join(', ')}\\right|`;
        case 'sqrt':
          return `\\sqrt{${args.join(', ')}}`;
        case 'floor':
          return join('\\lfloor', args.join(', ')) + '\\rfloor';
        default:
          return `\\${expr.fn}\\left(${args.join(', ')}\\right)`;
      }
    }
  }
}

function binary(op: '+' | '-' | '*' | '/' | '^', left: Expr, right: Expr): string {
  const l = toLatex(left);
  const r = toLatex(right);
  switch (op) {
    case '+':
    case '-':
      // Brackets on the right keep x-(1-x) from turning into x-1-x, and make x-(-1) readable.
      return l + op + (strength(right) === SUM || right.type === 'neg' ? wrap(r) : r);
    case '*': {
      const lt = strength(left) === SUM ? wrap(l) : l;
      const rt = strength(right) <= UNARY ? wrap(r) : r;
      // 2x and 2\sin(x) read better without a dot. Never before a bar (|x|x|| can't be read
      // back) or a fraction (2\frac{1}{3} looks like a mixed number).
      if (isPlainNumber(left) && /^(?:[a-z]|\\(?!left\||frac))/.test(rt)) return join(lt, rt);
      return join(lt + '\\cdot', rt);
    }
    case '/':
      return `\\frac{${l}}{${r}}`;
    case '^':
      // A fraction is wrapped too, so its exponent can't be mistaken for the denominator's.
      return (strength(left) < ATOM || isFraction(left) ? wrap(l) : l) + `^{${r}}`;
  }
}

function strength(e: Expr): number {
  switch (e.type) {
    case 'num':
      return isPlainNumber(e) ? ATOM : PRODUCT;
    case 'neg':
      return UNARY;
    case 'binary':
      if (e.op === '+' || e.op === '-') return SUM;
      if (e.op === '*') return PRODUCT;
      return e.op === '/' ? ATOM : UNARY + 1;
    default:
      return ATOM;
  }
}

// Numbers are stored as values, so a huge or tiny literal comes back as "1e+21". There is no
// e-notation in the grammar (e is the constant), so write it out as a power of ten instead.
function number(value: number): string {
  const s = String(value);
  const m = /^([\d.]+)e([+-]\d+)$/.exec(s);
  return m ? `${m[1]}\\times10^{${Number(m[2])}}` : s;
}

function isPlainNumber(e: Expr): boolean {
  return e.type === 'num' && !String(e.value).includes('e');
}

function isFraction(e: Expr): boolean {
  return e.type === 'binary' && e.op === '/';
}

function wrap(s: string): string {
  return `\\left(${s}\\right)`;
}

// KaTeX reads "\cdotx" as one unknown command, so a command followed by a letter needs a space.
function join(a: string, b: string): string {
  return /\\[a-z]+$/i.test(a) && /^[a-z]/i.test(b) ? `${a} ${b}` : a + b;
}
