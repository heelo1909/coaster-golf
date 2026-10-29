// A player mistake in the equation. Thrown inside the tokenizer/parser only, and turned into
// a { ok: false } result by parseEquation(); it never escapes the public API.
export class EquationError extends Error {
  constructor(
    message: string,
    readonly position: number,
  ) {
    super(message);
  }
}

export const messages = {
  empty: () => 'type an equation',
  unknownWord: (word: string, at: number) => `unknown word "${word}" at ${at}`,
  uppercase: (ch: string) => `use lowercase letters, like "${ch.toLowerCase()}"`,
  unknownCommand: (cmd: string) => `unknown command "${cmd}"`,
  leftRightNeedsBracket: (cmd: string) => `"${cmd}" needs "(", ")" or "|" right after it`,
  unknownSymbol: (ch: string) => `"${ch}" isn't allowed here`,
  unexpected: (text: string) => `unexpected "${text}"`,
  nothingAfter: (text: string) => `nothing after "${text}"`,
  missingParen: () => 'missing ")"',
  missingBar: () => 'missing closing "|"',
  missingBrace: () => 'missing "}"',
  missingFloor: () => 'missing "\\rfloor"',
  needsBraces: (cmd: string) => `"${cmd}" needs braces, like ${cmd}{x}`,
  fracParts: () => '"\\frac" needs two parts in braces, like \\frac{x}{2}',
  needsParens: (fn: string) => `"${fn}" needs parentheses, like ${fn}(x)`,
  oneInput: (fn: string) => `"${fn}" takes one input, like ${fn}(x)`,
  twoInputs: (fn: string) => `"${fn}" needs at least two inputs, like ${fn}(x,1)`,
  yOnlyAtStart: () => '"y" can only start the equation, like y=x',
};
