// The player's settings: the theme and whether the how-to has been seen; the nickname and
// other settings join in later sections. Stored as { version: 1, theme, seenHowTo } under
// cg:v1:profile.

import { browserStorage, readJson, writeJson } from './store';

export const PROFILE_KEY = 'cg:v1:profile';
const VERSION = 1;

export interface Profile {
  theme?: string; // a theme id; the UI checks it's one it knows
  seenHowTo?: boolean; // true once the first-visit how-to has been dismissed
}

// The saved profile, or an empty one when nothing valid is saved (never throws).
export function loadProfile(storage: Storage | null = browserStorage()): Profile {
  const saved = readJson(storage, PROFILE_KEY);
  if (typeof saved !== 'object' || saved === null) return {};
  const { version, theme, seenHowTo } = saved as {
    version?: unknown;
    theme?: unknown;
    seenHowTo?: unknown;
  };
  if (version !== VERSION) return {};
  const profile: Profile = {};
  if (typeof theme === 'string') profile.theme = theme;
  if (seenHowTo === true) profile.seenHowTo = true;
  return profile;
}

export function saveProfile(profile: Profile, storage: Storage | null = browserStorage()): boolean {
  return writeJson(storage, PROFILE_KEY, { version: VERSION, ...profile });
}
