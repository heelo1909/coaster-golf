# tests: Test Conventions (all sections)

## Where Tests Go

- **Unit tests sit next to the code** as `*.test.ts` (for example `src/core/equation/parser.test.ts`).
- `tests/` holds tests that span features:
  - `tests/levels.test.ts`: every level's reference and any known shorter solutions win
  - `tests/judge.test.ts`: end-to-end `judge()` cases (parse → sim → score)
  - `tests/e2e/`: Playwright browser tests
  - `tests/fixtures/`: small test-only levels (`fixture-flyoff.json` and so on)
- Worker tests live in `worker/test/`.

## Conventions

- Test names describe player-visible behavior: `"a sharp hilltop at high speed makes the cart fly off"`, not `"test N < 0"`.
- No snapshots for logic; assert the actual values.
- Never weaken a test to make it pass. If a test is wrong, say why in the commit message.
- Fixture levels are tiny and built for one purpose. Don't reuse campaign levels as fixtures, because campaign tuning would break them.

## Commands

```
npm test                  all unit tests (Vitest)
npm run test:coverage     coverage report; src/core must stay ≥ 80%
npm run test:e2e          Playwright (starts the dev server itself)
npm run check-levels      level validation table
```

## E2E Smoke Tests (Playwright)

Keep these few and stable. Run each at **375×812** and **1280×800**:
1. Open the site → how-to shows on the first visit → dismiss → level 1
2. Type a winning equation → Ride → the win panel shows a score
3. Type a broken equation → the inline error shows, and the page doesn't crash
4. Reload → level 2 is unlocked (storage works)
5. With storage blocked → the game still plays
6. Daily screen → share button copies text that **doesn't** contain the equation
7. Pasting into the equation box does nothing and shows the "no pasting" note; typing `sqrt(x)` shows a rendered √ in the preview

Select elements with `data-testid`, never CSS classes.

Done so far: 4 and 5 in `tests/e2e/levels.spec.ts` (Section 6, with level select opening first, the best score and star on the tile, a locked-level link redirecting, and the best equation line; storage is blocked by making `window.localStorage` throw in an init script). Play-screen tests open `#/play/c01` directly. From `tests/e2e/play.spec.ts` (Section 5): 2, 3 and 7, plus Enter and Next level, no sideways scroll with a sharp canvas, and phone-only touch checks (quick keys, a real two-finger pinch through CDP touch events, tap to skip) and a desktop-only wheel zoom. Phone-only and desktop-only tests skip on the `isMobile` fixture. Chromium for Playwright is installed with `npx playwright install chromium`.
