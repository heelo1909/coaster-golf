# src/game/render: Canvas Drawing (Section 5)

Draws the level and plays back a ride. **Rendering only shows; it never decides.** The cart's motion comes from `SimResult.path`, never from a second physics loop.

## Files (target)

```
camera.ts      world ↔ screen transform, fit-to-bounds, devicePixelRatio, View (zoom/pan)
scene.ts       drawGrid, drawStations, drawObstacles, drawTrack, drawCart
ride.ts        pure playback maths: poseAt(path, t), failPose(path, reason, k), speedAt(path, t)
theme.ts       the four themes (palettes + style), sizes, setTheme, cssVars
index.ts       createRenderer: setTrack, playRide → Promise, skipRide, zoomAt, panBy, resetView
```

## Rules

- **World coordinates in, pixels out.** Only `camera.ts` knows about pixels. Everything else works in world units (y up).
- Fit the level's `bounds` to the canvas with equal x/y scale, so circles stay round, plus some padding. Recompute on resize.
- Handle `devicePixelRatio` so lines stay crisp on phones.
- **Track drawing:** sample the curve at the visible pixel resolution. Draw only the part between the stations solid, and show the rest faintly so players see where their curve goes. Break the line at `NaN` or big jumps; never draw a vertical line across a gap.
- **Ride playback:** step through `path` by time with `requestAnimationFrame`. Interpolate between points. Rotate the cart by `angle`. On failure, finish at `failAt` and play the fail effect: a spark for `HIT_OBSTACLE`, a tumbling cart for `FLEW_OFF`, a slow roll-back wobble for `STALLED`.
- A skip button (or tap) jumps straight to the end of the ride.
- **Zoom and pan:** the camera is a `View` (zoom relative to the fitted camera, plus the world point at the canvas centre), from 1× (the whole level) to 8×, with the centre kept inside the level. Zooming keeps the point under the finger or cursor in place. The view maths is pure in `camera.ts` and unit-tested.
- **Follow camera:** during a ride the view eases toward the cart at `FOLLOW_ZOOM` (2.5×, or the player's zoom if higher), then eases back to the player's own view over 600 ms. If the player zooms or pans mid-ride, the camera is theirs and stops following. No following with `prefers-reduced-motion`.
- `resize()` is cheap when nothing changed; the play screen calls it whenever the canvas may have changed size (mount, result panel open or close, a `ResizeObserver`). After a theme change, call `restyle()`.
- `playRide` lives on the renderer (it owns the canvas and the frame loop); `ride.ts` stays pure so it can be tested. A new track or level cancels a ride in progress, and the cart stays at its last pose until the track changes. A ride with an empty `path` (failed before the cart moved) draws no cart.
- The cart is drawn the size of the sim's collision circle (`CART_RADIUS`, sitting on the track along its upward normal), never smaller than `theme.cartMinRadius` px.
- `prefers-reduced-motion`: the ride plays at `REDUCED_MOTION_SPEED`× and the fail effect jumps to its last frame.
- All colors and sizes come from `theme.ts`. There are four themes the player can pick: Graphite (default), Paper and Midnight (`style: 'minimal'`: dot grid, tinted obstacles, solid accent cart, level name top-left) and Blueprint (`style: 'blueprint'`: line grid, hatching, outlined cart, title block). `theme` is a live binding swapped by `setTheme()`; after a change, call the renderer's `resize()` so the cached static layer is redrawn. The page's CSS colour tokens come from the same palette (`cssVars`), so a colour lives in exactly one place.
- The minimal themes follow a strict 60-30-10 split: 60% `paper`, 30% `panel` + `ink`, 10% `mark`. Keep the accent for the cart, the stations, Ride, par and the par star; don't spread it to frames or body text.

## Performance

- Redraw the static layer (grid, stations, obstacles) only on resize or level change. Cache it to an offscreen canvas.
- During a ride, redraw only the track and the cart, except while the follow camera moves: then the static layer is redrawn each frame too (it depends on the view).
- Live preview must stay smooth while typing: about 60 fps on a mid-range phone.

## Testing

Canvas output is hard to unit-test, so:
- Unit-test `camera.ts` math: world → screen → world round-trips, and fitting at different aspect ratios.
- Unit-test path interpolation in `ride.ts` as pure functions.
- Visual checks happen in the Playwright smoke test (`tests/e2e/`) via screenshots at 375px and 1280px wide.
