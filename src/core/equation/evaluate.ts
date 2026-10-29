import type { BinaryOp, Expr } from './parser';
import type { FuncName } from './tokenizer';

// A plain recursive switch over the tree: no eval, no Function, no building JS strings.
// Every step that isn't a finite number becomes NaN, so 1/0, ln(0) and exp(1000) all mean
// "the track has a gap here" rather than an infinity the simulation would have to handle.
export function evaluate(expr: Expr, x: number): number {
  switch (expr.type) {
    case 'num':
      return expr.value;
    case 'x':
      return x;
    case 'const':
      return expr.name === 'pi' ? Math.PI : Math.E;
    case 'neg':
      return -evaluate(expr.arg, x);
    case 'binary':
      return finite(binary(expr.op, evaluate(expr.left, x), evaluate(expr.right, x)));
    case 'call':
      return finite(
        call(
          expr.fn,
          expr.args.map((arg) => evaluate(arg, x)),
        ),
      );
  }
}

function binary(op: BinaryOp, a: number, b: number): number {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      return a / b;
    case '^':
      return a ** b;
  }
}

// The parser has already checked arity: one input, or two or more for min and max.
function call(fn: FuncName, args: number[]): number {
  const a = args[0] ?? NaN;
  switch (fn) {
    case 'sin':
      return Math.sin(a);
    case 'cos':
      return Math.cos(a);
    case 'tan':
      return Math.tan(a);
    case 'abs':
      return Math.abs(a);
    case 'sqrt':
      return Math.sqrt(a);
    case 'log':
      return Math.log10(a);
    case 'ln':
      return Math.log(a);
    case 'exp':
      return Math.exp(a);
    case 'min':
      return Math.min(...args);
    case 'max':
      return Math.max(...args);
    case 'floor':
      return Math.floor(a);
  }
}

function finite(v: number): number {
  return Number.isFinite(v) ? v : NaN;
}
