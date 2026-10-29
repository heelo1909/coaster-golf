import { describe, expect, expectTypeOf, it } from 'vitest';
import * as core from '../index';
import { evaluate, parseEquation } from '../equation';
import { simulate } from '../sim';
import type { Obstacle as SimObstacle, SimLevel } from '../sim';
import type { Level, Obstacle } from './index';

// A small level written the way a .json level file reads.
const firstDrop: Level = {
  id: 'c01',
  name: 'First Drop',
  bounds: { xMin: -1, xMax: 11, yMin: -2, yMax: 8 },
  start: { x: 0, y: 5, speed: 1 },
  end: { x: 10, y: 0 },
  obstacles: [
    { kind: 'rect', x: 4, y: 4, w: 1, h: 1 },
    { kind: 'circle', x: 7, y: -1, r: 0.5 },
  ],
  par: 5,
  reference: '5-x/2',
};

describe('level format', () => {
  it('a level is ridden by the simulation as it is, with nothing to convert', () => {
    expectTypeOf<Level>().toExtend<SimLevel>();
    const r = parseEquation(firstDrop.reference);
    if (!r.ok) throw new Error(r.error.message);
    const expr = r.expr;
    expect(simulate(firstDrop, (x) => evaluate(expr, x)).success).toBe(true);
  });

  it('levels and the simulation share one obstacle shape', () => {
    expectTypeOf<Obstacle>().toEqualTypeOf<SimObstacle>();
  });

  it('a hint is optional, and every other field is required', () => {
    // firstDrop above has no hint; this one has.
    const hinted: Level = { ...firstDrop, hint: 'Try a gentle slope' };
    expect(hinted.hint).toBe('Try a gentle slope');
    // @ts-expect-error a level without a par is not a Level
    const noPar: Level = { ...firstDrop, par: undefined };
    expect(noPar.par).toBeUndefined();
  });

  it('the level types come with the rest of the shared game logic', () => {
    expectTypeOf<core.Level>().toEqualTypeOf<Level>();
    expectTypeOf<core.Obstacle>().toEqualTypeOf<Obstacle>();
  });
});
