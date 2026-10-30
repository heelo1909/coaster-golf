// The leaderboard API (see worker/CLAUDE.md): POST /submit and GET /leaderboard.

import type { Env } from './env';
import { leaderboard } from './leaderboard';
import { findBoard } from './levels';
import { submit } from './submit';

// `now` is passed by tests; the Worker uses the clock.
export async function handle(request: Request, env: Env, now = Date.now()): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === '/submit' && request.method === 'POST') {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ ok: false, error: 'bad_request' }, { status: 400 });
    }
    const result = await submit(body, env, now);
    return Response.json(result, { status: result.ok ? 200 : 400 });
  }
  if (url.pathname === '/leaderboard' && request.method === 'GET') {
    const board = findBoard(url.searchParams.get('level'), now);
    if (!board) return Response.json({ ok: false, error: 'unknown_level' }, { status: 400 });
    return Response.json(await leaderboard(env, board, url.searchParams.get('nickname')));
  }
  return Response.json({ ok: false, error: 'not_found' }, { status: 404 });
}

export default {
  fetch: (request, env) => handle(request, env),
} satisfies ExportedHandler<Env>;
