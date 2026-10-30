import { describe, expect, it } from 'vitest';
import { nicknameHint, rowsOf, submitMessage } from './LeaderboardDialog';

describe('leaderboard words', () => {
  it('a saved run says the rank; a worse run says the best still stands', () => {
    expect(submitMessage({ ok: true, score: 3, best: 3, rank: 2 })).toBe("Saved! You're #2");
    expect(submitMessage({ ok: true, score: 5, best: 3, rank: 2 })).toBe(
      "Your best still stands: you're #2",
    );
  });

  it('every refusal is plain words, never the code; unknown ones read as offline', () => {
    for (const error of [
      'offline',
      'slow_down',
      'daily_closed',
      'run_failed',
      'bad_nickname',
      'too_big',
      'weird',
    ]) {
      const text = submitMessage({ ok: false, error });
      expect(text, error).not.toContain('_');
      expect(text.length, error).toBeGreaterThan(10);
    }
    expect(submitMessage({ ok: false, error: 'weird' })).toBe(
      submitMessage({ ok: false, error: 'offline' }),
    );
  });

  it('says what is wrong with a nickname, and nothing when it is fine', () => {
    expect(nicknameHint('too_short')).toBe('At least 3 characters.');
    expect(nicknameHint(undefined)).toBe('');
  });
});

describe('leaderboard rows', () => {
  const board = {
    entries: [
      { rank: 1, nickname: 'ada', score: 3, equation: 'x/3', at: 1 },
      { rank: 2, nickname: 'bob', score: 4, equation: null, at: 2 },
    ],
  };

  it('marks your own row and shows hidden daily equations as a note', () => {
    expect(rowsOf(board, 'bob')).toEqual([
      { rank: '1', nickname: 'ada', score: '3', equation: 'x/3', mine: false },
      { rank: '2', nickname: 'bob', score: '4', equation: 'hidden until tomorrow', mine: true },
    ]);
  });

  it('adds your place under the list when you are further down', () => {
    const rows = rowsOf({ ...board, you: { rank: 58, score: 9 } }, 'cy');
    expect(rows.at(-1)).toEqual({
      rank: '58',
      nickname: 'cy',
      score: '9',
      equation: '',
      mine: true,
    });
  });

  it('marks nobody without a nickname', () => {
    expect(rowsOf(board, undefined).some((r) => r.mine)).toBe(false);
  });
});
