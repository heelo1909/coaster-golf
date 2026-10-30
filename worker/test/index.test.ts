import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { handle } from '../src/app';
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

  it('allows the game origin and localhost by CORS, and nobody else', async () => {
    const from = (origin: string, method = 'GET') =>
      handle(
        new Request('http://localhost/leaderboard?level=c01', {
          method,
          headers: { Origin: origin },
        }),
        t.env,
      );
    for (const origin of [
      'https://coastergolf.example',
      'http://localhost:5173',
      'http://127.0.0.1:4173',
    ]) {
      const res = await from(origin);
      expect(res.headers.get('Access-Control-Allow-Origin'), origin).toBe(origin);
    }
    for (const origin of [
      'https://evil.example',
      'http://localhost.evil.example',
      'https://localhost:5173',
    ]) {
      expect((await from(origin)).headers.get('Access-Control-Allow-Origin'), origin).toBeNull();
    }
    const preflight = await from('http://localhost:5173', 'OPTIONS');
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
  });
});
