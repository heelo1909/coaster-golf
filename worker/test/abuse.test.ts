import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { handle } from '../src/index';
import { testEnv } from './env';
import type { TestEnv } from './env';

let t: TestEnv;
beforeEach(async () => (t = await testEnv()));
afterEach(async () => t.dispose());

const NOW = Date.UTC(2027, 2, 14, 12);
const post = (body: string, ip = '203.0.113.7') =>
  handle(
    new Request('http://localhost/submit', {
      method: 'POST',
      body,
      headers: { 'CF-Connecting-IP': ip },
    }),
    t.env,
    NOW,
  );
const count = async () =>
  (await t.env.DB.prepare('SELECT COUNT(*) AS n FROM scores').first<{ n: number }>())?.n;

describe('abuse protection on POST /submit', () => {
  it('rate limits by IP: over the limit is 429 slow_down and nothing is saved', async () => {
    const ok = await post(JSON.stringify({ levelId: 'c03', equation: 'x/3', nickname: 'ada' }));
    expect(ok.status).toBe(200);
    expect(t.limited.keys).toEqual(['203.0.113.7']);

    t.limited.blocked = true;
    const res = await post(JSON.stringify({ levelId: 'c02', equation: '3-x/2', nickname: 'ada' }));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ ok: false, error: 'slow_down' });
    expect(await count()).toBe(1);
  });

  it('never stores the IP', async () => {
    await post(JSON.stringify({ levelId: 'c03', equation: 'x/3', nickname: 'ada' }));
    const row = await t.env.DB.prepare('SELECT * FROM scores').first();
    expect(JSON.stringify(row)).not.toContain('203.0.113.7');
  });

  it('refuses a body over 1 KB before reading it as JSON', async () => {
    const big = JSON.stringify({
      levelId: 'c03',
      equation: 'x/3',
      nickname: 'ada',
      pad: 'x'.repeat(1100),
    });
    const res = await post(big);
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ ok: false, error: 'too_big' });
    expect(await count()).toBe(0);
  });

  it('counts the 1 KB in bytes, so multi-byte characters cannot slip past', async () => {
    const res = await post(JSON.stringify({ nickname: 'ada', pad: '🎢'.repeat(300) })); // ~1.2 KB
    expect(res.status).toBe(413);
  });

  it('refuses an equation over 200 characters as bad_equation', async () => {
    const res = await post(
      JSON.stringify({ levelId: 'c03', equation: 'x/3' + '+0'.repeat(99), nickname: 'ada' }),
    );
    expect(await res.json()).toEqual({ ok: false, error: 'bad_equation' });
  });
});
