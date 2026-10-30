import { describe, expect, it } from 'vitest';
import { NO_STREAK, liveStreak, updateStreak } from './streak';

const solve = (...days: number[]) => days.reduce(updateStreak, NO_STREAK);

describe('streaks count days solved in a row', () => {
  it('the first solve starts a streak of 1', () => {
    expect(solve(12)).toEqual({ current: 1, best: 1, lastPlayed: 12 });
  });

  it('solving the next day adds one', () => {
    expect(solve(12, 13, 14)).toEqual({ current: 3, best: 3, lastPlayed: 14 });
  });

  it('solving the same day again changes nothing', () => {
    expect(solve(12, 13, 13, 13)).toEqual({ current: 2, best: 2, lastPlayed: 13 });
  });

  it('a missed day starts again from 1, keeping the best', () => {
    expect(solve(12, 13, 14, 16)).toEqual({ current: 1, best: 3, lastPlayed: 16 });
    expect(solve(12, 13, 14, 16, 17)).toEqual({ current: 2, best: 3, lastPlayed: 17 });
  });

  it('the best grows once the new streak passes it', () => {
    expect(solve(1, 2, 4, 5, 6)).toEqual({ current: 3, best: 3, lastPlayed: 6 });
    expect(solve(1, 2, 4, 5, 6, 7).best).toBe(4);
  });

  it('a solve dated before the last one (a clock set back) restarts at 1', () => {
    expect(solve(12, 13, 10)).toEqual({ current: 1, best: 2, lastPlayed: 10 });
  });
});

describe('the streak shown today', () => {
  const state = solve(12, 13, 14);
  it('is the current streak after solving today', () => {
    expect(liveStreak(state, 14)).toBe(3);
  });

  it("is still alive the next day, before today's is solved", () => {
    expect(liveStreak(state, 15)).toBe(3);
  });

  it('is broken (0) once a whole day was missed', () => {
    expect(liveStreak(state, 16)).toBe(0);
  });

  it('is 0 with no solves at all', () => {
    expect(liveStreak(NO_STREAK, 1)).toBe(0);
  });
});
