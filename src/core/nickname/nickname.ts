// Leaderboard nicknames (worker/CLAUDE.md): 3–16 letters, digits or underscores, and not rude.
// Shared by the browser (to say what's wrong while typing) and the Worker (which decides).
// A nickname is the only thing a player tells us about themselves; nothing else is collected.

export type NicknameError = 'too_short' | 'too_long' | 'bad_characters' | 'not_allowed';

export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 16;

// Words rejected anywhere inside a nickname, after undoing letter swaps. Kept to roots that
// rarely occur inside ordinary words.
const BLOCKED_INSIDE = [
  'fuck',
  'shit',
  'cunt',
  'bitch',
  'nigg',
  'fagg',
  'whore',
  'slut',
  'twat',
  'wank',
  'penis',
  'vagina',
  'porn',
  'rape',
  'nazi',
  'hitler',
  'pussy',
  'dildo',
  'cock',
  'dick',
  'retard',
];

// Short words that hide inside innocent ones ("class", "title"), so only a whole nickname, or
// a whole part between underscores, is rejected.
const BLOCKED_WHOLE = [
  'ass',
  'arse',
  'tit',
  'tits',
  'cum',
  'sex',
  'fag',
  'kkk',
  'nig',
  'poo',
  'piss',
];

// Letter swaps people use to sneak words past filters: 0→o, 1→i, 3→e, 4→a, 5→s, 7→t, 8→b, 9→g.
const SWAPS: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '9': 'g',
};

function unswap(text: string): string {
  return text.toLowerCase().replace(/[0-9]/g, (d) => SWAPS[d] ?? d);
}

function isRude(nickname: string): boolean {
  const plain = unswap(nickname);
  // "1" also stands for "l" (sh1t vs b1tch both read as i, but "ki11" reads as l).
  const variants = [plain, plain.replace(/i/g, 'l')];
  const squashed = variants.map((v) => v.replace(/_/g, ''));
  if (squashed.some((v) => BLOCKED_INSIDE.some((w) => v.includes(w)))) return true;
  const parts = variants.flatMap((v) => [v.replace(/_/g, ''), ...v.split('_')]);
  return parts.some((p) => BLOCKED_WHOLE.includes(p));
}

// Undefined when the nickname is fine.
export function checkNickname(nickname: string): NicknameError | undefined {
  if (nickname.length < NICKNAME_MIN) return 'too_short';
  if (nickname.length > NICKNAME_MAX) return 'too_long';
  if (!/^[A-Za-z0-9_]+$/.test(nickname)) return 'bad_characters';
  if (isRude(nickname)) return 'not_allowed';
  return undefined;
}
