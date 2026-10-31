# src/core: Shared Game Logic

Pure logic used by **both** the browser game and the leaderboard server. If you're working anywhere under `src/core/`, these rules apply on top of the root CLAUDE.md.

## Rules

- **No DOM, no browser APIs, no Node APIs.** No `window`, `document`, `localStorage`, `fetch`, `fs`, `Date.now()` inside simulation code. Anything that needs the outside world gets it as a parameter.
- **No randomness.** No `Math.random()`. Same input → same output, always.
- **No dependencies** in `src/core/` unless `progress.md` records why. This code runs in a Cloudflare Worker too.
- **No throwing for player mistakes.** Bad equations and failed runs are normal results, returned as values (`{ ok: false, ... }`). Only throw for programmer errors.
- Every public function is exported from the feature's `index.ts` and has tests.

## Shared Contract

These types are how the features talk to each other. Each one lives in its feature folder. **Don't change a shape without updating every user and noting it in `progress.md` under Decisions.**

```ts
// equation/
type ParseResult =
  | { ok: true; expr: Expr; source: string }           // source = original input
  | { ok: false; error: { message: string; position: number } };
function parseEquation(input: string): ParseResult;
function evaluate(expr: Expr, x: number): number;      // NaN when undefined
function scoreEquation(input: string): number;         // character count (see equation/CLAUDE.md)
function toLatex(expr: Expr): string;                  // display only; accepts plain or LaTeX input upstream

// level/
interface Level { /* see level/CLAUDE.md */ }
function validateLevel(raw: unknown): { ok: true; level: Level } | { ok: false; errors: string[] };

// sim/
type FailReason = 'FLEW_OFF' | 'STALLED' | 'HIT_OBSTACLE'
                | 'BROKEN_TRACK' | 'MISSED_START' | 'MISSED_END' | 'TIMEOUT';
interface SimResult {
  success: boolean;
  reason?: FailReason;
  failAt?: { x: number; y: number; t: number };
  path: Array<{ t: number; x: number; y: number; angle: number }>; // for the renderer
  duration: number;
}
function simulate(level: Level, f: (x: number) => number): SimResult;

// The one function everyone (UI and server) uses to judge a run:
function judge(level: Level, input: string):
  | { ok: false; parseError: { message: string; position: number } }
  | { ok: true; result: SimResult; score: number };    // score only counts if result.success

// daily/
function dailyNumber(dateUtc: Date): number;           // #1 = launch day (tests may pass a launch)
function dailyLevelIndex(dailyNumber: number, poolSize: number): number;
function msUntilNextDaily(date: Date): number;         // to the next 00:00 UTC
```

`judge()` is exported from `src/core/index.ts` (defined in `src/core/judge.ts`, so `level/validate.ts` can import it without a circular import). The UI and the Worker must both call `judge()`, never parse + simulate + score by hand, so they can't drift apart.

## Folder Map

| Folder | Feature | Section | Harness |
|---|---|---|---|
| `equation/` | parser, evaluator, scoring | 2 | `equation/CLAUDE.md` |
| `sim/` | track + cart physics | 3 | `sim/CLAUDE.md` |
| `level/` | level types + validator | 4 | `level/CLAUDE.md` |
| `daily/` | date → daily level, streaks | 7 | `daily/CLAUDE.md` |
