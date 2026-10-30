// Talks to the leaderboard Worker (worker/CLAUDE.md). It only ever sends a level id, the typed
// equation and the nickname; the Worker re-runs the game and decides the score.

export interface BoardEntry {
  rank: number;
  nickname: string;
  score: number;
  equation: string | null; // null on today's daily, until the day ends
  at: number;
}

export interface Board {
  entries: BoardEntry[];
  you?: { rank: number; score: number };
}

export type SubmitReply =
  { ok: true; score: number; best: number; rank: number } | { ok: false; error: string }; // the Worker's error code, or "offline"

// Where the Worker is: VITE_API_URL when set, the local `wrangler dev` while developing, and
// nothing otherwise (until launch sets it), which hides the leaderboard.
export function apiBase(): string {
  const set = import.meta.env.VITE_API_URL as string | undefined;
  if (set) return set.replace(/\/$/, '');
  return import.meta.env.DEV ? 'http://localhost:8787' : '';
}

const TIMEOUT_MS = 8000;

async function call(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return res.json();
}

// "c03" for a campaign level, "daily:42" for a daily.
export async function submitRun(
  boardId: string,
  equation: string,
  nickname: string,
): Promise<SubmitReply> {
  try {
    const reply = (await call('/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ levelId: boardId, equation, nickname }),
    })) as SubmitReply;
    return typeof reply === 'object' && reply !== null && 'ok' in reply
      ? reply
      : { ok: false, error: 'offline' };
  } catch {
    return { ok: false, error: 'offline' };
  }
}

export async function fetchBoard(boardId: string, nickname?: string): Promise<Board | undefined> {
  const query = new URLSearchParams({ level: boardId });
  if (nickname) query.set('nickname', nickname);
  try {
    const board = (await call(`/leaderboard?${query}`)) as Board;
    return Array.isArray(board?.entries) ? board : undefined;
  } catch {
    return undefined;
  }
}
