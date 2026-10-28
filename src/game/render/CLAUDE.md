# src/game/render: Canvas Drawing (Section 5)

Draws the level and plays back a ride. **Rendering only shows; it never decides.** The cart's motion comes from `SimResult.path`, never from a second physics loop.

## Files (target)

```
camera.ts      world ↔ screen transform, fit-to-bounds, devicePixelRatio
scene.ts       drawGrid, drawStations, drawObstacles, drawTrack
ride.ts        playRide(path) → animation, returns a Promise when finished
theme.ts       colors, line widths, fonts (from the chosen art direction)
index.ts
```

## Rules

- **World coordinates in, pixels out.** Only `camera.ts` knows about pixels. Everything else works in world units (y up).
- Fit the level's `bounds` to the canvas with equal x/y scale, so circles stay round, plus some padding. Recompute on resize.
- Handle `devicePixelRatio` so lines stay crisp on phones.
- **Track drawing:** sample the curve at the visible pixel resolution. Draw only the part between the stations solid, and show the rest faintly so players see where their curve goes. Break the line at `NaN` or big jumps; never draw a vertical line across a gap.
- **Ride playback:** step through `path` by time with `requestAnimationFrame`. Interpolate between points. Rotate the cart by `angle`. On failure, finish at `failAt` and play the fail effect: a spark for `HIT_OBSTACLE`, a tumbling cart for `FLEW_OFF`, a slow roll-back wobble for `STALLED`.
- A skip button (or tap) jumps straight to the end of the ride.
- All colors and sizes come from `theme.ts`, so swapping the art direction means editing one file.

## Performance

- Redraw the static layer (grid, stations, obstacles) only on resize or level change. Cache it to an offscreen canvas.
- During a ride, redraw only the track and the cart.
- Live preview must stay smooth while typing: about 60 fps on a mid-range phone.

## Testing

Canvas output is hard to unit-test, so:
- Unit-test `camera.ts` math: world → screen → world round-trips, and fitting at different aspect ratios.
- Unit-test path interpolation in `ride.ts` as pure functions.
- Visual checks happen in the Playwright smoke test (`tests/e2e/`) via screenshots at 375px and 1280px wide.
