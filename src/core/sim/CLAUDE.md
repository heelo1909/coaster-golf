# src/core/sim: Track & Cart Physics (Section 3)

Decides whether a cart riding the player's curve makes it from the start station to the end station. **This must feel fair.** A player who sees the cart fly off has to look at the curve and think "yeah, that hill was too sharp."

## Files (target)

```
constants.ts   every tuning number in one place
track.ts       sample f(x) → track points with slope + curvature; detect broken track
physics.ts     one fixed-timestep step of the cart
collide.ts     track/cart vs obstacles
simulate.ts    simulate(level, f) → SimResult
index.ts
```

## Physics Model

The cart is a **bead riding on top of** the curve `y = f(x)`, always moving toward +x. World units: 1 grid square = 1 unit; y is up.

- Slope angle: `θ = atan(f'(x))`
- Signed curvature: `κ = f''(x) / (1 + f'(x)²)^1.5`
- Tangential acceleration: `a = -g·sin θ - drag·v`
- **Normal force per unit mass:** `N = g·cos θ + v²·κ`
  - `N < 0` → the cart leaves the track → `FLEW_OFF`. This is what happens on a sharp hilltop at high speed.
- Integrate along arc length: `v += a·dt`, `s += v·dt`, then move x forward by `ds·cos θ`. Use **semi-implicit Euler** with a fixed `dt = 1/240`.
- Derivatives: central differences on `f` with `h = 1e-4`. Don't use symbolic differentiation.

Starting values for `constants.ts`, tuned later by playtesting (record any change in `progress.md`):

```
G = 9.81
DRAG = 0.02
DT = 1/240
MAX_TIME = 30          // seconds → TIMEOUT
STATION_TOLERANCE = 0.25
MAX_SLOPE = 20         // |f'| above this counts as a vertical wall → BROKEN_TRACK
JUMP_THRESHOLD = 0.5   // |Δy| between adjacent samples that counts as a gap
CART_RADIUS = 0.2
SAMPLE_STEP = 0.01
```

## Order of Checks

1. **Sample the track** from `start.x` to `end.x` at `SAMPLE_STEP`. Any `NaN`/`Infinity`, any `|f'| > MAX_SLOPE`, or any jump bigger than `JUMP_THRESHOLD` → `BROKEN_TRACK`, with `failAt` at the first bad point.
2. `|f(start.x) - start.y| > STATION_TOLERANCE` → `MISSED_START`.
3. `|f(end.x) - end.y| > STATION_TOLERANCE` → `MISSED_END`.
4. Track outside `[yMin, yMax]` anywhere in the range → `OUT_OF_BOUNDS`.
5. Track or cart circle touches any obstacle → `HIT_OBSTACLE`. Checking the sampled track is enough for v1, since the cart rides on the track.
6. **Run the cart.** Record `path` every 4 steps (60 fps for the renderer). Stop on `N < 0` (`FLEW_OFF`), `v ≤ 0` before the end (`STALLED`), reaching `end.x` (success), or `t > MAX_TIME` (`TIMEOUT`).

Checks 1–5 decide the result without the ride: the reason and the `failAt` point never depend on it. Checks 1–3 return an empty `path` (the player gets the failure marker only). For checks 4–5 (`OUT_OF_BOUNDS`, `HIT_OBSTACLE`) the cart is then ridden up to `failAt.x` to record a `path` for the replay, and `failAt.t` / `duration` are when it gets there. If that ride would fly off, stall or time out first, the replay would contradict the reason, so the `path` stays empty and `failAt.t` is 0 (user's choice, 2026-10-29).

## Determinism & the Server

- Same `Level` + same `f` → bit-identical `SimResult` within one JS engine. Test this by running 100 times.
- `Math.sin` and friends can differ in the last bits **between** browsers (V8 vs Firefox vs Safari). Don't fight that. **The server's result is the source of truth.** A run that is exactly on a knife edge might pass in one browser and fail on the server. That's rare and acceptable, so don't add rounding hacks.

## Performance

A full run must finish in **under 50 ms**, so live preview stays smooth. Avoid allocating objects inside the step loop. Precompute the track samples once.

## Tests Required

- One test level per fail reason, with an equation that triggers exactly that reason
- Success cases: a gentle downhill line; a valley the cart rolls through
- `FLEW_OFF` boundary: the same hill shape at two speeds, one flies off and one doesn't
- Determinism: 100 identical runs → deep-equal results
- Performance: a benchmark test that fails above 50 ms
- `path` is time-ordered, starts at the start station, and ends where the run ended

## Gotchas

- The cart only moves forward. If physics would push it backward, that's `STALLED`, not a reversal.
- The start station gives the initial speed (`level.start.speed`). With 0 speed on flat ground the cart never moves, so it stalls immediately. Levels must account for this.
- Don't simulate past `end.x`. Reaching it is the win.
