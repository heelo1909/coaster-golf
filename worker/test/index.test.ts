import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { handle } from '../src/index';
import { testEnv } from './env';
import type { TestEnv } from './env';

let t: TestEnv;
beforeEach(async () => (t = await testEnv()));
afterEach(async () => t.dispose());

describe('the leaderboard API', () => {
  it('answers an unknown path with 404', async () => {
    const res = await handle(new Request('http://localhost/nope'), t.env);
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ ok: false, error: 'not_found' });
  });

  it('runs against a real local D1 database', async () => {
    const row = await t.env.DB.prepare('SELECT 1 + 1 AS two').first<{ two: number }>();
    expect(row?.two).toBe(2);
  });
});
