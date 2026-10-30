import { describe, expect, it } from 'vitest';
import { campaign } from '../../levels';
import type { Progress } from '../storage';
import { isUnlocked, tilesOf } from './LevelSelect';

const none: Progress = { best: {} };
const beat = (...entries: [string, number][]): Progress => ({
  best: Object.fromEntries(entries.map(([id, score]) => [id, { score, equation: 'x' }])),
});

describe('level select: beating a level unlocks the next', () => {
  it('on a first visit only level 1 is open', () => {
    const tiles = tilesOf(campaign, none);
    expect(tiles).toHaveLength(15);
    expect(tiles.map((t) => t.locked)).toEqual([false, ...Array<boolean>(14).fill(true)]);
  });

  it('beating a level opens the one after it, and only that one', () => {
    const progress = beat(['c01', 1], ['c02', 5]);
    expect(campaign.map((_, i) => isUnlocked(campaign, progress, i)).slice(0, 4)).toEqual([
      true,
      true,
      true,
      false,
    ]);
  });

  it('a level stays open even when an earlier one has no saved best', () => {
    // e.g. a level was added to the campaign later
    expect(isUnlocked(campaign, beat(['c04', 9]), 4)).toBe(true);
    expect(isUnlocked(campaign, beat(['c04', 9]), 3)).toBe(false);
  });

  it('a tile shows its number, name, best and a star only at or under par', () => {
    // c02 par 5, c03 par 3
    const [one, two, three] = tilesOf(campaign, beat(['c01', 1], ['c02', 6], ['c03', 3]));
    expect(one).toMatchObject({
      id: 'c01',
      number: '01',
      name: 'Warm Up',
      best: 1,
      underPar: true,
    });
    expect(two).toMatchObject({ number: '02', best: 6, underPar: false, locked: false });
    expect(three).toMatchObject({ number: '03', best: 3, underPar: true });
  });

  it('an open level not yet beaten has no best and no star', () => {
    const second = tilesOf(campaign, beat(['c01', 1]))[1]!;
    expect(second.best).toBeUndefined();
    expect(second.underPar).toBe(false);
  });

  it('screen readers hear the whole tile, star included in words', () => {
    const tiles = tilesOf(campaign, beat(['c01', 1], ['c02', 6]));
    expect(tiles[0]!.label).toBe('Level 1, Warm Up, best 1 char, par 1, at or under par');
    expect(tiles[1]!.label).toBe(`Level 2, ${campaign[1]!.name}, best 6 chars, par 5`);
    expect(tiles[2]!.label).toBe(`Level 3, ${campaign[2]!.name}, par 3`);
    expect(tiles[3]!.label).toBe(`Level 4, ${campaign[3]!.name}, locked`);
  });
});
