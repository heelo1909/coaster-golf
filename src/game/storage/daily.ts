// The daily on this device: the best score and equation per daily number, and the streak.
// Stored as { version: 1, best: { "12": { score, equation }, … }, streak } under cg:v1:daily.
// Streak rules live in core (updateStreak); this file only saves the result.

import { NO_STREAK, updateStreak } from '../../core';
import type { StreakState } from '../../core';
import type { Best } from './progress';
import { isBest } from './progress';
import { browserStorage, readJson, writeJson } from './store';

export const DAILY_KEY = 'cg:v1:daily';
const VERSION = 1;

export interface DailySave {
  best: Record<number, Best>; // by daily number; only dailies that were solved
  streak: StreakState;
}

const count = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

function isStreak(value: unknown): value is StreakState {
  if (typeof value !== 'object' || value === null) return false;
  const { current, best, lastPlayed } = value as Record<string, unknown>;
  return (
    count(current) &&
    count(best) &&
    best >= current &&
    (lastPlayed === null || (typeof lastPlayed === 'number' && Number.isInteger(lastPlayed)))
  );
}

// The saved dailies, or none when nothing valid is saved (never throws). A broken best is
// dropped on its own; a broken streak starts over.
export function loadDaily(storage: Storage | null = browserStorage()): DailySave {
  const empty: DailySave = { best: {}, streak: NO_STREAK };
  const saved = readJson(storage, DAILY_KEY);
  if (typeof saved !== 'object' || saved === null) return empty;
  const { version, best, streak } = saved as Record<string, unknown>;
  if (version !== VERSION) return empty;
  const kept: Record<number, Best> = {};
  if (typeof best === 'object' && best !== null) {
    for (const [n, entry] of Object.entries(best)) {
      if (/^-?\d+$/.test(n) && isBest(entry)) {
        kept[Number(n)] = { score: entry.score, equation: entry.equation };
      }
    }
  }
  return { best: kept, streak: isStreak(streak) ? { ...streak } : NO_STREAK };
}

// Records a solve of daily `n`: the streak moves on (once per day, see updateStreak), and the
// best is replaced only by a shorter score. Returns the new state for the caller to keep in
// memory, so a blocked storage still counts the solve for this visit.
export function saveDailyWin(
  save: DailySave,
  n: number,
  score: number,
  equation: string,
  storage: Storage | null = browserStorage(),
): DailySave {
  const old = save.best[n];
  const streak = updateStreak(save.streak, n);
  if (old && old.score <= score && streak === save.streak) return save;
  const best = old && old.score <= score ? save.best : { ...save.best, [n]: { score, equation } };
  const next: DailySave = { best, streak };
  writeJson(storage, DAILY_KEY, { version: VERSION, ...next });
  return next;
}
