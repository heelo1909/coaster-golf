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
  nextLevelArrow: 'Next level →',
  tryShorter: 'Try shorter',
  tryAgain: 'Try again',
  theme: 'Theme',
  mute: 'Mute sound',
  unmute: 'Turn sound on',
  levelsTitle: 'Levels',
  backToLevels: 'All levels',
  levelsButton: 'Levels',
  locked: 'Locked',
  tileBest: (n: number) => `Best ${n}`,
  tilePar: (par: number) => `Par ${par}`,
  yourBest: 'Your best: ',
  bestChars: (n: number) => ` · ${chars(n)}`,
  dailyTitle: (n: number) => `Daily #${n}`,
  todaysDaily: "Today's daily",
  nextDaily: (time: string) => `Next in ${time}`,
  newDaily: 'New daily is out →',
  leaderboard: 'Leaderboard',
  board: 'Board',
  close: 'Close',
  boardTitle: (name: string) => `Leaderboard · ${name}`,
  boardLoading: 'Loading…',
  boardEmpty: 'No runs yet. Be the first!',
  boardListFailed: "Couldn't load the board right now.",
  boardHidden: 'hidden until tomorrow',
  boardSaved: (rank: number, keptBest: boolean) =>
    keptBest ? `Your best still stands: you're #${rank}` : `Saved! You're #${rank}`,
  boardErrors: {
    offline: "Couldn't reach the leaderboard. Try again later.",
    slow_down: 'Too many tries. Wait a minute and try again.',
    daily_closed: 'That daily has ended, so its board is closed.',
    run_failed: "The server's ride didn't make it, so it wasn't saved.",
    bad_nickname: 'That nickname isn’t allowed. Pick another.',
    too_big: "That's too long to send.",
  } as Record<string, string>,
  nicknameLabel: 'Pick a nickname for the leaderboard',
  nicknameRules: '3–16 letters, numbers or _. It’s the only thing we keep.',
  nicknameOk: 'Looks good.',
  nicknameSave: 'Save and submit',
  nicknameErrors: {
    too_short: 'At least 3 characters.',
    too_long: 'At most 16 characters.',
    bad_characters: 'Only letters, numbers and _.',
    not_allowed: 'Please pick another nickname.',
  },
  share: 'Share',
  copied: 'Copied!',
  copyFailed: "Couldn't copy",
  streak: (days: number) => `🔥 ${days}-day streak`,
  notSaving: "Progress won't be saved in this browser.",
  howToTitle: 'How to play',
  howToLink: 'How to play',
  howToPicture: 'A curved track carrying the cart from Start to End',
  start: 'Start',
  end: 'End',
  howToSteps: [
    ['Type an equation.', ' It becomes the track: `x/2` is a gentle slope, `0` is flat ground.'],
    ['Ride.', ' The cart has to get from Start to End without flying off, stalling or crashing.'],
    ['Shorter wins.', ' Your score is how many characters you typed. Reach par for a ★.'],
  ] as const,
  howToDone: "Let's go",
  aboutLink: 'About',
  privacyLink: 'Privacy',
  // The About screen, in the Markdown subset of ui/doc.ts. The privacy page's text is
  // docs/launch/privacy.md, so it's kept with the launch docs that say what it must cover.
  about: `# About Coaster Golf

Type an equation and it becomes a rollercoaster track. A cart rides it with real physics. Any track that gets the cart from Start to End wins, but your score is how many characters you typed, so shorter is better.

## Two ways to play

- Levels: a set of puzzles that unlock one by one, played at your own pace.
- Daily: one new level every day at midnight UTC, the same for everyone. Keep a streak, and share your score without giving away your equation.

## Fair scores

Every leaderboard entry is ridden again on the server before it's saved, so a score can't be faked.

## Hello

Coaster Golf is free, with no accounts and no cookies. Read the [privacy page](#/privacy), or say hi at [heelo1909@gmail.com](mailto:heelo1909@gmail.com).`,
  tileLabel: (num: number, name: string, locked: boolean, best: number | undefined, par: number) =>
    locked
      ? `Level ${num}, ${name}, locked`
      : best === undefined
        ? `Level ${num}, ${name}, par ${par}`
        : `Level ${num}, ${name}, best ${chars(best)}, par ${par}${best <= par ? ', at or under par' : ''}`,
};
