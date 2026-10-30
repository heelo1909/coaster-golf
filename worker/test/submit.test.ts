import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { dailyLevelIndex, dailyNumber } from '../../src/core';
import { daily } from '../../src/levels';
import { handle } from '../src/app';
import { testEnv } from './env';
import type { TestEnv } from './env';

let t: TestEnv;
beforeEach(async () => (t = await testEnv()));
afterEach(async () => t.dispose());

const NOW = Date.UTC(2027, 2, 14, 12); // midday UTC
const post = (body: unknown, now = NOW) =>
  handle(
    new Request('http://localhost/submit', {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    t.env,
    now,
  );
const rows = async () =>
  (await t.env.DB.prepare('SELECT * FROM scores ORDER BY level_id, nickname').all()).results;

describe('POST /submit re-runs the game and saves only winning runs', () => {
  it('a winning equation is saved with the score the Worker computed', async () => {
    const res = await post({ levelId: 'c03', equation: 'x/3', nickname: 'ada' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, score: 3, best: 3, rank: 1 });
    expect(await rows()).toEqual([
      { level_id: 'c03', nickname: 'ada', equation: 'x/3', score: 3, created_at: NOW },
    ]);
  });

  it('a losing equation is rejected as run_failed and nothing is saved', async () => {
    const res = await post({ levelId: 'c03', equation: '0', nickname: 'ada' });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: 'run_failed' });
    expect(await rows()).toEqual([]);
  });

  it('a fake score, success or path in the body is ignored', async () => {
    const res = await post({
      levelId: 'c03',
      equation: 'x/3+0',
      nickname: 'ada',
      score: 1,
      success: true,
      path: [],
    });
    expect(await res.json()).toMatchObject({ ok: true, score: 5 });
    expect((await rows())[0]).toMatchObject({ score: 5 });

    const losing = await post({
      levelId: 'c03',
      equation: '0',
      nickname: 'bob',
      score: 1,
      success: true,
    });
    expect(await losing.json()).toEqual({ ok: false, error: 'run_failed' });
    expect(await rows()).toHaveLength(1);
  });

  it('a worse score does not replace a better one; a better one does', async () => {
    await post({ levelId: 'c03', equation: 'x/3', nickname: 'ada' }, NOW);
    const worse = await post({ levelId: 'c03', equation: 'x/3+0', nickname: 'ada' }, NOW + 1);
    expect(await worse.json()).toEqual({ ok: true, score: 5, best: 3, rank: 1 });
    expect(await rows()).toMatchObject([{ equation: 'x/3', score: 3, created_at: NOW }]);

    await post({ levelId: 'c02', equation: '3-x/2+0', nickname: 'ada' }, NOW);
    await post({ levelId: 'c02', equation: '3-x/2', nickname: 'ada' }, NOW + 2);
    expect((await rows())[0]).toMatchObject({ equation: '3-x/2', score: 5, created_at: NOW + 2 });
  });

  it('ranks by score, then by who got there first', async () => {
    await post({ levelId: 'c03', equation: 'x/3+0', nickname: 'slow' }, NOW);
    await post({ levelId: 'c03', equation: 'x/3', nickname: 'first' }, NOW + 1);
    const res = await post({ levelId: 'c03', equation: '.3x', nickname: 'second' }, NOW + 2);
    expect(await res.json()).toMatchObject({ score: 3, rank: 2 });
  });

  it("an equation that doesn't parse is bad_equation", async () => {
    for (const equation of ['(x-', 'sinx', 7, null]) {
      const res = await post({ levelId: 'c03', equation, nickname: 'ada' });
      expect(await res.json(), String(equation)).toEqual({ ok: false, error: 'bad_equation' });
    }
  });

  it('an unknown level, or a level sent as data, is unknown_level', async () => {
    for (const levelId of ['c99', 'C03', 'daily:', 'daily:x', '', 3, { id: 'c03', par: 99 }]) {
      const res = await post({ levelId, equation: 'x/3', nickname: 'ada' });
      expect(await res.json(), JSON.stringify(levelId)).toEqual({
        ok: false,
        error: 'unknown_level',
      });
    }
  });

  it("today's daily is open; yesterday's and tomorrow's are closed", async () => {
    const n = dailyNumber(new Date(NOW));
    const level = daily[dailyLevelIndex(n, daily.length)]!;
    const today = await post({ levelId: `daily:${n}`, equation: level.reference, nickname: 'ada' });
    expect(await today.json()).toMatchObject({ ok: true });
    expect((await rows())[0]).toMatchObject({ level_id: `daily:${n}` });
    for (const k of [n - 1, n + 1]) {
      const res = await post({ levelId: `daily:${k}`, equation: level.reference, nickname: 'ada' });
      expect(await res.json()).toEqual({ ok: false, error: 'daily_closed' });
    }
  });

  it('a body that is not a JSON object is bad_request', async () => {
    for (const body of ['not json', '[]', 'null', '"c03"']) {
      const res = await post(body);
      expect(res.status, body).toBe(400);
      expect(await res.json(), body).toEqual({ ok: false, error: 'bad_request' });
    }
  });

  it('a nickname that breaks the rules is bad_nickname and nothing is saved', async () => {
    for (const nickname of [
      'ab',
      'a'.repeat(17),
      'ada@mail.com',
      'ada lovelace',
      'sh1t_head',
      7,
      null,
    ]) {
      const res = await post({ levelId: 'c03', equation: 'x/3', nickname });
      expect(await res.json(), String(nickname)).toEqual({ ok: false, error: 'bad_nickname' });
    }
    expect(await rows()).toEqual([]);
  });
});
