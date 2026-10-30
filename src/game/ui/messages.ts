// Every player-facing string in the game UI, in one place (see ui/CLAUDE.md). Parse error
// wording lives with the parser in src/core/equation/errors.ts.

import type { FailReason } from '../../core';

// An x position as players read it: one decimal place, and never "-0.0".
export function formatX(x: number): string {
  const text = x.toFixed(1);
  return text === '-0.0' ? '0.0' : text;
}

// Why a ride failed, in plain words. Never shows the reason code itself.
const failMessages: Record<FailReason, (x: string) => string> = {
  FLEW_OFF: (x) => `Too fast over that hill — the cart flew off at x = ${x}`,
  STALLED: (x) => `Ran out of speed at x = ${x} — it needs more downhill`,
  HIT_OBSTACLE: (x) => `Crashed into a rock at x = ${x}`,
  MISSED_START: () => 'Your track misses the start station',
  MISSED_END: () => 'Your track misses the end station',
  BROKEN_TRACK: (x) => `The track has a gap or a wall at x = ${x}`,
  OUT_OF_BOUNDS: () => 'The track goes off the map',
  TIMEOUT: () => 'The ride took too long',
};

// "1 char", "11 chars".
function chars(n: number): string {
  return n === 1 ? '1 char' : `${n} chars`;
}

export const messages = {
  equationLabel: 'Your track',
  equationPlaceholder: 'y = x/2',
  counter: (n: number, par: number) => `${chars(n)} · par ${par}`,
  ride: 'Ride',
  skip: 'Skip',
  noPasting: 'No pasting — type it out ✍️',
  won: (n: number, par: number) => `Made it! ${chars(n)} (par ${par})`,
  parStar: '★ At or under par',
  failed: (reason: FailReason, x: number) => failMessages[reason](formatX(x)),
  hint: (hint: string) => `Hint: ${hint}`,
  nextLevel: 'Next level',
  tryShorter: 'Try shorter',
  tryAgain: 'Try again',
  theme: 'Theme',
  levelsTitle: 'Levels',
  backToLevels: 'All levels',
  locked: 'Locked',
  tileBest: (n: number) => `Best ${n}`,
  tilePar: (par: number) => `Par ${par}`,
  yourBest: 'Your best: ',
  bestChars: (n: number) => ` · ${chars(n)}`,
  notSaving: "Progress won't be saved in this browser.",
  tileLabel: (num: number, name: string, locked: boolean, best: number | undefined, par: number) =>
    locked
      ? `Level ${num}, ${name}, locked`
      : best === undefined
        ? `Level ${num}, ${name}, par ${par}`
        : `Level ${num}, ${name}, best ${chars(best)}, par ${par}${best <= par ? ', at or under par' : ''}`,
};
