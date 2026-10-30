// The Worker's bindings, as wrangler.toml declares them.
export interface Env {
  DB: D1Database;
  SUBMIT_LIMIT: RateLimit;
}
