import { describe, expect, it } from 'vitest';
import { checkNickname } from './nickname';

describe('nicknames: 3–16 letters, digits or underscores, and not rude', () => {
  it('accepts ordinary nicknames', () => {
    for (const name of ['ada', 'Ada_Lovelace', 'x2y', 'coaster_fan_99', 'ABCDEFGHIJKLMNOP']) {
      expect(checkNickname(name), name).toBeUndefined();
    }
  });

  it('needs 3 to 16 characters', () => {
    expect(checkNickname('')).toBe('too_short');
    expect(checkNickname('ab')).toBe('too_short');
    expect(checkNickname('a'.repeat(17))).toBe('too_long');
  });

  it('allows only letters, digits and underscores (no spaces, emails or emoji)', () => {
    for (const name of ['ada lovelace', 'ada@mail.com', 'ada-l', 'adà', 'ada🎢', "ada's"]) {
      expect(checkNickname(name), name).toBe('bad_characters');
    }
  });

  it('rejects rude words, also with capitals, underscores or letter swaps', () => {
    for (const name of [
      'fuck',
      'FuckYou',
      'f_u_c_k',
      'sh1t_head',
      '5h17',
      'b1tch',
      'c0ck',
      'p0rn_star',
      'dickhead',
    ]) {
      expect(checkNickname(name), name).toBe('not_allowed');
    }
  });

  it('rejects short rude words only as a whole name or a whole part', () => {
    for (const name of ['ass', 'a55', 'big_ass', 'tits', 'sex_god']) {
      expect(checkNickname(name), name).toBe('not_allowed');
    }
  });

  // Known and accepted: a long root inside a real name still trips the filter (Hancock,
  // Dickens), as basic filters do. The player picks another nickname.
  it('blocks a long root even inside a name, a known trade-off', () => {
    expect(checkNickname('Hancock')).toBe('not_allowed');
  });

  it("doesn't reject ordinary words that contain a short one", () => {
    for (const name of ['classic', 'Cassie', 'title_fan', 'cucumber', 'Essex', 'pooja']) {
      expect(checkNickname(name), name).toBeUndefined();
    }
  });
});
