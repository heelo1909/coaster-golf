# Coaster Golf Project Instructions

## 0. Session Start Protocol (do this first, every session)

The context is cleared between sessions. These files are the only memory of the project.

1. **Read `progress.md`** to find the current section, the next task, and any blockers or decisions.
2. **Read `section.md`**, but only the section that `progress.md` names as current, plus the "Global Rules" at the top. Don't load other sections unless the current one depends on them.
3. **Read the feature harness** (`CLAUDE.md`) in every folder the task touches. Each section's **Harness:** line lists them (see §8). Folder harness rules add to this file; if they conflict, this file wins.
4. Work on the **next unchecked task** in that section. Don't skip ahead or start the next section early.
5. **Before ending a session** (or once a task is done), update `progress.md`:
   - tick the finished tasks in `section.md`
   - set "Current section" and "Next task"
   - add a dated line to the log describing what changed and what was verified
   - record any decision made, and any blocker with what's needed to clear it
6. If a task turns out to be wrong or too big, don't improvise silently. Write the problem in `progress.md` under Blockers and ask the user.

Shortcut: `/next` runs steps 1–4, `/checkpoint` runs step 5, and `/review-section` runs the end-of-section critic.

## 1. Product Context

**Coaster Golf** (working name) is a free browser puzzle game. Each level has a start station, an end station and obstacles. The player types an equation such as `y = (x-3)^2/2`, it becomes a rollercoaster track, and a cart rides it with real physics. Any working equation beats the level, but **the score is the length of the equation in characters, and shorter is better**. Leaderboards rank the shortest solutions.

- **Audience:** puzzle and math-curious players, teens and up; math classrooms later.
- **Version 1 modes:** a **Daily Level** (the same level for everyone each day, with a shareable result) and a **Level Set** (a fixed campaign played at your own pace).
- **Out of scope for v1:** ranked battles or any real-time multiplayer, user accounts, payments.
- **Money (after launch, once there's traffic):** an optional supporter tier, then ads, then possibly a classroom version.
- **Anti-goals:** must not feel like a reskin of Geometry Dash or Desmos Marbleslides ("no random slop"). Must not collect personal data. Must not turn into a setup-and-security grind.

## 2. Tech Stack (decided, don't change without asking)

- **Frontend:** TypeScript + Vite, rendering on HTML Canvas. No UI framework unless a section says so.
- **Equation engine:** a custom safe parser with a whitelist. **Never** use `eval`, `new Function`, or a library's full evaluator on user input.
- **Simulation:** pure TypeScript with no DOM access, deterministic, fixed timestep. The **same code** runs in the browser and on the server.
- **Backend:** Cloudflare Pages (static site) + Cloudflare Workers (API) + D1 (SQLite) for leaderboards.
- **Tests:** Vitest for unit tests, plus Playwright for a few end-to-end smoke tests.
- **Storage on the player's device:** `localStorage` for progress and best scores, with every access wrapped in try/catch.

## 3. Engineering Principles

- **Section as Source of Truth**: `section.md` defines what gets built and in what order. Code that isn't asked for there doesn't get written.
- **Core before Pretty**: parser → simulation → levels → UI. The core is pure logic and fully testable without a browser.
- **Determinism is a feature**: the same equation on the same level must always give the same result, in every browser and on the server. Leaderboard trust depends on it.
- **Tests verify Behavior**: test what the player experiences (this equation beats this level, with this score), not internal details.
- **Small Verifiable Steps**: every task ends with something that can be run or tested. Every section ends with a checkpoint review.
- **Keep it boring**: pick the simplest thing that works. No new services, frameworks or dependencies without a reason written in `progress.md`.

## 4. AI Execution Principles

- **Document-as-Protocol**: progress lives in `progress.md` and `section.md`, not in chat history.
- **Critic Separation**: at the end of each section, dispatch a separate reviewer subagent to check the section's "Done when" list against the code and tests. Fix what it finds before moving on.
- **Context Isolation**: load only the current section and the files it touches.
- **Subagents default to Sonnet**; use Haiku for bulk, mechanical work.
- **Chat stays short**: say what was done, what was verified, and link the files.

## 5. Hard Limits (Inviolable)

- 🚫 Never commit code with failing tests.
- 🚫 Never evaluate user-typed equations with `eval`, `Function`, or any code-execution path.
- 🚫 Never trust a score sent by the browser. The server re-runs the simulation before saving to a leaderboard.
- 🚫 Never collect personal data. Players get a nickname only: no email, no accounts, no tracking cookies.
- 🚫 Never build ranked battles or multiplayer in v1.
- 🚫 Never mix feature changes and refactoring in the same commit.

## 6. Quality Gates

- Unit test coverage ≥ 80% for `src/core/` (parser, scoring, simulation, level validation).
- Every level in the Level Set ships with a stored reference solution that a test proves beats it.
- `npm test` and `npm run build` pass before every commit.
- The game is playable at phone width (375px) without horizontal scrolling.

## 7. Project Layout (target)

```
src/core/        pure logic: parser, scoring, sim, level types (no DOM)
src/game/        canvas rendering, input, screens
src/levels/      level JSON files + reference solutions
worker/          Cloudflare Worker API (imports src/core for verification)
tests/           cross-feature + e2e tests
docs/launch/     deploy steps, privacy page, launch plan
progress.md      session-to-session state (read first)
section.md       the build plan, split into sections (read second)
```

## 8. Feature Harnesses, Commands & Agents

Each feature folder has its own `CLAUDE.md` with that feature's contract, rules, required tests and gotchas.

| Harness | Feature | Sections |
|---|---|---|
| `src/core/CLAUDE.md` | shared contract (types, `judge()`), core rules | 2–4, 7 |
| `src/core/equation/CLAUDE.md` | grammar, parser, scoring | 2 |
| `src/core/sim/CLAUDE.md` | physics model, fail reasons | 3 |
| `src/core/level/CLAUDE.md` | level format, validator, `check-levels` | 4 |
| `src/levels/CLAUDE.md` | level design, difficulty curve, par | 4, 7 |
| `src/game/CLAUDE.md` | game architecture, data flow, art direction | 5–7 |
| `src/game/render/CLAUDE.md` | canvas drawing, ride playback | 5 |
| `src/game/ui/CLAUDE.md` | screens, input, result messages | 5–7 |
| `src/game/storage/CLAUDE.md` | on-device saves | 6–8 |
| `src/core/daily/CLAUDE.md` | daily schedule, streaks, share text | 7 |
| `worker/CLAUDE.md` | leaderboard API, trust rule | 8 |
| `tests/CLAUDE.md` | test layout and e2e smoke tests | all |
| `docs/launch/CLAUDE.md` | deploy, privacy, go/no-go | 9 |

**Commands** (`.claude/commands/`): `/next` starts a session, `/checkpoint` finishes a task, and `/review-section` runs the critic.

**Agents** (`.claude/agents/`): `section-reviewer` is the end-of-section critic (report only), and `level-golfer` finds the shortest solutions to set par and spot exploits (report only).

When a harness turns out to be wrong (the code taught you something), fix the harness in the same commit and log it in `progress.md`. Harnesses are living documents, not wishes.
