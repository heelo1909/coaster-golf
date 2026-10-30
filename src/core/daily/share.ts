// The daily's share text (see daily/CLAUDE.md). It says how you did, never how: the equation
// is not an input, so it can't leak into the text.

// Where the shared text points: the live game, with https:// so chat apps make it a link.
export const SHARE_URL = 'https://coaster-golf.coaster-golf.workers.dev';

export interface ShareInput {
  daily: number; // the daily number, #42
  par: number;
  score?: number | undefined; // characters; left out when today's daily isn't solved yet
  streak: number; // the live streak; 0 leaves the line out
  url?: string;
}

export function buildShareText({ daily, par, score, streak, url = SHARE_URL }: ShareInput): string {
  if (score === undefined) return [`Coaster Golf #${daily} 🎢 — not yet! 💥`, url].join('\n');
  const chars = score === 1 ? '1 char' : `${score} chars`;
  const lines = [`Coaster Golf #${daily} 🎢`, `${chars} (par ${par}) ⛳`];
  if (streak > 0) lines.push(`🔥 ${streak}-day streak`);
  lines.push(url);
  return lines.join('\n');
}
