import { describe, expect, it } from 'vitest';
import { evaluate, parseEquation } from '../equation';
import { CART_RADIUS, DT, MAX_TIME, PATH_EVERY, STATION_TOLERANCE, simulate } from './index';
import type { Obstacle, SimLevel, SimResult } from './index';

// A small test level: a gentle slope from (0, 5) down to (10, 0), roomy bounds, no obstacles.
// Each test changes only what it's about.
function level(overrides: Partial<SimLevel> = {}): SimLevel {
  return {
    bounds: { xMin: -1, xMax: 20, yMin: -10, yMax: 20 },
    start: { x: 0, y: 5, speed: 1 },
    end: { x: 10, y: 0 },
    obstacles: [],
    ...overrides,
  };
}

function ride(input: string, lvl: SimLevel): SimResult {
  const r = parseEquation(input);
  if (!r.ok) throw new Error(`expected "${input}" to parse, got: ${r.error.message}`);
  const expr = r.expr;
  return simulate(lvl, (x) => evaluate(expr, x));
}

const valley = level({ start: { x: 0, y: 4, speed: 2 }, end: { x: 8, y: 4 } });
const cosHill = (speed: number): SimLevel =>
  level({ start: { x: 0, y: 1, speed }, end: { x: Math.PI, y: -1 } });

describe('simulate: rides that make it', () => {
  it('a gentle downhill line reaches the end station', () => {
    const result = ride('5-x/2', level());
    expect(result.success).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.failAt).toBeUndefined();
    expect(result.duration).toBeGreaterThan(0);
  });

  it('the cart rolls through a valley and up to the end station', () => {
    expect(ride('(x-4)^2/4', valley).success).toBe(true);
  });

  it('a track that misses the stations by less than the tolerance still counts', () => {
    const lvl = level({ start: { x: 0, y: 5 + STATION_TOLERANCE * 0.8, speed: 1 } });
    expect(ride('5-x/2', lvl).success).toBe(true);
  });

  it('a cart passing just over an obstacle gets through', () => {
    // The track is at y = 3..2.5 under this box; the cart needs 2·CART_RADIUS = 0.4 of room.
    const box: Obstacle = { kind: 'rect', x: 4, y: 3.5, w: 1, h: 1 };
    expect(ride('5-x/2', level({ obstacles: [box] })).success).toBe(true);
  });
});

describe('simulate: FLEW_OFF', () => {
  it('a hilltop taken fast throws the cart off, the same hill taken slowly does not', () => {
    // At the top of cos(x) the curvature is -1, so the cart leaves above v = √g ≈ 3.13.
    expect(ride('cos(x)', cosHill(2.5)).success).toBe(true);
    const fast = ride('cos(x)', cosHill(4));
    expect(fast.success).toBe(false);
    expect(fast.reason).toBe('FLEW_OFF');
    expect(fast.failAt!.x).toBeLessThan(0.1);
    expect(fast.failAt!.t).toBeGreaterThan(0);
  });

  it('a sharp peak throws the cart off where the peak is', () => {
    // -|x-5| has its corner exactly on a sample, so the curvature there is huge.
    const lvl = level({ start: { x: 0, y: -5, speed: 12 }, end: { x: 10, y: -5 } });
    const result = ride('-|x-5|', lvl);
    expect(result.reason).toBe('FLEW_OFF');
    expect(result.failAt!.x).toBeCloseTo(5, 1);
  });
});

describe('simulate: STALLED', () => {
  it('a cart too slow for the hill stops on it instead of rolling back', () => {
    const result = ride('x', level({ start: { x: 0, y: 0, speed: 1 }, end: { x: 10, y: 10 } }));
    expect(result.reason).toBe('STALLED');
    expect(result.failAt!.x).toBeGreaterThan(0);
    expect(result.failAt!.x).toBeLessThan(0.1);
  });

  it('a valley the cart cannot climb out of stalls near the far rim', () => {
    const slow = level({ start: { x: 0, y: 4, speed: 0.5 }, end: { x: 8, y: 4 } });
    const result = ride('(x-4)^2/4', slow);
    expect(result.reason).toBe('STALLED');
    expect(result.failAt!.x).toBeGreaterThan(7);
    expect(result.failAt!.x).toBeLessThan(8);
  });

  it('a cart with no speed on flat ground stalls straight away', () => {
    const result = ride('0', level({ start: { x: 0, y: 0, speed: 0 }, end: { x: 10, y: 0 } }));
    expect(result.reason).toBe('STALLED');
    expect(result.failAt!.x).toBe(0);
  });
});

describe('simulate: HIT_OBSTACLE', () => {
  it('a box sitting on the track stops the ride before it starts', () => {
    const box: Obstacle = { kind: 'rect', x: 4, y: 2, w: 1, h: 1 };
    const result = ride('5-x/2', level({ obstacles: [box] }));
    expect(result.reason).toBe('HIT_OBSTACLE');
    expect(result.failAt).toEqual({ x: expect.closeTo(3.96, 6), y: expect.closeTo(3.02, 6), t: 0 });
    expect(result.duration).toBe(0);
  });

  it('a round obstacle near the track is hit by the cart, not just the track', () => {
    // The circle's edge is 0.16 above the track at x = 5: clear of the line, not of the cart.
    const ball: Obstacle = { kind: 'circle', x: 5, y: 2.5 + 0.16 + 0.3, r: 0.3 };
    expect(0.16).toBeLessThan(2 * CART_RADIUS);
    expect(ride('5-x/2', level({ obstacles: [ball] })).reason).toBe('HIT_OBSTACLE');
  });
});

describe('simulate: OUT_OF_BOUNDS', () => {
  it('a valley that dips below the floor of the level is out of bounds', () => {
    const lvl = { ...valley, bounds: { ...valley.bounds, yMin: 1 } };
    const result = ride('(x-4)^2/4', lvl);
    expect(result.reason).toBe('OUT_OF_BOUNDS');
    expect(result.failAt!.y).toBeLessThan(1);
    expect(result.failAt!.x).toBeCloseTo(2.01, 6);
  });

  it('a hump above the ceiling is out of bounds', () => {
    // The hump peaks at y ≈ 6.8 near x = 3.7.
    const lvl = level({ bounds: { xMin: -1, xMax: 20, yMin: -10, yMax: 6 } });
    const result = ride('5-x/2+4sin(pix/10)', lvl);
    expect(result.reason).toBe('OUT_OF_BOUNDS');
    expect(result.failAt!.y).toBeGreaterThan(6);
  });
});

describe('simulate: BROKEN_TRACK', () => {
  it('a single missing point in the track breaks it there', () => {
    // (x-5)/(x-5) is 1 everywhere except x = 5, where it's undefined.
    const lvl = level({ start: { x: 0, y: 1, speed: 1 }, end: { x: 10, y: 1 } });
    const result = ride('(x-5)/(x-5)', lvl);
    expect(result.reason).toBe('BROKEN_TRACK');
    expect(result.failAt).toEqual({ x: 5, y: 1, t: 0 });
  });

  it('a jump in the track breaks it just before the gap', () => {
    // The step is at x = 0.995, between two samples, so only the jump check can see it.
    const lvl = level({ start: { x: 0.5, y: 0, speed: 1 }, end: { x: 3.5, y: 3 } });
    const result = ride('floor(x+0.005)', lvl);
    expect(result.reason).toBe('BROKEN_TRACK');
    expect(result.failAt).toEqual({ x: expect.closeTo(0.99, 9), y: 0, t: 0 });
  });

  it('a near-vertical wall breaks the track', () => {
    const result = ride('30x', level({ start: { x: 0, y: 0, speed: 1 }, end: { x: 1, y: 30 } }));
    expect(result.reason).toBe('BROKEN_TRACK');
  });

  it('a track heading off to infinity breaks before it gets there', () => {
    const lvl = level({ start: { x: 0, y: -0.2, speed: 1 }, end: { x: 10, y: 0.2 } });
    const result = ride('1/(x-5)', lvl);
    expect(result.reason).toBe('BROKEN_TRACK');
    expect(result.failAt!.x).toBeLessThan(5);
    expect(Number.isFinite(result.failAt!.y)).toBe(true);
  });

  it('broken track is reported before a missed station', () => {
    const lvl = level({ start: { x: 0, y: 99, speed: 1 }, end: { x: 10, y: 1 } });
    expect(ride('(x-5)/(x-5)', lvl).reason).toBe('BROKEN_TRACK');
  });
});

describe('simulate: MISSED_START and MISSED_END', () => {
  it('a track that passes too far from the start station misses it', () => {
    const result = ride('5-x/2', level({ start: { x: 0, y: 6, speed: 1 } }));
    expect(result.reason).toBe('MISSED_START');
    expect(result.failAt).toEqual({ x: 0, y: 5, t: 0 });
  });

  it('a track that passes too far from the end station misses it', () => {
    const result = ride('5-x/2', level({ end: { x: 10, y: 1 } }));
    expect(result.reason).toBe('MISSED_END');
    expect(result.failAt).toEqual({ x: 10, y: 0, t: 0 });
  });

  it('missing the start is reported before missing the end', () => {
    const lvl = level({ start: { x: 0, y: 6, speed: 1 }, end: { x: 10, y: 1 } });
    expect(ride('5-x/2', lvl).reason).toBe('MISSED_START');
  });
});

describe('simulate: TIMEOUT', () => {
  it('a cart creeping along flat ground runs out of time', () => {
    const result = ride('0', level({ start: { x: 0, y: 0, speed: 0.1 }, end: { x: 10, y: 0 } }));
    expect(result.reason).toBe('TIMEOUT');
    expect(result.failAt!.t).toBeCloseTo(MAX_TIME, 6);
    expect(result.duration).toBeCloseTo(MAX_TIME, 6);
    expect(result.failAt!.x).toBeLessThan(10);
  });
});

describe('simulate: the path the renderer replays', () => {
  // The path's points are 60 fps frames: one every PATH_EVERY steps of DT.
  const frame = PATH_EVERY * DT;

  function expectSteadyFrames(result: SimResult): void {
    const { path } = result;
    for (let i = 1; i < path.length; i++) {
      const gap = path[i]!.t - path[i - 1]!.t;
      expect(gap).toBeGreaterThan(0);
      // Only the last point may come early, when the run ended between frames.
      if (i < path.length - 1) expect(gap).toBeCloseTo(frame, 9);
      else expect(gap).toBeLessThanOrEqual(frame + 1e-9);
      expect(path[i]!.x).toBeGreaterThanOrEqual(path[i - 1]!.x);
    }
  }

  it('a winning ride starts at the start station and ends at the end station', () => {
    const result = ride('5-x/2', level());
    const first = result.path[0]!;
    const last = result.path[result.path.length - 1]!;
    expect(first).toEqual({ t: 0, x: 0, y: 5, angle: expect.closeTo(Math.atan(-0.5), 9) });
    expect(last.t).toBe(result.duration);
    expect(last.x).toBe(10);
    expect(last.y).toBeCloseTo(0, 9);
    expectSteadyFrames(result);
  });

  it('the replay keeps 60 frames a second of the ride', () => {
    const result = ride('(x-4)^2/4', valley);
    const frames = Math.ceil(result.duration / frame - 1e-9);
    expect(result.path.length).toBe(frames + 1);
    expectSteadyFrames(result);
  });

  it('a cart that flies off is last seen where it left the track', () => {
    const result = ride('cos(x)', cosHill(4));
    const last = result.path[result.path.length - 1]!;
    expect(result.reason).toBe('FLEW_OFF');
    expect(result.path[0]!.t).toBe(0);
    expect({ x: last.x, y: last.y, t: last.t }).toEqual(result.failAt);
    expectSteadyFrames(result);
  });

  it('a cart that stalls is last seen where it stopped', () => {
    const slow = level({ start: { x: 0, y: 4, speed: 0.5 }, end: { x: 8, y: 4 } });
    const result = ride('(x-4)^2/4', slow);
    const last = result.path[result.path.length - 1]!;
    expect(result.reason).toBe('STALLED');
    expect({ x: last.x, y: last.y, t: last.t }).toEqual(result.failAt);
    expectSteadyFrames(result);
  });

  it('a ride that runs out of time has a frame for every sixtieth of the 30 seconds', () => {
    const result = ride('0', level({ start: { x: 0, y: 0, speed: 0.1 }, end: { x: 10, y: 0 } }));
    const last = result.path[result.path.length - 1]!;
    expect(result.reason).toBe('TIMEOUT');
    expect(result.path.length).toBe(MAX_TIME * 60 + 1);
    expect({ x: last.x, y: last.y, t: last.t }).toEqual(result.failAt);
    expectSteadyFrames(result);
  });

  it('a track that fails before the ride has nothing to replay', () => {
    expect(ride('5-x/2', level({ start: { x: 0, y: 6, speed: 1 } })).path).toEqual([]);
    expect(ride('(x-5)/(x-5)', level({ start: { x: 0, y: 1, speed: 1 } })).path).toEqual([]);
    const box: Obstacle = { kind: 'rect', x: 4, y: 2, w: 1, h: 1 };
    expect(ride('5-x/2', level({ obstacles: [box] })).path).toEqual([]);
  });
});

describe('simulate: the same ride always ends the same way', () => {
  const cases: Array<[string, string, SimLevel]> = [
    ['a winning downhill', '5-x/2', level()],
    ['a winning valley', '(x-4)^2/4', valley],
    ['a fly-off', 'cos(x)', cosHill(4)],
    ['a stall', '(x-4)^2/4', level({ start: { x: 0, y: 4, speed: 0.5 }, end: { x: 8, y: 4 } })],
    ['a timeout', '0', level({ start: { x: 0, y: 0, speed: 0.1 }, end: { x: 10, y: 0 } })],
    ['a missed start', '5-x/2', level({ start: { x: 0, y: 6, speed: 1 } })],
  ];

  it.each(cases)('%s gives an identical result 100 times in a row', (_, input, lvl) => {
    const first = ride(input, lvl);
    for (let i = 0; i < 99; i++) expect(ride(input, lvl)).toStrictEqual(first);
  });
});

describe('simulate: fast enough for live preview', () => {
  // The slowest kind of run: a busy equation ridden for the full 30 seconds (7200 steps).
  const crawl = level({ start: { x: 0, y: 1, speed: 0.1 }, end: { x: 10, y: 1 } });
  const busy = '1+sin(x)^2/10^5+sqrt(|cos(3x)|)/10^5+ln(2+x)/10^6';

  // Wall-clock time of simulate alone, without parsing or the test's expect() calls.
  function timeRide(): { ms: number; result: SimResult } {
    const r = parseEquation(busy);
    if (!r.ok) throw new Error(r.error.message);
    const expr = r.expr;
    const start = performance.now();
    const result = simulate(crawl, (x) => evaluate(expr, x));
    return { ms: performance.now() - start, result };
  }

  it('a full 30-second ride on a busy equation takes under 50 ms', () => {
    timeRide(); // warm up the JIT, as the game would after the first keystroke
    const { result } = timeRide();
    expect(result.reason).toBe('TIMEOUT');
    // A single slow run can be a garbage-collection pause; take the best of 3.
    const best = Math.min(timeRide().ms, timeRide().ms, timeRide().ms);
    expect(best).toBeLessThan(50);
  });
});
