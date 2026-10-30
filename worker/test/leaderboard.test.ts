import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { dailyNumber } from '../../src/core';
import { handle } from '../src/index';
import { testEnv } from './env';
import type { TestEnv } from './env';

let t: TestEnv;
beforeEach(async () => (t = await testEnv()));
afterEach(async () => t.dispose());

const NOW = Date.UTC(2027, 2, 14, 12);
const get = async (query: string) => {
  const res = await handle(new Request(`http://localhost/leaderboard?${query}`), t.env, NOW);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
};
const insert = (level: string, nick: string, eq: string, score: number, at: number) =>
  t.env.DB.prepare('INSERT INTO scores VALUES (?, ?, ?, ?, ?)')
    .bind(level, nick, eq, score, at)
    .run();

describe('GET /leaderboard', () => {
  it('lists a board shortest first, earliest first among ties, ranked from 1', async () => {
    await insert('c03', 'late', '.3x', 3, 30);
    await insert('c03', 'early', 'x/3', 3, 10);
    await insert('c03', 'long', 'x/3+0', 5, 5);
    await insert('c04', 'elsewhere', 'x', 1, 1);
    const { status, body } = await get('level=c03');
    expect(status).toBe(200);
    expect(body).toEqual({
      entries: [
        { rank: 1, nickname: 'early', score: 3, equation: 'x/3', at: 10 },
        { rank: 2, nickname: 'late', score: 3, equation: '.3x', at: 30 },
        { rank: 3, nickname: 'long', score: 5, equation: 'x/3+0', at: 5 },
      ],
    });
  });

  it('shows the top 50, and your own place even when you are below them', async () => {
    for (let i = 0; i < 60; i++) await insert('c03', `p${i}`, 'x/3', 3, i);
    const { body } = await get('level=c03&nickname=p57');
    const entries = body.entries as { rank: number; nickname: string }[];
    expect(entries).toHaveLength(50);
    expect(entries.at(-1)).toMatchObject({ rank: 50, nickname: 'p49' });
    expect(body.you).toEqual({ rank: 58, score: 3 });
  });

  it('leaves "you" out for a nickname that has no run on this board', async () => {
    await insert('c03', 'ada', 'x/3', 3, 1);
    expect((await get('level=c03&nickname=bob')).body).not.toHaveProperty('you');
  });

  it('an empty board has no entries', async () => {
    expect((await get('level=c07')).body).toEqual({ entries: [] });
  });

  it("past and today's daily boards can be read; future ones and unknown levels can't", async () => {
    const n = dailyNumber(new Date(NOW));
    expect((await get(`level=daily:${n}`)).status).toBe(200);
    expect((await get(`level=daily:${n - 3}`)).status).toBe(200);
    for (const q of [`level=daily:${n + 1}`, 'level=c99', 'level=', '']) {
      const { status, body } = await get(q);
      expect(status, q).toBe(400);
      expect(body, q).toEqual({ ok: false, error: 'unknown_level' });
    }
  });
});
