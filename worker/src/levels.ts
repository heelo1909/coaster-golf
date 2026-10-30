// The Worker's own copy of every level, bundled from src/levels: a submission names a level by
// id, and the Worker never trusts a level sent by the browser (worker/CLAUDE.md).

import { dailyLevelIndex, dailyNumber } from '../../src/core';
import type { Level } from '../../src/core';
import { campaign, daily } from '../../src/levels';

export type LevelLookup =
  | { ok: true; level: Level; boardId: string; daily?: number }
  | { ok: false; error: 'unknown_level' | 'daily_closed' };

const DAILY = /^daily:(-?\d{1,6})$/;

// `levelId` is a campaign id ("c03") or a daily ("daily:42"). A daily is open only on its own
// UTC day, so the board closes when the day ends.
export function findLevel(levelId: unknown, now: number): LevelLookup {
  if (typeof levelId !== 'string') return { ok: false, error: 'unknown_level' };
  const level = campaign.find((l) => l.id === levelId);
  if (level) return { ok: true, level, boardId: level.id };
  const match = DAILY.exec(levelId);
  if (!match) return { ok: false, error: 'unknown_level' };
  const n = Number(match[1]);
  if (n !== dailyNumber(new Date(now))) return { ok: false, error: 'daily_closed' };
  return {
    ok: true,
    level: daily[dailyLevelIndex(n, daily.length)]!,
    boardId: `daily:${n}`,
    daily: n,
  };
}

// Which board `level` names, for reading: a campaign id, or any daily that has started (past
// boards stay readable). Undefined for anything else.
export function findBoard(level: string | null, now: number): string | undefined {
  if (level === null) return undefined;
  if (campaign.some((l) => l.id === level)) return level;
  const match = DAILY.exec(level);
  if (!match || Number(match[1]) > dailyNumber(new Date(now))) return undefined;
  return `daily:${Number(match[1])}`;
}
