# Coaster Golf: Progress

> Read this first every session (see CLAUDE.md §0). Update it before the session ends.

## Current State

- **Current section:** Section 1: Project Setup (all tasks done and committed; awaiting review)
- **Next task:** Run `/review-section` for Section 1
- **Overall:** Project skeleton builds, tests and lints. No game logic yet.

## Section Status

| # | Section | Status |
|---|---------|--------|
| 1 | Project Setup | 🔍 In review |
| 2 | Equation Engine | ⬜ Not started |
| 3 | Track & Physics Simulation | ⬜ Not started |
| 4 | Levels & the Level Set | ⬜ Not started |
| 5 | Play Screen | ⬜ Not started |
| 6 | Level Select & Local Progress | ⬜ Not started |
| 7 | Daily Level | ⬜ Not started |
| 8 | Leaderboards (Backend) | ⬜ Not started |
| 9 | Polish & Launch | ⬜ Not started |
| 10 | After Launch | ⬜ Not started |

Status key: ⬜ Not started · 🟨 In progress · 🔍 In review · ✅ Done

## Decisions

- 2026-10-28: Game concept chosen. An equation becomes a rollercoaster track, and the score is the equation's character count (shorter wins).
- 2026-10-28: v1 = Daily Level + Level Set. Ranked battles deferred to v2 (after launch and some income).
- 2026-10-28: No accounts and no personal data; nickname only for leaderboards.
- 2026-10-28: Stack is TypeScript + Vite + Canvas, Cloudflare Pages/Workers/D1, Vitest. (Claude's default pick, open to change if the user objects.)
- 2026-10-28: "Coaster Golf" is a working name only.

- 2026-10-28: Equation grammar (in `src/core/equation/CLAUDE.md`): functions need parentheses; `|x|` allowed; implicit multiplication like `2x` and `pix`; no `1e3` notation. (Claude's default; these change what counts as a clever short answer, so the user can adjust.)
- 2026-10-28 (user): Typing `sqrt`, `^` and so on shows proper math notation; LaTeX input is accepted; pasting into the equation box is blocked.
- 2026-10-28: How those work (Claude's call): a plain text box plus a KaTeX-rendered preview underneath, not a rich math editor. The score counts the typed characters, so LaTeX is allowed but gives no advantage.
- 2026-10-28: The server's simulation result is the source of truth; rare cross-browser floating-point edge cases are accepted.

- 2026-10-28: Toolchain is Node 24, Vite 8, TypeScript 6 (strict, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`), Vitest 5 with v8 coverage (80% threshold on `src/core`), ESLint 10 with typescript-eslint and Prettier, and Playwright installed (browsers not yet; run `npx playwright install chromium` in Section 5).
- 2026-10-28: ESLint enforces the core rules. `src/core` can't use `Math.random`, `window`, `document`, `localStorage`, `fetch` or `navigator`, and `eval`/`new Function` are banned everywhere. Verified with a probe file.

## Blockers / Open Questions

- Final game name and domain (needed by Section 9).
- Art direction: propose 2–3 options to the user before Section 5's renderer work.
- Contact email for the privacy page (needed by Section 9).

## Log

- 2026-10-28: Project folder created. CLAUDE.md adapted from Waypoint; section.md and progress.md written.
- 2026-10-28: Feature folders created, each with its own harness (CLAUDE.md). Added the `/next`, `/checkpoint` and `/review-section` commands, plus the `section-reviewer` and `level-golfer` agents. section.md now lists the harnesses for each section.
- 2026-10-28: Harnesses updated for the user's new requirements: LaTeX input, a pretty KaTeX preview (`toLatex`), and paste blocking.
- 2026-10-28: Section 1 tasks done. Verified `npm run build` ✅, `npm test` (1 test) ✅, `npm run lint` (ESLint + Prettier) ✅, `npm run check-levels` (stub) ✅, coverage ✅. The blank canvas page says "Coaster Golf". 
- 2026-10-28: Git identity set for this repo only (`heelo1909` / heelo1909@gmail.com). First commit made.
