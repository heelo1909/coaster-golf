import { describe, expect, it } from 'vitest';
import { judge } from '../../core';
import type { FailReason, Level, SimResult } from '../../core';
import { campaign } from '../../levels';
import { formatX, messages } from './messages';
import { HINT_AFTER_FAILS, resultOf } from './ResultPanel';

const REASONS: FailReason[] = [
  'FLEW_OFF',
  'STALLED',
  'HIT_OBSTACLE',
  'BROKEN_TRACK',
  'MISSED_START',
  'MISSED_END',
  'TIMEOUT',
];

function failed(reason: FailReason, x: number): SimResult {
  return { success: false, reason, failAt: { x, y: 0, t: 0 }, path: [], duration: 0 };
}

describe('fail messages: every way to fail reads as plain words', () => {
  it('every fail reason has its own message, and none shows the reason code', () => {
    const texts = REASONS.map((r) => messages.failed(r, 4.2));
    expect(new Set(texts).size).toBe(REASONS.length);
    for (const [i, text] of texts.entries()) expect(text).not.toContain(REASONS[i]);
  });

  it('says where it went wrong, to one decimal place', () => {
    expect(messages.failed('FLEW_OFF', 4.2)).toBe(
      'Too fast over that hill — the cart flew off at x = 4.2',
    );
    expect(messages.failed('STALLED', 6.06)).toBe(
      'Ran out of speed at x = 6.1 — it needs more downhill',
    );
    expect(messages.failed('HIT_OBSTACLE', 3)).toBe('Crashed into a rock at x = 3.0');
    expect(messages.failed('BROKEN_TRACK', 2)).toBe('The track has a gap or a wall at x = 2.0');
    expect(messages.failed('MISSED_START', 0)).toBe('Your track misses the start station');
    expect(messages.failed('MISSED_END', 6)).toBe('Your track misses the end station');
    expect(messages.failed('TIMEOUT', 1)).toBe('The ride took too long');
  });

  it('never shows a negative zero', () => {
    expect(formatX(-0.04)).toBe('0.0');
    expect(formatX(-0.06)).toBe('-0.1');
  });
});

describe('resultOf: what the panel says after a ride', () => {
  const level = campaign[0] as Level;

  it('a real win on level 1 shows the score against par, with a star at par', () => {
    const judged = judge(level, '0');
    if (!judged.ok) throw new Error('expected 0 to parse');
    expect(resultOf(judged.result, judged.score, level, 0)).toEqual({
      kind: 'won',
      title: 'Made it! 1 char (par 1)',
      underPar: true,
    });
  });

  it('a win over par has no star', () => {
    const judged = judge(level, 'sin(x)/3');
    if (!judged.ok) throw new Error('expected sin(x)/3 to parse');
    expect(resultOf(judged.result, judged.score, level, 0)).toMatchObject({
      title: 'Made it! 8 chars (par 1)',
      underPar: false,
    });
  });

  it('a real miss on level 1 says the track misses the end station', () => {
    const judged = judge(level, '-x');
    if (!judged.ok) throw new Error('expected -x to parse');
    expect(resultOf(judged.result, judged.score, level, 1)).toEqual({
      kind: 'failed',
      title: 'Your track misses the end station',
    });
  });

  it(`offers the hint only from the ${HINT_AFTER_FAILS}rd failed ride`, () => {
    const lvl = { par: 5, hint: 'Try a hill.' };
    expect(resultOf(failed('STALLED', 2), 3, lvl, HINT_AFTER_FAILS - 1)).not.toHaveProperty('hint');
    expect(resultOf(failed('STALLED', 2), 3, lvl, HINT_AFTER_FAILS)).toMatchObject({
      hint: 'Hint: Try a hill.',
    });
  });

  it('a level without a hint never shows one', () => {
    expect(resultOf(failed('STALLED', 2), 3, { par: 5 }, 10)).not.toHaveProperty('hint');
  });
});
