# src/core/daily: Daily Level Logic (Section 7)

Pure date math for the Daily Level: which level is today's, its number, and streaks. The **screens** that show it live in `src/game/ui/`; saving the streak lives in `src/game/storage/`.

## Files (target)

```
schedule.ts    dailyNumber(), dailyLevelIndex(), msUntilNextDaily()
streak.ts      updateStreak()
share.ts       buildShareText()
index.ts
```

## Rules

- **Everything is UTC.** The day rolls over at 00:00 UTC for everyone in the world. Never use the player's local timezone for which level is today's.
- `LAUNCH_DATE` is a constant (set it in Section 9). `dailyNumber(date)` = whole UTC days since launch + 1, so launch day is **#1**.
- `dailyLevelIndex(n, poolSize)` = `(n - 1) % poolSize` for now. Once the pool wraps, players get repeats, so `check-levels` should warn when fewer than 14 future days are left.
- Functions take the date as a parameter. They **never** call `new Date()` themselves, which keeps them testable and server-safe.
- Built (Section 7): `LAUNCH_DATE` is a placeholder (2026-10-30) until Section 9. `dailyNumber(date, launch = LAUNCH_DATE)` takes the launch only so tests pin their own and don't change when the real date is set. Before launch it returns 0 or less, and `dailyLevelIndex` still maps that into the pool. `msUntilNextDaily(date)` counts to the next 00:00 UTC. `daysLeftInPool(n, poolSize)` = `poolSize - n`; `npm run check-levels` prints a warning (not a failure) below 14 (`poolWarning` in `scripts/level-check.ts`).

## Streaks

```ts
interface StreakState { current: number; best: number; lastPlayed: number | null } // daily numbers
function updateStreak(prev: StreakState, solvedDaily: number): StreakState;
```

- Solving daily `n` when `lastPlayed === n-1` → `current + 1`
- Solving daily `n` when `lastPlayed === n` → unchanged (no double counting)
- Anything else → `current = 1`
- `best = max(best, current)`
- A streak counts **solves**, not visits.
- Built (Section 7): `NO_STREAK` is the empty state, and `liveStreak(state, today)` is the number to show: `current` while the last solve was today or yesterday, else 0. A solve dated before the last one (a clock set back) restarts at 1.

## Share Text

```
Coaster Golf #42 🎢
11 chars (par 14) ⛳
🔥 3-day streak
coastergolf.example
```

- **Never include the equation.** That would spoil the puzzle.
- If not solved: `Coaster Golf #42 🎢 — not yet! 💥`
- The URL is a constant, set at launch.
- Built (Section 7): `buildShareText({ daily, par, score?, streak, url? })` in `share.ts`; `SHARE_URL` is the placeholder `coastergolf.example`. The equation is not an input at all, so it can't leak. The "not yet" text keeps the URL line, so even an unsolved share brings people in. The streak line is left out at 0, and a score of 1 reads "1 char".

## Tests Required

- `dailyNumber` across midnight UTC, across a month boundary, and on launch day itself
- Timezone safety: a `Date` built in a non-UTC offset still maps correctly
- Every streak rule above
- The share text never contains the equation (test with a sample equation)
