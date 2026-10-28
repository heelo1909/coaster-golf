import { EquationError, messages } from './errors';

export type FuncName =
  'sin' | 'cos' | 'tan' | 'abs' | 'sqrt' | 'log' | 'ln' | 'exp' | 'min' | 'max' | 'floor';
export type ConstName = 'pi' | 'e';
export type Sym = '+' | '-' | '*' | '/' | '^' | '(' | ')' | ',' | '|' | '=';

type TokenBody =
  | { kind: 'num'; value: number }
  | { kind: 'x' }
  | { kind: 'y' }
  | { kind: 'const'; name: ConstName }
  | { kind: 'func'; name: FuncName }
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

const SYMBOLS = '+-*/^(),|=';
const NUMBER = /^(\d+(\.\d+)?|\.\d+)/;

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

    if (SYMBOLS.includes(ch)) {
      tokens.push({ kind: 'sym', sym: ch as Sym, pos, text: ch });
      i++;
      continue;
    }

    if (/[A-Z]/.test(ch)) throw new EquationError(messages.uppercase(ch), pos);
    throw new EquationError(messages.unknownSymbol(ch), pos);
  }
  return tokens;
}
