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

// Safety limits from equation/CLAUDE.md, so a huge input can't freeze the game or the server.
export interface Limits {
  maxLength: number; // characters typed, checked before tokenizing
  maxDepth: number; // parens, braces, bars, \lfloor and function calls nested inside each other
  maxNodes: number; // nodes in the finished tree
}

export const LIMITS: Limits = { maxLength: 200, maxDepth: 50, maxNodes: 500 };

// Recursive descent over the grammar in equation/CLAUDE.md, one method per rule.
class Parser {
  private i = 0;
  // Bars opened since the nearest "(" — only these can be closed by a "|". Parentheses reset
  // it, because a bar can never close across a parenthesis.
  private openBars = 0;
  private depth = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly maxDepth: number,
  ) {}

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
      case 'frac':
        return this.frac(t);
      case 'y':
        throw new EquationError(messages.yOnlyAtStart(), t.pos);
      case 'sym':
        if (t.sym === '(' || t.sym === '{') {
          return this.group(t);
        }
        if (t.sym === '|') {
          this.openBars++;
          const arg = this.nested(t, () => this.sum());
          this.openBars--;
          this.close(t, '|', messages.missingBar());
          return { type: 'call', fn: 'abs', args: [arg] };
        }
        if (t.sym === '⌊') {
          // \lfloor a \rfloor is floor(a), the way toLatex() writes it.
          const arg = this.insideParens(t, () => this.sum());
          this.close(t, '⌋', messages.missingFloor());
          return { type: 'call', fn: 'floor', args: [arg] };
        }
        throw this.unexpected(t);
    }
  }

  // "(" sum ")" or the LaTeX grouping "{" sum "}"; `open` has already been consumed.
  private group(open: Token & { kind: 'sym' }): Expr {
    if (this.closesRightAway(open)) {
      throw new EquationError(messages.emptyGroup(open.sym + closerOf(open)), open.pos);
    }
    const expr = this.insideParens(open, () => this.sum());
    this.closeGroup(open);
    return expr;
  }

  // \frac{a}{b} is (a)/(b), and like any atom it can take a "^" or sit next to another factor.
  private frac(t: Token): Expr {
    const part = (): Expr => {
      const open = this.peek();
      if (!open || !isSym(open, '{')) throw new EquationError(messages.fracParts(), t.pos);
      this.i++;
      return this.group(open);
    };
    const left = part();
    return { type: 'binary', op: '/', left, right: part() };
  }

  // Functions take parentheses or braces, so sin(x), \sin(x), \sin{x} and \sqrt{x} all work.
  private call(t: Token, fn: FuncName): Expr {
    const open = this.peek();
    if (!open || !(isSym(open, '(') || isSym(open, '{'))) {
      const name = t.text;
      throw new EquationError(
        name === '\\sqrt' ? messages.needsBraces(name) : messages.needsParens(name),
        t.pos,
      );
    }
    this.i++;
    if (this.closesRightAway(open)) {
      const message = MULTI_ARG.includes(fn)
        ? messages.twoInputs(fn)
        : messages.emptyCall(t.text, open.sym, closerOf(open));
      throw new EquationError(message, t.pos);
    }
    const args = this.insideParens(open, () => {
      const list = [this.sum()];
      for (let c = this.peek(); c && isSym(c, ','); c = this.peek()) {
        this.i++;
        list.push(this.sum());
      }
      return list;
    });
    this.closeGroup(open);
    if (MULTI_ARG.includes(fn)) {
      if (args.length < 2) throw new EquationError(messages.twoInputs(fn), t.pos);
    } else if (args.length !== 1) {
      throw new EquationError(messages.oneInput(fn), t.pos);
    }
    return { type: 'call', fn, args };
  }

  private insideParens<T>(open: Token, parse: () => T): T {
    const saved = this.openBars;
    this.openBars = 0;
    try {
      return this.nested(open, parse);
    } finally {
      this.openBars = saved;
    }
  }

  // Parse one bracket level deeper; past the limit the error points at the opener.
  private nested<T>(open: Token, parse: () => T): T {
    if (++this.depth > this.maxDepth) {
      throw new EquationError(messages.tooDeep(this.maxDepth), open.pos);
    }
    try {
      return parse();
    } finally {
      this.depth--;
    }
  }

  private closesRightAway(open: Token & { kind: 'sym' }): boolean {
    const t = this.peek();
    return t !== undefined && isSym(t, closerOf(open));
  }

  private closeGroup(open: Token & { kind: 'sym' }): void {
    if (open.sym === '{') this.close(open, '}', messages.missingBrace());
    else this.close(open, ')', messages.missingParen());
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
    if (t.kind === 'sym')
      return (
        t.sym === '(' || t.sym === '{' || t.sym === '⌊' || (t.sym === '|' && this.openBars === 0)
      );
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

function closerOf(open: Token & { kind: 'sym' }): Sym {
  return open.sym === '{' ? '}' : ')';
}

function countNodes(e: Expr): number {
  switch (e.type) {
    case 'num':
    case 'x':
    case 'const':
      return 1;
    case 'neg':
      return 1 + countNodes(e.arg);
    case 'binary':
      return 1 + countNodes(e.left) + countNodes(e.right);
    case 'call':
      return e.args.reduce((n, arg) => n + countNodes(arg), 1);
  }
}

export function parseEquation(input: string): ParseResult {
  return parseWithLimits(input, LIMITS);
}

// parseEquation() with the limits passed in. Only tests call this directly: within 200
// characters a tree tops out near 400 nodes, so the node limit can't be reached through
// parseEquation() today. It stays as a guard in case the length limit ever grows.
export function parseWithLimits(input: string, limits: Limits): ParseResult {
  try {
    if (input.length > limits.maxLength) {
      throw new EquationError(messages.tooLong(limits.maxLength), limits.maxLength);
    }
    const expr = new Parser(tokenize(input), limits.maxDepth).equation();
    if (countNodes(expr) > limits.maxNodes) {
      throw new EquationError(messages.tooBig(limits.maxNodes), 0);
    }
    return { ok: true, expr, source: input };
  } catch (e) {
    if (e instanceof EquationError) {
      return { ok: false, error: { message: e.message, position: e.position } };
    }
    throw e;
  }
}
