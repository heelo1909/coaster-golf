import { describe, expect, it } from 'vitest';
import { formatCountdown } from './DailyScreen';

describe('the countdown to the next daily', () => {
  it('shows hours, minutes and seconds, padded', () => {
    expect(formatCountdown(((5 * 60 + 12) * 60 + 9) * 1000)).toBe('05:12:09');
    expect(formatCountdown(24 * 60 * 60 * 1000)).toBe('24:00:00');
  });

  it('rounds up, so the last second still shows 00:00:01', () => {
    expect(formatCountdown(1)).toBe('00:00:01');
    expect(formatCountdown(999)).toBe('00:00:01');
    expect(formatCountdown(1000)).toBe('00:00:01');
    expect(formatCountdown(1001)).toBe('00:00:02');
  });

  it('never goes below zero', () => {
    expect(formatCountdown(0)).toBe('00:00:00');
    expect(formatCountdown(-5000)).toBe('00:00:00');
  });
});
