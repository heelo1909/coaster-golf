import { describe, expect, it } from 'vitest';
import {
  dailyLevelIndex,
  dailyNumber as numberFrom,
  daysLeftInPool,
  msUntilNextDaily,
} from './schedule';

const HOUR = 60 * 60 * 1000;
// A launch day of its own, so the tests don't change when the real one is set.
const LAUNCH_DATE = Date.UTC(2026, 9, 30); // 2026-10-30
const dailyNumber = (date: Date): number => numberFrom(date, LAUNCH_DATE);
const launch = new Date(LAUNCH_DATE);
const at = (iso: string): Date => new Date(iso);
const day = (n: number, ms = 0): Date => new Date(LAUNCH_DATE + (n - 1) * 24 * HOUR + ms);

describe('daily schedule: everyone plays the same level each UTC day', () => {
  it('launch day is #1, from its first millisecond to its last', () => {
    expect(dailyNumber(launch)).toBe(1);
    expect(dailyNumber(day(1, 24 * HOUR - 1))).toBe(1);
    expect(dailyNumber(day(2))).toBe(2);
  });

  it('rolls over at midnight UTC, not before', () => {
    expect(dailyNumber(at('2026-11-02T23:59:59.999Z'))).toBe(4);
    expect(dailyNumber(at('2026-11-03T00:00:00.000Z'))).toBe(5);
  });

  it('counts straight across a month boundary', () => {
    expect(dailyNumber(at('2026-10-31T12:00:00Z'))).toBe(2);
    expect(dailyNumber(at('2026-11-01T12:00:00Z'))).toBe(3);
    expect(dailyNumber(at('2026-12-01T00:00:00Z'))).toBe(33);
  });

  it("a date written in someone's local time maps by its UTC day", () => {
    // 01:00 on Nov 2 in UTC+5 is still Nov 1 in UTC; 22:00 on Nov 1 in UTC-5 is already Nov 2.
    expect(dailyNumber(at('2026-11-02T01:00:00+05:00'))).toBe(3);
    expect(dailyNumber(at('2026-11-01T22:00:00-05:00'))).toBe(4);
    // Two devices at the same instant, far apart, get the same daily.
    expect(dailyNumber(at('2026-11-05T09:30:00+09:00'))).toBe(
      dailyNumber(at('2026-11-04T19:30:00-05:00')),
    );
  });

  it('days before launch count down from 0', () => {
    expect(dailyNumber(day(0))).toBe(0);
    expect(dailyNumber(day(-1, 12 * HOUR))).toBe(-1);
  });

  it('daily #n plays pool level n-1, and repeats once the pool runs out', () => {
    expect([1, 2, 30, 31, 32, 61].map((n) => dailyLevelIndex(n, 30))).toEqual([0, 1, 29, 0, 1, 0]);
  });

  it('a daily number before launch still picks a level in the pool', () => {
    expect([0, -1, -29, -30].map((n) => dailyLevelIndex(n, 30))).toEqual([29, 28, 0, 29]);
  });

  it('counts down to the next midnight UTC', () => {
    expect(msUntilNextDaily(launch)).toBe(24 * HOUR);
    expect(msUntilNextDaily(at('2026-11-01T23:00:00Z'))).toBe(HOUR);
    expect(msUntilNextDaily(at('2026-11-01T23:59:59.999Z'))).toBe(1);
    expect(msUntilNextDaily(at('2026-11-02T01:00:00+05:00'))).toBe(4 * HOUR);
  });

  it('knows how many pool days are left after today', () => {
    expect(daysLeftInPool(1, 30)).toBe(29);
    expect(daysLeftInPool(17, 30)).toBe(13);
  });
});
