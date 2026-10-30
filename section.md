# Coaster Golf: Build Sections

Work through the sections in order. Each one has a goal, tasks, and a "Done when" checklist. A section is finished only when everything under "Done when" is true **and** a reviewer subagent has checked it (see CLAUDE.md §4).

---

## Global Rules (apply to every section)

- Read `progress.md` first; it says which section and task is current.
- Read every harness on the section's **Harness:** line before writing code. The harness has the detailed rules; this file only has the task list.
- One task at a time. Tick it here (`- [x]`) when done, then update `progress.md`.
- Keep `src/core/` free of DOM and browser APIs so the server can reuse it.
- Commit at the end of each finished task with a clear message. Tests and build must pass first.
- If a design question comes up that isn't answered here, write it in `progress.md` under Blockers and ask the user.

---

## Section 1: Project Setup

**Harness:** root `CLAUDE.md`, `tests/CLAUDE.md`

**Goal:** an empty but working project that builds, tests and runs.

- [x] `git init`, `.gitignore` (node_modules, dist, .wrangler, coverage)
- [x] Vite + TypeScript (strict mode) project with the folder layout from CLAUDE.md §7
- [x] Vitest set up with coverage; one placeholder test passes
- [x] ESLint + Prettier with a `npm run lint` script
- [x] Scripts: `dev`, `build`, `test`, `test:coverage`, `test:e2e`, `lint`, `check-levels` (a stub until Section 4); add `tsx` as a dev dependency
- [x] Scaffold **around** the existing files: keep every `CLAUDE.md`, `progress.md`, `section.md` and `.claude/` (don't run `npm create vite` with overwrite)
- [x] A blank canvas page that says "Coaster Golf" when you run `npm run dev`

**Done when:** `npm run build`, `npm test` and `npm run lint` all pass on a fresh clone.

---

## Section 2: Equation Engine (`src/core/equation/`)

**Harness:** `src/core/CLAUDE.md`, `src/core/equation/CLAUDE.md`, `tests/CLAUDE.md`

**Goal:** safely turn a typed equation into a function `f(x)`, and score its length.

- [x] Tokenizer + parser (recursive descent) that builds an expression tree. No `eval`.
- [x] Allowed: numbers (incl. decimals), `x`, `+ - * / ^`, parentheses, unary minus, implicit multiplication (`2x`, `3(x+1)`), constants `pi` and `e`, and functions `sin cos tan abs sqrt log ln exp min max floor`
- [x] Input may start with `y=` or not; both mean the same thing
- [x] LaTeX input subset (`\frac`, `\sqrt`, `^{}`, `\sin`…, `\left( \right)`, `\cdot`, `\pi`), mixed with plain math
- [x] `toLatex(expr)` for the pretty display, with round-trip tests
- [x] Clear error messages for bad input ("unknown word 'sinx' at position 3", "missing ')'")
- [x] Hard limits: max 200 characters, max nesting depth, so huge inputs can't freeze the game
- [x] Evaluator: tree + x → number (returns `NaN` for undefined points like `sqrt(-1)` or division by zero)
- [x] **Scoring rule** (one function, used everywhere): strip all whitespace, drop a leading `y=`, then count the remaining characters. `pi` counts as 2, `sin` as 3, and so on.
- [x] Tests: valid inputs, invalid inputs, implicit multiplication, operator precedence (`-x^2` = `-(x^2)`), scoring examples

**Done when:** 50+ parser/evaluator tests pass, coverage ≥ 80%, and a fuzz test with random strings never throws an uncaught error or hangs.

---

## Section 3: Track & Physics Simulation (`src/core/sim/`)

**Harness:** `src/core/CLAUDE.md`, `src/core/sim/CLAUDE.md`, `tests/CLAUDE.md`

**Goal:** given a level and an equation, decide deterministically whether the cart makes it, and why not if it doesn't.

- [x] Sample `f(x)` across the level's x-range at a fixed step to build the track polyline
- [x] Cart physics along the track: gravity along the slope, small friction, fixed timestep (e.g. 1/240 s), no randomness
- [x] **Fail conditions**, each with a reason code:
  - `FLEW_OFF`: the curve bends downward too sharply for the cart's speed (normal force < 0)
  - `STALLED`: speed reaches 0 before the end station (cart would roll back)
  - `HIT_OBSTACLE`: the track or cart touches an obstacle shape
  - `OUT_OF_BOUNDS`: the track leaves the level's vertical limits
  - `BROKEN_TRACK`: `NaN`/infinite values or a jump discontinuity in the range
  - `MISSED_START` / `MISSED_END`: the track doesn't pass through the station zones
  - `TIMEOUT`: the run exceeds the maximum sim time
- [x] Success = the cart reaches the end station zone
- [x] Output: result + reason + a recorded path (positions over time) for the renderer to replay
- [x] Tests: simple known-good and known-bad tracks for every fail reason, plus a determinism test (same input run 100 times → identical output)

**Done when:** every fail reason has a test, determinism test passes, and a full run takes under 50 ms on a normal laptop.

---

## Section 4: Levels & the Level Set (`src/core/level/`, `src/levels/`)

**Harness:** `src/core/level/CLAUDE.md`, `src/levels/CLAUDE.md`, `tests/CLAUDE.md`. Use the `level-golfer` agent to set par.

**Goal:** a level file format, a validator, and the first real campaign.

- [x] Level JSON format: id, name, x-range, y-limits, start station (position + starting speed), end station zone, obstacles (rectangles and circles to start), par score (character count to aim for)
- [x] Validator: rejects malformed levels; checks that the stored **reference solution** beats the level
- [x] A script `npm run check-levels` that validates every level and prints each one's reference score
- [x] **15 levels** with a smooth difficulty curve:
  - 1–3: straight lines and simple slopes (teaches the controls)
  - 4–7: parabolas, going over or under one obstacle
  - 8–11: sine waves, absolute value, multiple obstacles
  - 12–15: tight gaps where clever short equations really pay off
- [x] Each level has a "par" that's beatable but not obvious

**Done when:** `npm run check-levels` passes for all 15, and a test proves every reference solution wins.

---

## Section 5: Play Screen (`src/game/`)

**Harness:** `src/game/CLAUDE.md`, `src/game/render/CLAUDE.md`, `src/game/ui/CLAUDE.md`, `tests/CLAUDE.md`

**Goal:** a playable level in the browser.

- [x] Canvas renderer: grid and axes, stations, obstacles, the track drawn from the equation
- [x] Equation input box with **live preview**: the track redraws as you type; errors show inline without crashing
- [x] Pretty math preview under the box via KaTeX (`sqrt` → √, `^` → exponent, `/` → fraction)
- [x] Pasting and drag-drop blocked in the equation box, with a friendly note
- [x] "Ride" button: replays the sim path as an animated cart (the visual uses the recorded path; it never re-simulates differently)
- [x] Result panel: success with the character count vs par, or the fail reason in plain words ("Too steep: the cart flew off at x = 4.2")
- [x] Retry keeps the equation; a "show where it failed" marker on the track
- [x] A new minimal, professional look (not neon Geometry Dash, not Desmos): a strict 60-30-10 colour split (60% base, 30% secondary, 10% one accent). Show the user 2–3 minimal directions first and record the pick in `progress.md` under Decisions; all values stay in `theme.ts` and the CSS tokens. The user picked all of them: a low-key theme picker with Graphite (default), Paper, Midnight and the original Blueprint, remembered on the device
- [x] Zoom: pinch (touch) and scroll wheel/trackpad zoom toward the finger or cursor, with drag to pan; during a ride the camera zooms in and follows the cart, then eases back
- [x] Works with touch (including pinch zoom) and at 375px width; the canvas scales to the screen

**Done when:** level 1 can be played start to finish on a phone-sized screen and a desktop, and a Playwright smoke test types a winning equation and sees the success panel.

---

## Section 6: Level Select & Local Progress

**Harness:** `src/game/ui/CLAUDE.md`, `src/game/storage/CLAUDE.md`

**Goal:** the Level Set feels like a campaign.

- [x] Level select screen: all 15 levels, showing locked/unlocked, best score, and a star if at or under par
- [x] Beating a level unlocks the next
- [x] Best score and best equation per level saved in `localStorage` (wrapped in try/catch; the game still works if storage is blocked)
- [x] A short "How to play" screen shown on the first visit

**Done when:** progress survives a page reload, and the game still works in a private window with storage blocked.

---

## Section 7: Daily Level

**Harness:** `src/core/daily/CLAUDE.md`, `src/levels/CLAUDE.md`, `src/game/ui/CLAUDE.md`, `src/game/storage/CLAUDE.md`

**Goal:** one shared level per day that brings people back.

- [x] A pool of daily levels (start with 30, kept separate from the Level Set), each validated by `check-levels`
- [x] Date → level picked deterministically, rolling over at 00:00 UTC; everyone gets the same level
- [x] Daily screen: today's level, a countdown to the next one, your best today, and your streak (stored locally)
- [x] **Share button:** copies the share text defined in `src/core/daily/CLAUDE.md`, **never** revealing the equation
- [ ] Tests: date → level mapping, streak counting across days and a missed day

**Done when:** the daily level is the same on two different devices, sharing works on mobile and desktop, and streaks count correctly.

---

## Section 8: Leaderboards (Backend, `worker/`)

**Harness:** `worker/CLAUDE.md`, `src/game/storage/CLAUDE.md`, `src/game/ui/CLAUDE.md`

**Goal:** global "shortest equation" boards that can't be faked by sending a fake score.

- [ ] Cloudflare Worker + D1 project with Wrangler; local dev works
- [ ] Table: level id (or daily date), nickname, equation, score, created time
- [ ] `POST /submit`: takes level + equation + nickname. **The Worker re-parses and re-simulates using `src/core`**, computes the score itself, and saves it only if the run succeeds
- [ ] `GET /leaderboard?level=…`: top 50 by score, with ties broken by earliest submission
- [ ] Nickname rules: 3–16 characters, letters/numbers/underscore, basic profanity filter; no other personal data
- [ ] Rate limiting per IP (e.g. 30 submissions per minute); reject over-long equations early
- [ ] Hide equations on the daily board until that day ends (so people can't copy the winner); show them after
- [ ] Frontend: leaderboard panel on the result screen and the daily screen; a one-time nickname prompt saved locally
- [ ] Tests: a valid submission is saved; a failing equation is rejected; a fake score field is ignored; rate limit works

**Done when:** all API tests pass, and the browser can submit and see itself on the board running against local Wrangler.

---

## Section 9: Polish & Launch

**Harness:** `docs/launch/CLAUDE.md`, `src/game/render/CLAUDE.md`

**Goal:** something you're proud to share.

- [ ] Sound effects (cart rolling, success, fail) with a mute toggle
- [ ] Small juice: cart wobble, a confetti burst at par or better
- [ ] Landing/about section and a simple privacy page ("we store your nickname and equations, nothing else")
- [ ] Privacy-friendly analytics with no cookies (Cloudflare Web Analytics)
- [ ] Deploy: Cloudflare Pages + Worker + D1 in production; pick and connect a domain (ask the user)
- [ ] Final check on a real phone and a desktop browser
- [ ] A short launch checklist in `progress.md`: where to post (r/math, r/WebGames, Discord servers, friends)

**Done when:** the game is live at a public URL and a friend can play the daily level and get on the leaderboard.

---

## Section 10: After Launch (only once real people are playing)

**Harness:** none yet. Write one with the user before starting.

Don't start this section until `progress.md` shows the game has real players. Discuss with the user first.

- [ ] Watch analytics: daily players, levels where people quit, share-button clicks
- [ ] Add daily levels to keep the pool ahead of the calendar
- [ ] Supporter tier: one-time or monthly payment through a hosted checkout (e.g. Lemon Squeezy or Stripe Checkout). No accounts; unlock with a license key.
- [ ] Ads only if traffic justifies them
- [ ] **Version 2 planning:** ranked battles. Design them separately before writing any code.
