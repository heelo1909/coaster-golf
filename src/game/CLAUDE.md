# src/game: The Browser Game (Sections 5–7)

Everything the player sees and touches. It turns `src/core` results into pixels and handles input. **It never judges anything itself.** It calls `judge()` from `src/core` and shows what comes back.

## Rules

- `src/game` may import from `src/core`. **`src/core` must never import from `src/game`.**
- No game rules in here: no scoring, no physics, no level checks. If you need one, add it to `src/core` (with tests) and call it.
- No UI framework. Use plain TypeScript, DOM elements for inputs, buttons and panels, and one `<canvas>` for the track.
- Mobile first. Design at 375px wide, then check desktop. Touch targets are at least 44px.
- Every `localStorage` access goes through `storage/`. Never call it directly from UI code.

## Folder Map

| Folder | What | Harness |
|---|---|---|
| `render/` | canvas drawing: grid, track, stations, obstacles, cart animation | `render/CLAUDE.md` |
| `ui/` | screens, equation input, result panel, level select, daily screen | `ui/CLAUDE.md` |
| `storage/` | saved progress, best scores, streak, nickname | `storage/CLAUDE.md` |
| `main.ts` | boots the app and starts the screen router | — |

## Data Flow for One Ride

```
player types ─► ui/EquationInput ─(debounced 150ms)─► core.judge(level, text)
                                                         │
                     ┌───────────── parse error ─────────┤
                     ▼                                    ▼ ok
           show inline error                 render.drawTrack(preview)
                                                         │
player taps Ride ─► core.judge() again ─► render.playRide(result.path)
                                                         │
                                                         ▼
                                 ui/ResultPanel (success+score or fail reason)
                                                         │
                                                         ▼
                                 storage.saveBest(levelId, score, equation)
```

## Art Direction

The look must be **its own**: not Geometry Dash neon and not Desmos clean-white. Before Section 5's renderer work starts, propose 2–3 directions to the user (for example a hand-drawn blueprint, a retro theme-park poster, or a chalkboard), and record the pick in `progress.md` → Decisions. Every visual choice after that follows it.
