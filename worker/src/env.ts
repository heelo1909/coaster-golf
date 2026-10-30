// The Worker's bindings, as wrangler.toml declares them.
export interface Env {
  DB: D1Database;
  SUBMIT_LIMIT: RateLimit;
  ALLOWED_ORIGIN: string; // the game's origin; localhost is always allowed (dev)
}
