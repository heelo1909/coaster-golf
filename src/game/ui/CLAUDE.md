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

- `parseHash`/`hashOf` are pure and unit-tested; `startRouter(onRoute)` is the only part that touches `window`. `router.show` adds a history entry, `router.replace` swaps it (for redirects).
- So far the routes are `#/levels` and `#/play/<id>`; a screen joins the `Route` type in the section that builds it. Anything unknown (no hash, a typo) shows level select, which is where the site opens.
- `main.ts` owns the redirect rule: an unknown or locked level id replaces the hash with `#/levels`.

## Daily

- `#/daily` plays today's level: `daily[dailyLevelIndex(dailyNumber(now), daily.length)]`, worked out in `main.ts` on every route. It reuses `PlayScreen` with an info bar on top (`Daily #12 · Next in 05:12:09 · 🔥 3-day streak`, `daily-bar`) and the canvas title `#12 Name` (the renderer's `number` option). No Next level on a win.
- The countdown ticks every second (`formatCountdown`, rounded up). When midnight UTC passes mid-game, it becomes a "New daily is out →" button rather than swapping the level under the player.
- The streak shown is `liveStreak` (alive if solved today or yesterday, else 0, hidden). Wins go through `storage/daily.ts` `saveDailyWin`, which moves the streak once per day.
- Level select opens with a "Today's daily · #12" card (`daily-card`) above the grid: name, par or best with ★, and the streak. `mountLevelSelect` takes an options object.

## How To

- On a first visit (`profile.seenHowTo` not set) every route is replaced by `#/howto` first. Its one button ("Let's go") goes to level 1, or to the level a link pointed at, and saves `seenHowTo`. That level still goes through the normal unlock check, so a link to a locked level ends on level select. With storage blocked it shows once per visit.
- Level select has a "How to play" link to reopen it; then the button returns to level select.
- Three numbered steps (type, ride, shorter wins) under a small SVG of a track drawn in the colour tokens. Backticks in the step strings in `messages.ts` mark equations, shown in monospace.

## Level Select

- One tile per campaign level (`tilesOf` is pure): the number, the name, then `Par N` (open), `Best N` with a ★ at or under par (beaten) or `Locked`. Locked tiles are disabled buttons. Each tile's `aria-label` says it all in words, star included.
- A level is unlocked when the level before it has a saved best (`isUnlocked`); level 1 always is. Unlocks aren't stored separately, so they can't disagree with the bests.
- With storage blocked, level select shows "Progress won't be saved in this browser." under its title, once per visit.
- The play screen shows the saved best under the box (`best-line`: `Your best: x/3 · 3 chars`) and updates it after a shorter win. The box itself starts empty.
- The play screen has a back button top-left (`back-to-levels`), mirroring the theme picker; the minimal canvas title starts right of it.

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
