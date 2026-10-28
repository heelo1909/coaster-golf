# Coaster Golf: Progress

> Read this first every session (see CLAUDE.md §0). Update it before the session ends.

## Current State

- **Current section:** Section 2: Equation Engine
- **Next task:** `toLatex(expr)` for the pretty display, with round-trip tests. Rules are in `src/core/equation/CLAUDE.md` § Pretty Display.
- **Overall:** Section 1 done and reviewed. Section 2 under way: the parser accepts plain math and the LaTeX subset; no evaluator or `toLatex` yet.

## Section Status

| # | Section | Status |
|---|---------|--------|
| 1 | Project Setup | ✅ Done |
| 2 | Equation Engine | 🟨 In progress |
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
- 2026-10-28: The project's own agents (`section-reviewer`, `level-golfer`) and commands only load when Claude Code is opened **in `D:\Projects\CoasterGolf`**. Open sessions there.
- 2026-10-28: Extra scripts kept even though Section 1 didn't list them (`preview`, `test:watch`, `format`); harmless conveniences, as the reviewer noted.
- 2026-10-28: LaTeX details (Claude's call, recorded in `src/core/equation/CLAUDE.md` Gotchas): commands match longest-prefix because spaces are stripped, so `\sin x` is `\sin`·x (and needs parentheses) and `\pix` is π·x. Any function takes `()` or `{}`, plain names too (`sin{x}`). `\left(`/`\right)` are plain `(`/`)`, so mismatched pairs like `\left(x)` are accepted. `\frac{a}{b}` is one atom, so `\frac{x}{2}^2` = (x/2)². `\sqrt[n]` isn't supported.
- 2026-10-28: Parser details (Claude's call, recorded in `src/core/equation/CLAUDE.md` Gotchas): spaces are stripped before tokenizing, so `s in(x)` = `sin(x)`. `2|x|` and `|x||x|` work as implicit multiplication. `1e3` means 1·e·3. `3.` and `1.2.3` are errors. `|a|` is stored as `abs(a)` in the tree.

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
- 2026-10-28: Section 1 review (independent reviewer): no must-fix items. Fixed the should-fix items: `.gitkeep` files for `tests/e2e` and `tests/fixtures`, `test:e2e` passes with no tests, and `globalThis`/`self` are blocked in `src/core` (verified with a probe). Deferred: Playwright browser install (Section 5) and type-checking `worker/` (Section 8). Section 1 ✅.
- 2026-10-28: Section 2 task 1 done: `tokenizer.ts`, `parser.ts`, `errors.ts` and `index.ts` in `src/core/equation/`, exported from `src/core/index.ts`. The parser covers the full plain grammar, with positioned friendly errors and min/max arity checks. 94 parser tests. Verified lint ✅, `npm test` (95) ✅, build ✅, coverage 98.9% ✅. Also removed a stray garbled line from section.md.
- 2026-10-28: Section 2 tasks 2 and 3 ticked (allowed tokens; optional leading `y=`). No code change needed: the existing parser tests already cover every allowed number form, operator, constant and function, the 21-case precedence table, implicit multiplication, `y=` equivalence and misplaced-`y` errors. Verified lint ✅, `npm test` (95) ✅, build ✅.
- 2026-10-28: Section 2 task 4 done: the LaTeX subset (`\frac`, `\sqrt`, `{}` grouping, `\sin`…`\exp`, `\left`/`\right`, `\cdot`, `\times`, `\pi`) in the tokenizer and parser, with friendly errors (`unknown command "\alpha"`, `missing "}"`, `"\frac" needs two parts…`). 45 new tests. Also removed the stray `ight)…` line that a carriage return in `\right` had left in Next task. Verified lint ✅, `npm test` (140) ✅, build ✅, coverage 99.1% ✅.
