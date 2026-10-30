# worker: Leaderboard API (Section 8)

A Cloudflare Worker with a D1 (SQLite) database. Its only job is to accept leaderboard submissions, **verify them by re-running the game**, and serve the top scores.

## Files (target)

```
wrangler.toml        Worker + D1 binding + rate-limit binding
migrations/          D1 tables (0001_scores.sql is the schema below), applied by `npm run worker:db`
src/index.ts         router: POST /submit, GET /leaderboard
src/submit.ts        validate → judge → save
src/leaderboard.ts   query + hide-daily-equations rule
src/nickname.ts      (lives in src/core/nickname/ instead, so the browser's prompt shares it)
src/levels.ts        loads level data (imports src/levels from the game)
test/                Vitest tests using Miniflare / @cloudflare/vitest-pool-workers
```

## How It's Set Up (Section 8)

- `npm run worker:db` applies `migrations/*.sql` to the local D1 (in `.wrangler/`, git-ignored); `npm run worker:dev` serves the API on http://localhost:8787. No Cloudflare account is needed locally. `database_id` in `wrangler.toml` is a placeholder until launch.
- `src/index.ts` exports `handle(request, env)` (plain, testable) and the default `fetch` handler. `src/env.ts` types the bindings: `DB` (D1) and `SUBMIT_LIMIT` (the rate-limit binding).
- **Tests use Miniflare directly, not `@cloudflare/vitest-pool-workers`**: the pool needs Vitest 4 and the project is on Vitest 5. `test/env.ts` makes a real D1 through `new Miniflare({ d1Databases: ['DB'] })` (the same SQLite engine as `wrangler dev`), applies every migration, and passes a rate limiter the test controls. Tests call `handle()` in Node and run with `npm test` (`worker/test/**/*.test.ts`).
- Types: `worker/tsconfig.json` uses `@cloudflare/workers-types` instead of the DOM; `npm run build` type-checks it with `tsc -p worker`. Node and Worker `URL` types clash in tests, so pass paths as strings (`fileURLToPath`).

## Trust Rule (most important)

The browser sends **only** `{ levelId, equation, nickname }`. The Worker:
1. Looks up the level from its **own** bundled copy (never a level sent by the client)
2. Calls `judge(level, equation)` from `src/core`
3. Saves **only if** `result.success`, using the score that `judge` computed

Any `score`, `success` or `path` field in the request is ignored. A test proves this.

## API

```
POST /submit
  body: { levelId: "c03" | "daily:42", equation: string, nickname: string }
  200 { ok: true, score, best, rank }    // score: this run; best and rank: the nickname's saved best
  400 { ok: false, error: "bad_request" | "bad_equation" | "run_failed" | "bad_nickname" | "unknown_level" | "daily_closed" }
  413 { ok: false, error: "too_big" }     // body over 1 KB (in bytes), refused before JSON parsing
  429 { ok: false, error: "slow_down" }

GET /leaderboard?level=c03          top 50 for a campaign level
GET /leaderboard?level=daily:42     top 50 for a daily (equations hidden until it's over)
  200 { entries: [{ rank, nickname, score, equation | null, at }], you?: {rank, score} }
```

- Daily submissions are accepted only **while that daily is live**, from its UTC start to its end.
- Built: `src/levels.ts` `findLevel(levelId, now)` looks the level up in the bundled `src/levels` (`daily:N` only when `N` is today's `dailyNumber`). `src/submit.ts` saves with one `INSERT … ON CONFLICT DO UPDATE … WHERE excluded.score < scores.score`, then reads the best back to rank it. `handle(request, env, now)` takes `now` for tests. `bad_request` covers a body that isn't a JSON object.
- Each nickname keeps only its **best** entry per level; a worse score isn't saved.
- Built: `isLiveDaily(boardId, now)` decides hiding; on today's daily board every `equation` is `null` (including your own: the browser already shows it locally). From the next 00:00 UTC the same board shows them.
- Built: `GET /leaderboard` also takes `&nickname=…` for `you`. Past and today's daily boards can be read; a future daily or unknown id is `400 unknown_level`. Ranks are unique (ties go to the earlier run), from `placeOf()` in `src/leaderboard.ts`, which `/submit` shares.
- Ties go to whoever got there first.

## Schema (starting point)

```sql
CREATE TABLE scores (
  level_id   TEXT NOT NULL,
  nickname   TEXT NOT NULL,
  equation   TEXT NOT NULL,
  score      INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (level_id, nickname)
);
CREATE INDEX idx_board ON scores (level_id, score, created_at);
```

## Abuse Protection

- Reject bodies over 1 KB and equations over 200 characters **before** parsing.
- Rate limit: 30 submissions per minute per IP, using Cloudflare's Rate Limiting binding. Don't store IPs in D1.
- Built: the limiter runs first on `/submit`, keyed by `CF-Connecting-IP` (only `/submit` is limited; reading boards isn't). Then the 1 KB byte check on the raw text, then JSON, then `equation.length > LIMITS.maxLength` (200, exported from `src/core`) as `bad_equation` before `judge()`.
- Nicknames: 3–16 characters, `[A-Za-z0-9_]`, checked against a small profanity list (with letter-swap variants like `0→o`). Ask the user before adding a third-party list.
- Built: `checkNickname()` in `src/core/nickname/` (shared with the browser). Two in-house lists: roots blocked anywhere after undoing swaps (0→o, 1→i or l, 3→e, 4→a, 5→s, 7→t, 8→b, 9→g) and underscores, and short words blocked only as a whole name or a whole `_` part (so "classic" is fine). Known trade-off: a long root inside a real name (Hancock) is blocked. Nicknames aren't owned: with no accounts, two players typing the same nickname share its row.
- `judge()` is fast (under 50 ms), but cap total work anyway: reject if parsing hits the node limit.

## Privacy

Store nickname, equation, score and timestamp only. **No IPs, emails, user agents or cookies.** This must match the privacy page in `docs/launch/`.

## Other Rules

- CORS: allow only the game's own origin (and `localhost` in dev).
- All SQL uses bound parameters (`.bind()`); never build SQL from strings.
- Wrangler config stays in this folder. Secrets (if any ever exist) go in `wrangler secret`, never in git.

## Tests Required

- A valid winning submission is saved and appears on the board
- A losing equation → `run_failed`, nothing saved
- A fake `score: 1` in the body is ignored
- A worse score doesn't replace a better one; a better one does
- Daily equations are hidden while live and shown after
- Bad nickname, unknown level, oversized body
- Rate limiting returns 429
