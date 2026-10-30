// The Worker's entry: only the default export may live here (workerd reads every export of
// this module as an entrypoint). The API itself is in app.ts.

import { handle } from './app';
import type { Env } from './env';

export default {
  fetch: (request, env) => handle(request, env),
} satisfies ExportedHandler<Env>;
