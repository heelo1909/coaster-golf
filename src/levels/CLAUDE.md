# src/levels: Level Content (Sections 4 & 7)

The actual levels, written as JSON in the format from `src/core/level/CLAUDE.md`. This folder is **game design**: each level should teach one idea or reward one clever trick.

## Layout

```
campaign/c01.json … c15.json    the Level Set, played in order
daily/d001.json …               the daily pool (separate from the campaign)
index.ts                        imports and exports both lists in order
```

## Campaign Difficulty Curve

| Levels | Teaches | Example shortest idea |
|---|---|---|
| c01–c03 | Lines and slopes; how the controls work | `-x`, `2-x/3` |
| c04–c07 | Parabolas; going over or under one obstacle | `(x-3)^2/4` |
| c08–c11 | Sine waves, absolute value `|x|`, two or more obstacles | `sin(x)`, `|x-2|` |
| c12–c15 | Tight gaps where a clever short form beats the obvious one | (designer's choice) |

- **c01 must be beatable by nearly anything sensible.** Its job is to make the first ride a success.
- Each level introduces **at most one** new idea.
- Name every level something short and fun ("First Drop", "Camel Back").
- A level's `hint` points at the idea, never the answer: "Try a curve that dips then rises."

## Setting Par

1. Write the obvious solution, which becomes the `reference`.
2. Try to golf it shorter. Use the `level-golfer` agent for a second try.
3. `par` = the shortest you found, **plus 0–2 characters**, so par is beatable by a good player but leaves room to brag.
4. Any solution shorter than the reference gets a test in `tests/levels.test.ts` proving it wins.
5. How the campaign applies step 3: par = the shortest known solution, **+1** when that solution needs a golf trick beyond the obvious form (`xx` for x², expanding brackets), otherwise **+0**. `tests/levels.test.ts` checks par is within 1 of the shortest known solution.
6. Golfers search with brute force and miss tricks like `xx`. Always try the `xx` and expanded forms by hand too.

## Daily Pool

- Start with **30** daily levels, mixing difficulty roughly 40% easy, 40% medium, 20% hard.
- Daily levels should be solvable in **under 5 minutes** by a casual player, with room for experts to golf them.
- Don't reuse campaign layouts.
- Keep the pool **at least 14 days ahead** of the calendar after launch.
- **Order is the schedule** (`daily` in `index.ts`): every ten days run easy, medium, easy, medium, hard, easy, medium, easy, medium, hard (d019–d020 are both medium). The level format has no difficulty field; the mix lives in the order.
- **Physics shapes what works.** A stretch that curves downward (a hilltop, a climbing root or log, the flanks of a narrow hole) throws a fast cart off, so the pool leans on valleys that curve upward everywhere (parabolas, Vs, circles, `6/x`, `2^x`, `-ln(x)`) and keeps hills low and slow (`cos(x)`, `x-xx/6`, `sin(x)^2/2`).
- **Posts, not floating rocks**, steer the track: thin rects that hang from far above the level or stand on far below it, so a track can't route around them. A post sits 0.5 above the reference's highest point within 0.5 either side (the cart's reach on a slope), or 0.12 below its lowest point within 0.3.
- **Daily par** = the shortest known winner, **+1** when it's shorter than the reference. The shortest are listed in `tests/levels.test.ts` (`dailyShortest`) and were found by brute force over every equation up to 5 characters plus fitted shapes (`xx/N-N`, `|x-N|/N`, `Nsin(x/N)`, … with short numbers). Longer answers weren't searched exhaustively, so players may beat par.
- Each reference wins with the start speed ±8% off (`tests/levels.test.ts`; d024 Big Swell is the narrowest, failing just past −8%), and no campaign reference beats a daily level.

## Before Committing Any Level

`npm run check-levels` must pass. A level that fails validation never gets committed.
