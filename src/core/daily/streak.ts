// Daily streaks (see daily/CLAUDE.md). A streak counts days solved in a row, by daily number;
// visiting without solving doesn't count.

export interface StreakState {
  current: number;
  best: number;
  lastPlayed: number | null; // the daily number last solved
}

export const NO_STREAK: StreakState = { current: 0, best: 0, lastPlayed: null };

// The streak after solving daily `solved`. Solving the same daily again changes nothing.
export function updateStreak(prev: StreakState, solved: number): StreakState {
  if (prev.lastPlayed === solved) return prev;
  const current = prev.lastPlayed === solved - 1 ? prev.current + 1 : 1;
  return { current, best: Math.max(prev.best, current), lastPlayed: solved };
}

// The streak to show on daily `today`: still alive if the last solve was today or yesterday,
// otherwise it's broken and shows 0 (until the next solve starts a new one).
export function liveStreak(state: StreakState, today: number): number {
  const last = state.lastPlayed;
  return last !== null && (last === today || last === today - 1) ? state.current : 0;
}
