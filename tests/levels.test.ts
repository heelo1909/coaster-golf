import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { judge, scoreEquation } from '../src/core';
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

  it('has no daily levels yet (Section 7)', () => {
    expect(daily).toEqual([]);
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
