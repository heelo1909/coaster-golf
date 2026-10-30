// The leaderboard API (see worker/CLAUDE.md): POST /submit and, next, GET /leaderboard.

import type { Env } from './env';
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
  return Response.json({ ok: false, error: 'not_found' }, { status: 404 });
}

export default {
  fetch: (request, env) => handle(request, env),
} satisfies ExportedHandler<Env>;
