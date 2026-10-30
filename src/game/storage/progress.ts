// The campaign on this device: the best score and equation per level. Stored as
// { version: 1, best: { c01: { score, equation }, … } } under cg:v1:progress. Which levels are
// unlocked isn't stored: it follows from which levels have a best (ui/LevelSelect.ts).

import { browserStorage, readJson, writeJson } from './store';

export const PROGRESS_KEY = 'cg:v1:progress';
const VERSION = 1;

export interface Best {
  score: number; // characters, as judge() scored them
  equation: string; // exactly what was typed
}

export interface Progress {
  best: Record<string, Best>; // by level id; only levels that have been beaten
}

function isBest(value: unknown): value is Best {
  if (typeof value !== 'object' || value === null) return false;
  const { score, equation } = value as { score?: unknown; equation?: unknown };
  return (
    typeof score === 'number' &&
    Number.isInteger(score) &&
    score > 0 &&
    typeof equation === 'string' &&
    equation.length > 0
  );
}

// The saved progress, or none when nothing valid is saved (never throws). A broken entry is
// dropped on its own, so one bad level doesn't lose the rest.
export function loadProgress(storage: Storage | null = browserStorage()): Progress {
  const saved = readJson(storage, PROGRESS_KEY);
  if (typeof saved !== 'object' || saved === null) return { best: {} };
  const { version, best } = saved as { version?: unknown; best?: unknown };
  if (version !== VERSION || typeof best !== 'object' || best === null) return { best: {} };
  const kept: Record<string, Best> = {};
  for (const [id, entry] of Object.entries(best)) {
    if (isBest(entry)) kept[id] = { score: entry.score, equation: entry.equation };
  }
  return { best: kept };
}

// Records a win. Only a shorter score replaces the saved best; a tie keeps the first equation.
// Returns the progress as it now stands, which the caller keeps in memory, so the game still
// remembers wins for this visit when storage is blocked.
export function saveBest(
  progress: Progress,
  levelId: string,
  score: number,
  equation: string,
  storage: Storage | null = browserStorage(),
): Progress {
  const old = progress.best[levelId];
  if (old && old.score <= score) return progress;
  const next: Progress = { best: { ...progress.best, [levelId]: { score, equation } } };
  writeJson(storage, PROGRESS_KEY, { version: VERSION, ...next });
  return next;
}
