import { describe, expect, it } from 'vitest';
import { validateLevel } from './index';

// A valid level as it would come out of JSON.parse: a gentle slope from (0, 5) down to (10, 0)
// past a box above the track and a ball below it. Each test breaks exactly one thing.
function raw(): Record<string, unknown> {
  return {
    id: 'c01',
    name: 'First Drop',
    bounds: { xMin: -1, xMax: 11, yMin: -2, yMax: 8 },
    start: { x: 0, y: 5, speed: 1 },
    end: { x: 10, y: 0 },
    obstacles: [
      { kind: 'rect', x: 4, y: 6, w: 1, h: 1 },
      { kind: 'circle', x: 8, y: -1.5, r: 0.3 },
    ],
    par: 5,
    reference: '5-x/2',
  };
}

function with_(change: (level: Record<string, unknown>) => void): Record<string, unknown> {
  const level = raw();
  change(level);
  return level;
}

// Each rule on its own: the level fails with exactly this one error.
function expectOnly(level: unknown, error: string): void {
  expect(validateLevel(level)).toEqual({ ok: false, errors: [error] });
}

describe('validateLevel: a good level', () => {
  it('a valid level passes and comes back as the same level', () => {
    const result = validateLevel(raw());
    expect(result).toEqual({ ok: true, level: raw() });
  });

  it('the level returned is a fresh copy, not the raw JSON object', () => {
    const input = raw();
    const result = validateLevel(input);
    if (!result.ok) throw new Error(result.errors.join('; '));
    expect(result.level).not.toBe(input);
    expect(result.level.start).not.toBe(input['start']);
  });

  it('a hint is optional, and kept when given', () => {
    const result = validateLevel(with_((l) => (l['hint'] = 'Try a gentle slope')));
    expect(result.ok && result.level.hint).toBe('Try a gentle slope');
  });

  it('a level may have no obstacles', () => {
    expect(validateLevel(with_((l) => (l['obstacles'] = []))).ok).toBe(true);
  });
});

describe('validateLevel: the shape of the file', () => {
  it('a file that is not an object is rejected', () => {
    for (const bad of [null, [], 'level', 3, undefined]) {
      expectOnly(bad, 'level must be an object');
    }
  });

  it('a misspelled field is named in the error', () => {
    expectOnly(
      with_((l) => (l['obstacels'] = [])),
      'unknown field "obstacels"',
    );
  });

  it('a misspelled field inside a station is named with its path', () => {
    const level = with_((l) => (l['start'] = { x: 0, y: 5, speed: 1, sped: 1 }));
    expectOnly(level, 'unknown field "start.sped"');
  });

  it('a misspelled field inside an obstacle is named with its path', () => {
    const level = with_(
      (l) => (l['obstacles'] = [{ kind: 'circle', x: 8, y: -1.5, r: 0.3, R: 1 }]),
    );
    expectOnly(level, 'unknown field "obstacles[0].R"');
  });

  it('a missing field is named', () => {
    expectOnly(
      with_((l) => delete l['par']),
      'missing field "par"',
    );
    expectOnly(
      with_((l) => (l['bounds'] = { xMin: -1, xMax: 11, yMin: -2 })),
      'missing field "bounds.yMax"',
    );
  });

  it('a number written as text is rejected', () => {
    expectOnly(
      with_((l) => (l['par'] = '5')),
      'par must be a number',
    );
  });

  it('a number that is not finite is rejected', () => {
    const level = with_((l) => (l['bounds'] = { xMin: -1, xMax: Infinity, yMin: -2, yMax: 8 }));
    expectOnly(level, 'bounds.xMax must be a number');
  });

  it('an empty name, id or reference is rejected', () => {
    expectOnly(
      with_((l) => (l['name'] = '  ')),
      'name must be a non-empty string',
    );
    expectOnly(
      with_((l) => (l['id'] = '')),
      'id must be a non-empty string',
    );
    expectOnly(
      with_((l) => (l['reference'] = 5)),
      'reference must be a non-empty string',
    );
  });

  it('a hint that is not text is rejected', () => {
    expectOnly(
      with_((l) => (l['hint'] = null)),
      'hint must be a non-empty string',
    );
  });

  it('obstacles must be a list of rectangles and circles', () => {
    expectOnly(
      with_((l) => (l['obstacles'] = {})),
      'obstacles must be a list',
    );
    expectOnly(
      with_((l) => (l['obstacles'] = [{ kind: 'triangle', x: 1, y: 1 }])),
      'obstacles[0].kind must be "rect" or "circle"',
    );
    expectOnly(
      with_((l) => (l['obstacles'] = ['box'])),
      'obstacles[0].kind must be "rect" or "circle"',
    );
  });

  it('every problem with the shape is listed at once', () => {
    const level = with_((l) => {
      l['par'] = '5';
      l['nmae'] = 'typo';
      delete l['end'];
    });
    expect(validateLevel(level)).toEqual({
      ok: false,
      errors: ['missing field "end"', 'unknown field "nmae"'],
    });
  });
});

describe('validateLevel: the layout', () => {
  it('the start station must be inside the level from the left', () => {
    const level = with_((l) => (l['bounds'] = { xMin: 0, xMax: 11, yMin: -2, yMax: 8 }));
    expectOnly(level, 'start.x must be right of bounds.xMin');
  });

  it('the end station must be right of the start station', () => {
    expectOnly(
      with_((l) => (l['end'] = { x: 0, y: 0 })),
      'end.x must be right of start.x',
    );
  });

  it('the end station must be inside the level on the right', () => {
    const level = with_((l) => (l['bounds'] = { xMin: -1, xMax: 9.5, yMin: -2, yMax: 8 }));
    expectOnly(level, 'end.x must not be right of bounds.xMax');
  });

  it('the end station may sit right on the right edge', () => {
    const level = with_((l) => (l['bounds'] = { xMin: -1, xMax: 10, yMin: -2, yMax: 8 }));
    expect(validateLevel(level).ok).toBe(true);
  });

  it('the floor must be below the ceiling', () => {
    const level = with_((l) => (l['bounds'] = { xMin: -1, xMax: 11, yMin: 8, yMax: 8 }));
    const result = validateLevel(level);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors).toContain('bounds.yMin must be below bounds.yMax');
  });

  it('a station above the ceiling or below the floor is rejected', () => {
    expectOnly(
      with_((l) => (l['start'] = { x: 0, y: 9, speed: 1 })),
      'start station is outside the bounds',
    );
    expectOnly(
      with_((l) => (l['end'] = { x: 10, y: -3 })),
      'end station is outside the bounds',
    );
  });

  it('a negative starting speed is rejected', () => {
    expectOnly(
      with_((l) => (l['start'] = { x: 0, y: 5, speed: -1 })),
      'start.speed must not be negative',
    );
  });

  it('an obstacle sitting on a station is rejected', () => {
    const onStart = { kind: 'circle', x: 0, y: 5.3, r: 0.2 };
    expectOnly(
      with_((l) => (l['obstacles'] = [onStart])),
      'start station overlaps obstacles[0]',
    );
    const onEnd = { kind: 'rect', x: 9.5, y: -1, w: 1, h: 0.9 };
    expectOnly(
      with_((l) => (l['obstacles'] = [onEnd])),
      'end station overlaps obstacles[0]',
    );
  });

  it('an obstacle with no size is rejected', () => {
    const flat = { kind: 'rect', x: 4, y: 6, w: 1, h: 0 };
    expectOnly(
      with_((l) => (l['obstacles'] = [flat])),
      'obstacles[0] must have a size above 0',
    );
  });
});

describe('validateLevel: par', () => {
  it('par must be a whole number of at least 1', () => {
    for (const par of [0, -3, 2.5]) {
      expectOnly(
        with_((l) => (l['par'] = par)),
        'par must be a whole number, at least 1',
      );
    }
  });

  it('par may be shorter than the reference', () => {
    expect(validateLevel(with_((l) => (l['par'] = 3))).ok).toBe(true);
  });

  it('par longer than the reference is rejected', () => {
    expectOnly(
      with_((l) => (l['par'] = 6)),
      'par (6) is longer than the reference (5 characters)',
    );
  });
});

describe('validateLevel: the reference solution', () => {
  it('a level whose reference misses the end station is rejected with the reason', () => {
    const level = with_((l) => {
      l['reference'] = '5-x';
      l['par'] = 3;
    });
    expectOnly(level, 'reference "5-x" doesn\'t win: MISSED_END at x = 10');
  });

  it('a level whose reference flies off the track is rejected with the reason', () => {
    // A hill from (0, 5) to (10, 0) taken at speed 8 throws the cart off near the top.
    const level = with_((l) => {
      l['start'] = { x: 0, y: 5, speed: 8 };
      l['reference'] = '5-x/2+2sin(pix/10)';
      l['obstacles'] = [];
    });
    const result = validateLevel(level);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[0]).toMatch(
      /^reference "5-x\/2\+2sin\(pix\/10\)" doesn't win: FLEW_OFF at x = /,
    );
  });

  it('a level whose reference does not parse is rejected with the parse error', () => {
    const level = with_((l) => {
      l['reference'] = '5-sinx';
      l['par'] = 5;
    });
    expectOnly(level, 'reference doesn\'t parse: "sin" needs parentheses, like sin(x)');
  });

  it('the reference is only ridden once the layout is valid', () => {
    const level = with_((l) => {
      l['end'] = { x: 0, y: 0 };
      l['reference'] = '5-x';
      l['par'] = 3;
    });
    expectOnly(level, 'end.x must be right of start.x');
  });
});
