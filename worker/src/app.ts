// The leaderboard API (see worker/CLAUDE.md): POST /submit and GET /leaderboard. Kept apart
// from index.ts, because workerd treats every export of the entry module as an entrypoint.

import type { Env } from './env';
import { leaderboard } from './leaderboard';
import { findBoard } from './levels';
import { submit } from './submit';

// Bodies over this are refused before they're parsed (worker/CLAUDE.md, Abuse Protection).
export const MAX_BODY_BYTES = 1024;

// CORS: only the game's own origin, and localhost while developing (worker/CLAUDE.md).
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin');
  if (
    !origin ||
    !(LOCAL.test(origin) || (env.ALLOWED_ORIGIN !== '' && origin === env.ALLOWED_ORIGIN))
  ) {
    return {};
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

// `now` is passed by tests; the Worker uses the clock.
export async function handle(request: Request, env: Env, now = Date.now()): Promise<Response> {
  const cors = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const res = await route(request, env, now);
  for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  return res;
}

async function route(request: Request, env: Env, now: number): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === '/submit' && request.method === 'POST') {
    // 30 a minute per IP. The IP is only the limiter's key: it's never stored or logged.
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const { success } = await env.SUBMIT_LIMIT.limit({ key: ip });
    if (!success) return Response.json({ ok: false, error: 'slow_down' }, { status: 429 });

    const text = await request.text();
    if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
      return Response.json({ ok: false, error: 'too_big' }, { status: 413 });
    }
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return Response.json({ ok: false, error: 'bad_request' }, { status: 400 });
    }
    const result = await submit(body, env, now);
    return Response.json(result, { status: result.ok ? 200 : 400 });
  }
  if (url.pathname === '/leaderboard' && request.method === 'GET') {
    const board = findBoard(url.searchParams.get('level'), now);
    if (!board) return Response.json({ ok: false, error: 'unknown_level' }, { status: 400 });
    return Response.json(await leaderboard(env, board, url.searchParams.get('nickname'), now));
  }
  return Response.json({ ok: false, error: 'not_found' }, { status: 404 });
}
