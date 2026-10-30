import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { dailyLevelIndex, dailyNumber, judge, scoreEquation } from '../src/core';
import type { Level } from '../src/core';
import { campaign, daily } from '../src/levels';

const campaignDir = fileURLToPath(new URL('../src/levels/campaign/', import.meta.url));

function wins(level: Level, input: string): boolean {
  const j = judge(level, input);
  return j.ok && j.result.success;
}

// The straight line through both stations, written as an equation.
function straightLine({ start, end }: Level): string {
  const slope = (end.y - start.y) / (end.x - start.x);
  return `${start.y}+${slope}*(x-${start.x})`;
}

describe('the Level Set', () => {
  it('has 15 levels, c01 to c15, in play order', () => {
    expect(campaign.map((l) => l.id)).toEqual(
      Array.from({ length: 15 }, (_, i) => `c${String(i + 1).padStart(2, '0')}`),
    );
  });

  it('loads every level file in the campaign folder', () => {
    const files = readdirSync(campaignDir).filter((f) => f.endsWith('.json'));
    expect(files.map((f) => f.replace('.json', '')).sort()).toEqual(campaign.map((l) => l.id));
  });

  it('gives every level a name', () => {
    expect(new Set(campaign.map((l) => l.name)).size).toBe(15);
  });
});

const dailyDir = fileURLToPath(new URL('../src/levels/daily/', import.meta.url));

// The shortest known winner for each daily level (found by brute force over every equation up
// to 5 characters plus fitted shapes like `xx/N-N`), by id. Par is this length, +1 when it's
// shorter than the reference.
const dailyShortest: Record<string, string> = {
  d001: '4-x/2',
  d002: '2cos(x/2)',
  d003: 'xx/8',
  d004: 'xx.24',
  d005: 'max(2,|x-2|)',
  d006: '|x|',
  d007: 'xx/2-3x',
  d008: 'cos(x)',
  d009: '4/3^x',
  d010: '|x-2|-x',
  d011: 'xx/2-5',
  d012: 'xx/8-x',
  d013: 'x/2',
  d014: '5/x-5',
  d015: '2sin(x)/x',
  d016: '|x-2|-.2',
  d017: 'x-xx/6',
  d018: 'x/4-2',
  d019: 'x^4/27',
  d020: 'xx/3-.8x',
  d021: '-x/3',
  d022: '|x|/.9-.1',
  d023: '6/x',
  d024: '3sin(x/3)',
  d025: 'xx/3-6',
  d026: '6-2x^.5',
  d027: 'xxx/9',
  d028: 'x/5',
  d029: 'xx-1',
  d030: 'sin(x)^2/2',
};

describe('the daily pool', () => {
  it('has 30 levels, d001 to d030, in schedule order', () => {
    expect(daily.map((l) => l.id)).toEqual(
      Array.from({ length: 30 }, (_, i) => `d${String(i + 1).padStart(3, '0')}`),
    );
  });

  it('loads every level file in the daily folder', () => {
    const files = readdirSync(dailyDir).filter((f) => f.endsWith('.json'));
    expect(files.map((f) => f.replace('.json', '')).sort()).toEqual(daily.map((l) => l.id));
  });

  it('names every level, and no name repeats a campaign level', () => {
    const names = [...campaign, ...daily].map((l) => l.name);
    expect(new Set(names).size).toBe(45);
  });

  it('every reference wins, with its length as the score', () => {
    for (const level of daily) {
      const j = judge(level, level.reference);
      expect(j.ok && j.result.success, level.id).toBe(true);
      expect(j.ok && j.score, level.id).toBe(scoreEquation(level.reference));
    }
  });

  it('every shortest known solution wins, and par is that length (+1 below the reference)', () => {
    for (const level of daily) {
      const best = dailyShortest[level.id]!;
      expect(wins(level, best), `${level.id} ${best}`).toBe(true);
      const n = scoreEquation(best);
      expect(level.par, level.id).toBe(n < scoreEquation(level.reference) ? n + 1 : n);
    }
  });

  it("doesn't reuse a campaign layout: no campaign reference beats a daily level", () => {
    for (const level of daily) {
      for (const c of campaign) expect(wins(level, c.reference), `${level.id} ${c.id}`).toBe(false);
    }
  });

  it('two devices at the same moment, in different time zones, get the same level', () => {
    const today = (iso: string): Level => daily[dailyLevelIndex(dailyNumber(new Date(iso)), 30)]!;
    expect(today('2027-01-15T08:00:00+09:00')).toBe(today('2027-01-14T18:00:00-05:00'));
    expect(today('2027-01-15T08:00:00+09:00')).not.toBe(today('2027-01-15T08:00:00-05:00'));
  });

  it('every reference still wins with the starting speed 5% off either way', () => {
    for (const level of daily) {
      for (const k of [0.95, 1.05]) {
        const l = { ...level, start: { ...level.start, speed: level.start.speed * k } };
        expect(wins(l, level.reference), `${level.id} ×${k}`).toBe(true);
      }
    }
  });
});

describe('every level can be beaten', () => {
  it.each(campaign.map((l) => [l.id, l.name, l] as const))(
    '%s %s: the reference solution wins, scored by its length',
    (_, __, level) => {
      const j = judge(level, level.reference);
      expect(j.ok && j.result.success).toBe(true);
      expect(j.ok && j.score).toBe(scoreEquation(level.reference));
      expect(level.par).toBeLessThanOrEqual(scoreEquation(level.reference));
    },
  );
});

// Known solutions shorter than the reference, from golfing every level (see progress.md). Each
// must win, and par is set from the shortest one.
const shorter: Record<string, string[]> = {
  c05: ['x-xx/8', 'x-x/8x'],
  c06: ['xx/4-3x+6'],
  c07: ['3+x-xx/4', 'x-xx/4+3', '3+x-x^2/4'],
  c12: ['xx/4', 'x/4x'],
  c14: ['|xx-4|/4', '|xx/4-1|'],
};

describe('par', () => {
  it.each(Object.entries(shorter))('%s: the known shorter solutions win', (id, inputs) => {
    const level = campaign.find((l) => l.id === id)!;
    for (const input of inputs) {
      expect(wins(level, input), input).toBe(true);
      expect(scoreEquation(input)).toBeLessThan(scoreEquation(level.reference));
    }
  });

  it('every par can be reached by a known solution', () => {
    for (const level of campaign) {
      const best = Math.min(...[level.reference, ...(shorter[level.id] ?? [])].map(scoreEquation));
      expect(level.par, level.id).toBeGreaterThanOrEqual(best);
      // A good player matches par; a clever one beats it by at most 1 (see src/levels/CLAUDE.md).
      expect(level.par - best, level.id).toBeLessThanOrEqual(1);
    }
  });
});

describe('shortcuts found by golfing stay closed', () => {
  it('The Dip needs a curve: a sharp V hits the rocks beside it', () => {
    expect(wins(campaign[3]!, '|x-4|')).toBe(false);
  });

  it('Gull Wings needs the hill in the middle: one wide dip hits the post', () => {
    expect(wins(campaign[13]!, 'xx/4-1')).toBe(false);
  });

  it('Camel Back must stay above the ground: an upside-down wave hits the rocks', () => {
    expect(wins(campaign[14]!, '-sin(x)')).toBe(false);
    expect(wins(campaign[14]!, 'sin(-x)')).toBe(false);
  });
});

describe('the first level', () => {
  it('is beaten by nearly any sensible track between its stations', () => {
    const c01 = campaign[0]!;
    // Flat, dipping or humped: anything that starts and ends on the ground makes it.
    for (const input of [
      '0',
      'x-x',
      '0x',
      'x(x-6)/9',
      'x(6-x)/9',
      'sin(pix/6)',
      '-sin(pix/6)/2',
      '(x-3)^2/9-1',
    ]) {
      expect(wins(c01, input), input).toBe(true);
    }
  });
});

describe('every level asks for its own idea', () => {
  it('the first three levels are beaten by a straight line between the stations', () => {
    for (const level of campaign.slice(0, 3)) expect(wins(level, straightLine(level))).toBe(true);
  });

  it('from level 4 on, a straight line between the stations does not win', () => {
    for (const level of campaign.slice(3)) {
      expect(wins(level, straightLine(level)), level.id).toBe(false);
    }
  });

  it("no level is beaten by the previous level's reference", () => {
    for (let i = 1; i < campaign.length; i++) {
      expect(wins(campaign[i]!, campaign[i - 1]!.reference), campaign[i]!.id).toBe(false);
    }
  });
});
