// The level format (see level/CLAUDE.md). Levels are stored as .json files and only become a
// Level through validateLevel(); never cast raw JSON to one.

// Obstacle is defined next to the collision code that reads it; re-exported here, not
// redefined, so the two `export *` in core/index.ts don't clash.
export type { Obstacle } from '../sim';
import type { Obstacle } from '../sim';

// A point the track has to pass through, within STATION_TOLERANCE.
export interface Station {
  x: number;
  y: number;
}

// The start station also launches the cart, at `speed` units/s (≥ 0).
export interface StartStation extends Station {
  speed: number;
}

export interface Level {
  id: string; // "c01".."c15" for the campaign, "d001".. for daily
  name: string; // short, fun: "First Drop"
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  start: StartStation;
  end: Station; // the cart wins when it reaches end.x
  obstacles: Obstacle[];
  par: number; // character count to aim for
  reference: string; // a known winning equation, never shown to players
  hint?: string; // optional nudge shown after 3 failed rides
}
