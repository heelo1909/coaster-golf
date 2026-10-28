import { EquationError, messages } from './errors';
import { tokenize, type ConstName, type FuncName, type Sym, type Token } from './tokenizer';

export type BinaryOp = '+' | '-' | '*' | '/' | '^';

export type Expr =
  | { type: 'num'; value: number }
  | { type: 'x' }
  | { type: 'const'; name: ConstName }
  | { type: 'neg'; arg: Expr }
  | { type: 'binary'; op: BinaryOp; left: Expr; right: Expr }
  | { type: 'call'; fn: FuncName; args: Expr[] }; // |a| parses as abs(a)

export type ParseResult =
  | { ok: true; expr: Expr; source: string }
  | { ok: false; error: { message: string; position: number } };

const MULTI_ARG: readonly FuncName[] = ['min', 'max'];

// Recursive descent over the grammar in equation/CLAUDE.md, one method per rule.
class Parser {
  private i = 0;
  // Bars opened since the nearest "(" — only these can be closed by a "|". Parentheses reset
  // it, because a bar can never close across a parenthesis.
  private openBars = 0;

  constructor(private readonly tokens: Token[]) {}

  equation(): Expr {
    const first = this.peek();
    if (!first) throw new EquationError(messages.empty(), 0);
    if (first.kind === 'y') {
      this.i++;
      const eq = this.peek();
      if (!eq || !isSym(eq, '=')) throw new EquationError(messages.yOnlyAtStart(), first.pos);
      this.i++;
    }
    const expr = this.sum();
    const extra = this.peek();
    if (extra) throw this.unexpected(extra);
    return expr;
  }

  private sum(): Expr {
    let left = this.product();
    for (let t = this.peek(); t && (isSym(t, '+') || isSym(t, '-')); t = this.peek()) {
      this.i++;
      left = { type: 'binary', op: t.sym, left, right: this.product() };
    }
    return left;
  }

  private product(): Expr {
    let left = this.unary();
    for (;;) {
      const t = this.peek();
      if (t && (isSym(t, '*') || isSym(t, '/'))) {
        this.i++;
        left = { type: 'binary', op: t.sym, left, right: this.unary() };
      } else if (t && this.startsImplicitFactor(t)) {
        // 2x, 3(x+1), pix: binds exactly like "*", so 1/2x is (1/2)*x.
        left = { type: 'binary', op: '*', left, right: this.unary() };
      } else {
        return left;
      }
    }
  }

  private unary(): Expr {
    const t = this.peek();
    if (t && isSym(t, '-')) {
      this.i++;
      return { type: 'neg', arg: this.unary() };
    }
    return this.power();
  }

  private power(): Expr {
    const base = this.atom();
    const t = this.peek();
    if (t && isSym(t, '^')) {
      this.i++;
      // The exponent is a unary, so 2^-x works and 2^3^2 is 2^(3^2).
      return { type: 'binary', op: '^', left: base, right: this.unary() };
    }
    return base;
  }

  private atom(): Expr {
    const t = this.peek();
    if (!t) {
      const last = this.tokens[this.i - 1];
      // equation() rejects empty input, so an atom is only ever missing after some token.
      if (!last) throw new Error('atom() called with no tokens');
      throw new EquationError(messages.nothingAfter(last.text), last.pos);
    }
    this.i++;
    switch (t.kind) {
      case 'num':
        return { type: 'num', value: t.value };
      case 'x':
        return { type: 'x' };
      case 'const':
        return { type: 'const', name: t.name };
      case 'func':
        return this.call(t, t.name);
      case 'y':
        throw new EquationError(messages.yOnlyAtStart(), t.pos);
      case 'sym':
        if (t.sym === '(') {
          const expr = this.insideParens(() => this.sum());
          this.close(t, ')', messages.missingParen());
          return expr;
        }
        if (t.sym === '|') {
          this.openBars++;
          const arg = this.sum();
          this.openBars--;
          this.close(t, '|', messages.missingBar());
          return { type: 'call', fn: 'abs', args: [arg] };
        }
        throw this.unexpected(t);
    }
  }

  private call(t: Token, fn: FuncName): Expr {
    const open = this.peek();
    if (!open || !isSym(open, '(')) throw new EquationError(messages.needsParens(fn), t.pos);
    this.i++;
    const args = this.insideParens(() => {
      const list = [this.sum()];
      for (let c = this.peek(); c && isSym(c, ','); c = this.peek()) {
        this.i++;
        list.push(this.sum());
      }
      return list;
    });
    this.close(open, ')', messages.missingParen());
    if (MULTI_ARG.includes(fn)) {
      if (args.length < 2) throw new EquationError(messages.twoInputs(fn), t.pos);
    } else if (args.length !== 1) {
      throw new EquationError(messages.oneInput(fn), t.pos);
    }
    return { type: 'call', fn, args };
  }

  private insideParens<T>(parse: () => T): T {
    const saved = this.openBars;
    this.openBars = 0;
    try {
      return parse();
    } finally {
      this.openBars = saved;
    }
  }

  // Consume the closing token for `open`; at end of input the error points at the opener.
  private close(open: Token, sym: Sym, missing: string): void {
    const t = this.peek();
    if (!t) throw new EquationError(missing, open.pos);
    if (!isSym(t, sym)) throw this.unexpected(t);
    this.i++;
  }

  // An atom can follow directly (implicit multiplication). A "|" opens a new bar here only
  // when no bar is waiting to be closed, so 2|x| works and |x|-1| closes where expected.
  private startsImplicitFactor(t: Token): boolean {
    if (t.kind === 'sym') return t.sym === '(' || (t.sym === '|' && this.openBars === 0);
    return t.kind !== 'y';
  }

  private unexpected(t: Token): EquationError {
    if (t.kind === 'y') return new EquationError(messages.yOnlyAtStart(), t.pos);
    return new EquationError(messages.unexpected(t.text), t.pos);
  }

  private peek(): Token | undefined {
    return this.tokens[this.i];
  }
}

function isSym<S extends Sym>(t: Token, sym: S): t is Token & { kind: 'sym'; sym: S } {
  return t.kind === 'sym' && t.sym === sym;
}

export function parseEquation(input: string): ParseResult {
  try {
    const expr = new Parser(tokenize(input)).equation();
    return { ok: true, expr, source: input };
  } catch (e) {
    if (e instanceof EquationError) {
      return { ok: false, error: { message: e.message, position: e.position } };
    }
    throw e;
  }
}
