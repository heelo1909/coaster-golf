// Every player-facing string in the game UI, in one place (see ui/CLAUDE.md). Parse error
// wording lives with the parser in src/core/equation/errors.ts.

export const messages = {
  equationLabel: 'Your track',
  equationPlaceholder: 'y = x/2',
  counter: (chars: number, par: number) => `${chars} chars · par ${par}`,
};
