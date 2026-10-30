// POST /submit: validate → judge → save (worker/CLAUDE.md, Trust Rule). The body names a level,
// an equation and a nickname; anything else in it (a score, success, a path) is ignored. The
// Worker re-runs the game with judge() from src/core and saves only a winning run, with the
// score judge() computed.

import { judge } from '../../src/core';
import type { Env } from './env';
import { findLevel } from './levels';

export type SubmitError =
  'bad_request' | 'bad_equation' | 'run_failed' | 'bad_nickname' | 'unknown_level' | 'daily_closed';

export type SubmitResult =
  { ok: true; score: number; best: number; rank: number } | { ok: false; error: SubmitError };

export async function submit(body: unknown, env: Env, now: number): Promise<SubmitResult> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'bad_request' };
  }
  const { levelId, equation, nickname } = body as Record<string, unknown>;
  if (typeof nickname !== 'string' || nickname === '') return { ok: false, error: 'bad_nickname' };
  if (typeof equation !== 'string') return { ok: false, error: 'bad_equation' };
  const found = findLevel(levelId, now);
  if (!found.ok) return found;

  const judged = judge(found.level, equation);
  if (!judged.ok) return { ok: false, error: 'bad_equation' };
  if (!judged.result.success) return { ok: false, error: 'run_failed' };
  const score = judged.score;

  // Each nickname keeps only its best per board; a tie keeps the earlier run.
  await env.DB.prepare(
    `INSERT INTO scores (level_id, nickname, equation, score, created_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (level_id, nickname) DO UPDATE SET
       equation = excluded.equation, score = excluded.score, created_at = excluded.created_at
     WHERE excluded.score < scores.score`,
  )
    .bind(found.boardId, nickname, equation, score, now)
    .run();

  const best = await env.DB.prepare(
    'SELECT score, created_at FROM scores WHERE level_id = ? AND nickname = ?',
  )
    .bind(found.boardId, nickname)
    .first<{ score: number; created_at: number }>();
  if (!best) throw new Error('the saved score is missing');
  const ahead = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM scores
     WHERE level_id = ? AND (score < ? OR (score = ? AND created_at < ?))`,
  )
    .bind(found.boardId, best.score, best.score, best.created_at)
    .first<{ n: number }>();
  return { ok: true, score, best: best.score, rank: (ahead?.n ?? 0) + 1 };
}
