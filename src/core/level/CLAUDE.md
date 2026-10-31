# src/core/level: Level Format & Validator (Section 4)

Defines what a level is and checks that level files are valid and beatable. Level **content** lives in `src/levels/` (see its own CLAUDE.md). This folder is only the format and the checks.

## Files (target)

```
types.ts       Level, Obstacle, Station
validate.ts    validateLevel(raw) → ok | errors
index.ts
```

## Level Format

```ts
interface Level {
  id: string;              // "c01".."c15" for the campaign, "d001".. for daily
  name: string;            // short, fun: "First Drop"
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number }; // the view, not a wall: the track may leave it
  start: { x: number; y: number; speed: number };  // speed in units/s, ≥ 0
  end: { x: number; y: number };                   // win when the cart reaches end.x
  obstacles: Obstacle[];
  par: number;             // character count to aim for
  reference: string;       // a known winning equation, never shown to players
  hint?: string;           // optional nudge shown after 3 failed rides
}

type Obstacle =
  | { kind: 'rect'; x: number; y: number; w: number; h: number }  // x,y = bottom-left
  | { kind: 'circle'; x: number; y: number; r: number };
```

Levels are stored as `.json` files and loaded through `validateLevel()`. Never cast raw JSON straight to `Level`.

## Validation Rules

- Every field present with the right type; no unknown fields (catches typos like `obstacels`)
- `xMin < start.x < end.x ≤ xMax`, and `yMin < yMax`
- Stations sit inside the bounds and **don't** overlap any obstacle
- `par ≥ 1`, and `par ≤ scoreEquation(reference)`. Par can be shorter than the reference if a shorter known answer exists, but write that answer in a test.
- `judge(level, reference)` succeeds. **A level whose reference fails is invalid.**
- Also (added with the validator): numbers must be finite, strings non-empty, `start.speed ≥ 0`, every obstacle has a size above 0, `par` is a whole number, and "don't overlap" means no obstacle within `CART_RADIUS` of a station.
- Errors come in three passes, each only once the one before is clean: the shape (all shape errors at once), then layout and par, then riding the reference. So a broken layout never reaches the sim.
- Unique `id` across all level files (checked by the `check-levels` script, not by `validateLevel`)

## The `check-levels` Script

`npm run check-levels` loads every file in `src/levels/campaign/` and `src/levels/daily/` and validates each one. It prints a table:

```
id    name           ref  par  result
c01   First Drop      3    3   ✅
c02   Bunny Hill      7    5   ✅
d001  …
```

It exits non-zero if anything fails. CI and the section reviewer both run it.

How it's built: the logic is in `scripts/level-check.ts` (`loadLevelFiles`, `checkLevels`, `formatReport`, tested in `tests/check-levels.test.ts` against `tests/fixtures/check-levels/`), and `scripts/check-levels.ts` is the thin entry point. Each failing file's errors are listed under the table. Files that aren't `.json` are skipped, a missing folder counts as empty, and a file that isn't valid JSON fails without stopping the others. Every file sharing an id gets the duplicate-id error. With no level files at all it prints `no level files found.` and passes; the 15-level requirement is checked by `tests/levels.test.ts`, not here.

## Tests Required

- A valid level passes; each rule above has a test where that rule alone fails
- A level whose reference equation fails is rejected, with the sim's fail reason in the error
- Unknown field → error naming the field
