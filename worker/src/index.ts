// The leaderboard API (see worker/CLAUDE.md). Routes are added as Section 8 builds them.

import type { Env } from './env';

export async function handle(request: Request, env: Env): Promise<Response> {
  void env;
  const url = new URL(request.url);
  return Response.json({ ok: false, error: 'not_found', path: url.pathname }, { status: 404 });
}

export default {
  fetch: (request, env) => handle(request, env),
} satisfies ExportedHandler<Env>;
