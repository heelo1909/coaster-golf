// The player's settings: the theme, whether the how-to has been seen, the nickname and whether
// sound is muted. Stored as { version: 1, theme, seenHowTo, nickname, muted } under
// cg:v1:profile.

import { checkNickname } from '../../core';
import { browserStorage, readJson, writeJson } from './store';

export const PROFILE_KEY = 'cg:v1:profile';
const VERSION = 1;

export interface Profile {
  theme?: string; // a theme id; the UI checks it's one it knows
  seenHowTo?: boolean; // true once the first-visit how-to has been dismissed
  nickname?: string; // for leaderboards, chosen once; the only thing a player tells us
  muted?: boolean; // true once the player turns sound off
}

// The saved profile, or an empty one when nothing valid is saved (never throws).
export function loadProfile(storage: Storage | null = browserStorage()): Profile {
  const saved = readJson(storage, PROFILE_KEY);
  if (typeof saved !== 'object' || saved === null) return {};
  const { version, theme, seenHowTo } = saved as {
    version?: unknown;
    theme?: unknown;
    seenHowTo?: unknown;
    nickname?: unknown;
  };
  if (version !== VERSION) return {};
  const profile: Profile = {};
  if (typeof theme === 'string') profile.theme = theme;
  if (seenHowTo === true) profile.seenHowTo = true;
  if ((saved as { muted?: unknown }).muted === true) profile.muted = true;
  const { nickname } = saved as { nickname?: unknown };
  if (typeof nickname === 'string' && checkNickname(nickname) === undefined)
    profile.nickname = nickname;
  return profile;
}

export function saveProfile(profile: Profile, storage: Storage | null = browserStorage()): boolean {
  return writeJson(storage, PROFILE_KEY, { version: VERSION, ...profile });
}
