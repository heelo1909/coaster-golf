// A test Env: a real D1 database from Miniflare (the same SQLite engine `wrangler dev` uses)
// with the migrations applied, and a rate limiter the test controls.
/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Miniflare } from 'miniflare';
import type { Env } from '../src/env';

const migrations = fileURLToPath(new URL('../migrations/', import.meta.url).href);

export interface TestEnv {
  env: Env;
  limited: { blocked: boolean; keys: string[] }; // set blocked to make the limiter refuse
  dispose(): Promise<void>;
}

export async function testEnv(): Promise<TestEnv> {
  const mf = new Miniflare({ modules: true, script: 'export default {}', d1Databases: ['DB'] });
  const db = (await mf.getD1Database('DB')) as unknown as D1Database;
  for (const file of readdirSync(migrations)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    const sql = readFileSync(join(migrations, file), 'utf8');
    for (const statement of sql
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)) {
      await db.prepare(statement).run();
    }
  }
  const limited = { blocked: false, keys: [] as string[] };
  const SUBMIT_LIMIT: RateLimit = {
    limit: async ({ key }) => {
      limited.keys.push(key);
      return { success: !limited.blocked };
    },
  };
  return {
    env: {
      DB: db,
      SUBMIT_LIMIT,
      ALLOWED_ORIGIN: 'https://coastergolf.example, https://pages.example',
    },
    limited,
    dispose: () => mf.dispose(),
  };
}
