import { EquationError, messages } from './errors';

export type FuncName =
  'sin' | 'cos' | 'tan' | 'abs' | 'sqrt' | 'log' | 'ln' | 'exp' | 'min' | 'max' | 'floor';
export type ConstName = 'pi' | 'e';
// "⌊" and "⌋" only come from \lfloor and \rfloor; they aren't typeable as characters.
export type Sym = '+' | '-' | '*' | '/' | '^' | '(' | ')' | '{' | '}' | '⌊' | '⌋' | ',' | '|' | '=';

type TokenBody =
  | { kind: 'num'; value: number }
  | { kind: 'x' }
  | { kind: 'y' }
  | { kind: 'const'; name: ConstName }
  | { kind: 'func'; name: FuncName }
  | { kind: 'frac' }
  | { kind: 'sym'; sym: Sym };

// pos is a 0-based index into the original input, text is what the player typed (no spaces).
export type Token = TokenBody & { pos: number; text: string };

const FUNCS: readonly FuncName[] = [
  'sin',
  'cos',
  'tan',
  'abs',
  'sqrt',
  'log',
  'ln',
  'exp',
  'min',
  'max',
  'floor',
];

// Longest first, so "exp" is the function and not e·x·p, and "pix" is pi·x.
const WORDS: readonly string[] = [...FUNCS, 'pi', 'e', 'x', 'y'].sort(
  (a, b) => b.length - a.length,
);

// The LaTeX subset from equation/CLAUDE.md. \left and \right are handled separately because
// they take the following "(", ")" or "|" with them.
const COMMANDS: ReadonlyMap<string, TokenBody> = new Map<string, TokenBody>([
  ['\\frac', { kind: 'frac' }],
  ['\\sqrt', { kind: 'func', name: 'sqrt' }],
  ['\\sin', { kind: 'func', name: 'sin' }],
  ['\\cos', { kind: 'func', name: 'cos' }],
  ['\\tan', { kind: 'func', name: 'tan' }],
  ['\\ln', { kind: 'func', name: 'ln' }],
  ['\\log', { kind: 'func', name: 'log' }],
  ['\\exp', { kind: 'func', name: 'exp' }],
  // Not in the original subset, but toLatex() writes them, so they must read back in.
  ['\\min', { kind: 'func', name: 'min' }],
  ['\\max', { kind: 'func', name: 'max' }],
  ['\\lfloor', { kind: 'sym', sym: '⌊' }],
  ['\\rfloor', { kind: 'sym', sym: '⌋' }],
  ['\\cdot', { kind: 'sym', sym: '*' }],
  ['\\times', { kind: 'sym', sym: '*' }],
  ['\\pi', { kind: 'const', name: 'pi' }],
]);

// Longest first, like WORDS. Spaces are already gone, so "\sin x" arrives as "\sinx" and the
// command has to be found as a prefix rather than as a whole run of letters.
const COMMAND_NAMES: readonly string[] = [...COMMANDS.keys(), '\\left', '\\right'].sort(
  (a, b) => b.length - a.length,
);

const SYMBOLS = '+-*/^(){},|=';
const NUMBER = /^(\d+(\.\d+)?|\.\d+)/;

// Math symbols a phone keyboard or a habit might produce, mapped to what to type instead.
const LOOKALIKES: Readonly<Record<string, string>> = {
  '−': '-',
  '–': '-',
  '—': '-',
  '×': '*',
  '·': '*',
  '÷': '/',
  '²': '^2',
  '³': '^3',
  '√': 'sqrt(x)',
  π: 'pi',
};

function wordToken(word: string): TokenBody {
  if (word === 'x') return { kind: 'x' };
  if (word === 'y') return { kind: 'y' };
  if (word === 'pi' || word === 'e') return { kind: 'const', name: word };
  return { kind: 'func', name: word as FuncName };
}

export function tokenize(input: string): Token[] {
  // Spaces are ignored everywhere, the same way scoring ignores them. Keep a map back to the
  // original positions so errors point at what the player actually typed.
  let s = '';
  const posOf: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const ch = input.charAt(i);
    if (/\s/.test(ch)) continue;
    s += ch;
    posOf.push(i);
  }
  const at = (i: number) => posOf[i] ?? input.length;

  const tokens: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s.charAt(i);
    const pos = at(i);

    if (/[0-9.]/.test(ch)) {
      const m = NUMBER.exec(s.slice(i));
      if (!m) throw new EquationError(messages.unexpected('.'), pos);
      const text = m[0];
      i += text.length;
      // "3." and "1.2.3" are rejected rather than guessed at.
      if (s.charAt(i) === '.') throw new EquationError(messages.unexpected('.'), at(i));
      tokens.push({ kind: 'num', value: Number(text), pos, text });
      continue;
    }

    if (/[a-z]/.test(ch)) {
      const word = WORDS.find((w) => s.startsWith(w, i));
      if (!word) {
        const run = /^[a-z]+/.exec(s.slice(i))?.[0] ?? ch;
        throw new EquationError(messages.unknownWord(run, pos), pos);
      }
      tokens.push({ ...wordToken(word), pos, text: word });
      i += word.length;
      continue;
    }

    if (ch === '\\') {
      const name = COMMAND_NAMES.find((c) => s.startsWith(c, i));
      if (!name) {
        const run = /^\\([a-z]+|.?)/i.exec(s.slice(i))?.[0] ?? ch;
        throw new EquationError(messages.unknownCommand(run), pos);
      }
      i += name.length;
      const body = COMMANDS.get(name);
      if (body) {
        tokens.push({ ...body, pos, text: name });
        continue;
      }
      // \left( and \right| are just a parenthesis or a bar with a longer spelling.
      const next = s.charAt(i);
      if (next === '' || !'()|'.includes(next)) {
        throw new EquationError(messages.leftRightNeedsBracket(name), pos);
      }
      i++;
      tokens.push({ kind: 'sym', sym: next as Sym, pos, text: name + next });
      continue;
    }

    if (SYMBOLS.includes(ch)) {
      tokens.push({ kind: 'sym', sym: ch as Sym, pos, text: ch });
      i++;
      continue;
    }

    if (/[A-Z]/.test(ch)) throw new EquationError(messages.uppercase(ch), pos);
    // A whole code point, so an emoji shows as itself rather than half a surrogate pair.
    const symbol = String.fromCodePoint(s.codePointAt(i) ?? 0);
    const use = LOOKALIKES[symbol];
    if (use) throw new EquationError(messages.lookalike(symbol, use), pos);
    throw new EquationError(messages.unknownSymbol(symbol), pos);
  }
  return tokens;
}
