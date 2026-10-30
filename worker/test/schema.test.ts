import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { testEnv } from './env';
import type { TestEnv } from './env';

let t: TestEnv;
beforeEach(async () => (t = await testEnv()));
afterEach(async () => t.dispose());

const insert = (level: string, nick: string, eq: string, score: number, at: number) =>
  t.env.DB.prepare('INSERT INTO scores VALUES (?, ?, ?, ?, ?)')
    .bind(level, nick, eq, score, at)
    .run();

describe('the scores table', () => {
  it('stores exactly level, nickname, equation, score and time, nothing personal', async () => {
    const { results } = await t.env.DB.prepare('PRAGMA table_info(scores)').all<{ name: string }>();
    expect(results.map((c) => c.name)).toEqual([
      'level_id',
      'nickname',
      'equation',
      'score',
      'created_at',
    ]);
  });

  it('keeps one row per nickname per board', async () => {
    await insert('c03', 'ada', 'x/3', 3, 1);
    await insert('daily:42', 'ada', 'x/3', 3, 1);
    await expect(insert('c03', 'ada', 'x/3+0', 5, 2)).rejects.toThrow(/UNIQUE|PRIMARY/);
  });

  it('reads a board shortest first, then earliest first, using the board index', async () => {
    await insert('c03', 'late', 'x/3', 3, 30);
    await insert('c03', 'early', '.3x', 3, 10);
    await insert('c03', 'long', 'x/3+0', 5, 5);
    await insert('c04', 'other', 'x', 1, 1);
    const q = 'SELECT nickname FROM scores WHERE level_id = ? ORDER BY score, created_at LIMIT 50';
    const { results } = await t.env.DB.prepare(q).bind('c03').all<{ nickname: string }>();
    expect(results.map((r) => r.nickname)).toEqual(['early', 'late', 'long']);
    const plan = await t.env.DB.prepare(`EXPLAIN QUERY PLAN ${q}`)
      .bind('c03')
      .all<{ detail: string }>();
    expect(plan.results.map((r) => r.detail).join(' ')).toContain('idx_board');
  });
});
