# src/game/ui: Screens & Controls (Sections 5–7)

Everything the player taps or types. Plain DOM + TypeScript, no framework.

## Files (target)

```
router.ts          tiny screen state machine: home | levels | play | daily | howto
EquationInput.ts   the input box, live preview, inline errors
ResultPanel.ts     win/fail panel after a ride
PlayScreen.ts      canvas + input + Ride button + result (campaign and daily share it)
LevelSelect.ts     15 level tiles: locked/unlocked, best score, par star
DailyScreen.ts     today's daily, countdown, best today, streak, share
HowTo.ts           first-visit explainer
ThemePicker.ts     low-key theme menu (top-right), applyTheme, savedTheme
CanvasGestures.ts  pinch, wheel, drag, tap and double-tap on the canvas (canvas has touch-action: none)
messages.ts        every player-facing string in one place
index.ts
```

## Router

Screens are a simple state machine with `show(screen, params)`. The URL hash mirrors it (`#/play/c03`, `#/daily`), so Back works and levels can be linked. Locked levels in the hash redirect to level select.

## Equation Input

- Placeholder: `y = ` followed by a hint like `x/2`.
- **Live preview:** on input, debounce 150 ms, call `parseEquation()`, and redraw the track (`previewOf` in `EquationInput.ts`). Nothing is judged and no ride plays while typing; Ride calls `judge()`. On a parse error, the last good track stays on the canvas, faded.
- **Errors** show under the box and underline the character at `error.position`. Never block typing.
- A **character counter** sits next to the box (`11 chars · par 14`) and updates live using `scoreEquation`. It turns gold at or under par, but only once the equation parses (so a half-typed `(x-` never looks like a winner).
- **Pretty preview:** directly under the box, render `toLatex(expr)` with **KaTeX** (the only UI dependency allowed; load it from npm and bundle it). Typing `sqrt(x)` shows √x, `^` shows a raised exponent, `/` shows a fraction. On a parse error, keep the last good preview faded.
- The box itself stays a **plain text input**, so the character count is always exactly what was typed. Don't swap it for a rich math editor without asking the user.
- **No pasting** (to stop copying answers):
  - Block `paste` and `drop` events, and `beforeinput` events whose `inputType` is `insertFromPaste`, `insertFromDrop` or `insertFromYank`.
  - Set `autocomplete="off"`, `autocorrect="off"`, `autocapitalize="off"` and `spellcheck="false"`.
  - When a paste is blocked, show a short note: "No pasting — type it out ✍️".
  - Quick keys still work, since they insert by script, not by paste.
  - This only stops casual copying. Real protection is the server re-running every run and daily equations staying hidden until the day ends (`worker/CLAUDE.md`).
- On mobile, show a small row of quick keys under the box: `x ^ ( ) | sin cos pi`. Phone keyboards hide these symbols.
- `Enter` = Ride.

## Result Panel

- **Win:** "Made it! 11 chars (par 14)", plus a star if at or under par, then Next level, Try shorter and Leaderboard (Section 8).
- **Fail:** plain words from `messages.ts`, never the reason code. For example:
  - `FLEW_OFF` → "Too fast over that hill — the cart flew off at x = 4.2"
  - `STALLED` → "Ran out of speed at x = 6.1 — it needs more downhill"
  - `HIT_OBSTACLE` → "Crashed into a rock at x = 3.0"
  - `MISSED_START` / `MISSED_END` → "Your track misses the start/end station"
  - `BROKEN_TRACK` → "The track has a gap or a wall at x = 2.0"
  - `OUT_OF_BOUNDS` → "The track goes off the map"
  - `TIMEOUT` → "The ride took too long"
- After 3 failed rides on a level, offer the level's `hint`, if it has one.

## Accessibility

- Every button has a text label. The fail and win messages are announced with `aria-live="polite"`.
- Respect `prefers-reduced-motion`: skip confetti and shorten ride animations.
- Color is never the only signal; the par star also has a label.

## Testing

- Unit-test `router.ts` hash parsing and the `messages.ts` mapping (every `FailReason` has a message).
- Playwright (`tests/e2e/`) covers the real flows; see `tests/CLAUDE.md`.
