// Which daily level is today's (see daily/CLAUDE.md). Everything is UTC: the day rolls over at
// 00:00 UTC for everyone. Every function takes the date; none reads the clock itself.

const DAY_MS = 24 * 60 * 60 * 1000;

// Day #1. A placeholder until launch: Section 9 sets the real date (docs/launch/CLAUDE.md).
export const LAUNCH_DATE = Date.UTC(2026, 9, 30); // 2026-10-30, months count from 0

// Whole UTC days since launch, plus one, so launch day is #1. Before launch it's 0 or less.
// `launch` is only passed by tests, so they don't depend on the real date.
export function dailyNumber(date: Date, launch: number = LAUNCH_DATE): number {
  return Math.floor((date.getTime() - launch) / DAY_MS) + 1;
}

// Which level in the pool daily #n plays. The pool repeats once it runs out; a number before
// launch still maps into the pool, so nothing breaks while testing early.
export function dailyLevelIndex(n: number, poolSize: number): number {
  return (((n - 1) % poolSize) + poolSize) % poolSize;
}

// Milliseconds until the next daily starts, at the next 00:00 UTC.
export function msUntilNextDaily(date: Date): number {
  const t = date.getTime();
  return DAY_MS - (((t % DAY_MS) + DAY_MS) % DAY_MS);
}

// Pool days still unplayed after daily #n; check-levels warns when this drops below 14.
export function daysLeftInPool(n: number, poolSize: number): number {
  return poolSize - n;
}
