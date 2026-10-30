// GET /leaderboard?level=…: the top 50 on a board, shortest first, earliest first among ties,
// plus the asking nickname's own place when it's given. While a daily is live its equations
// are hidden, so nobody can copy the winner; once the day ends they're shown.

import { dailyNumber } from '../../src/core';
import type { Env } from './env';

export const BOARD_SIZE = 50;

export interface Entry {
  rank: number;
  nickname: string;
  score: number;
  equation: string | null;
  at: number; // when that best was set, ms since 1970
}

export interface Board {
  entries: Entry[];
  you?: { rank: number; score: number };
}

interface Row {
  nickname: string;
  score: number;
  equation: string;
  created_at: number;
}

// True while `boardId` is today's daily.
export function isLiveDaily(boardId: string, now: number): boolean {
  return boardId === `daily:${dailyNumber(new Date(now))}`;
}

export async function leaderboard(
  env: Env,
  boardId: string,
  nickname: string | null,
  now: number,
): Promise<Board> {
  const hide = isLiveDaily(boardId, now);
  const { results } = await env.DB.prepare(
    `SELECT nickname, score, equation, created_at FROM scores
     WHERE level_id = ? ORDER BY score, created_at LIMIT ?`,
  )
    .bind(boardId, BOARD_SIZE)
    .all<Row>();
  const entries = results.map((r, i) => ({
    rank: i + 1,
    nickname: r.nickname,
    score: r.score,
    equation: hide ? null : r.equation,
    at: r.created_at,
  }));
  if (nickname === null) return { entries };
  const you = await placeOf(env, boardId, nickname);
  return you ? { entries, you } : { entries };
}

// A nickname's best on a board and its rank: everyone shorter, or as short but earlier, is
// ahead. Undefined when the nickname has no run there.
export async function placeOf(
  env: Env,
  boardId: string,
  nickname: string,
): Promise<{ rank: number; score: number } | undefined> {
  const mine = await env.DB.prepare(
    'SELECT score, created_at FROM scores WHERE level_id = ? AND nickname = ?',
  )
    .bind(boardId, nickname)
    .first<{ score: number; created_at: number }>();
  if (!mine) return undefined;
  const ahead = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM scores
     WHERE level_id = ? AND (score < ? OR (score = ? AND created_at < ?))`,
  )
    .bind(boardId, mine.score, mine.score, mine.created_at)
    .first<{ n: number }>();
  return { rank: (ahead?.n ?? 0) + 1, score: mine.score };
}
