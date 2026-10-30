import { describe, expect, it } from 'vitest';
import { PROFILE_KEY, loadProfile, saveProfile } from './profile';

// A tiny in-memory Storage, as the storage harness asks.
function fakeStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

// Storage that throws on every call, like a blocked or full one.
const blocked = new Proxy({} as Storage, {
  get() {
    throw new Error('storage blocked');
  },
});

describe('profile: the chosen theme is remembered on this device', () => {
  it('saves and loads the theme', () => {
    const storage = fakeStorage();
    expect(saveProfile({ theme: 'paper' }, storage)).toBe(true);
    expect(loadProfile(storage)).toEqual({ theme: 'paper' });
    expect(JSON.parse(storage.getItem(PROFILE_KEY)!)).toEqual({ version: 1, theme: 'paper' });
  });

  it('a first visit has no saved theme', () => {
    expect(loadProfile(fakeStorage())).toEqual({});
  });

  it('blocked storage never throws: nothing loads and the save reports failure', () => {
    expect(loadProfile(blocked)).toEqual({});
    expect(saveProfile({ theme: 'paper' }, blocked)).toBe(false);
    expect(loadProfile(null)).toEqual({});
    expect(saveProfile({ theme: 'paper' }, null)).toBe(false);
  });

  it('corrupt JSON, an unknown version or a wrong shape fall back to defaults', () => {
    expect(loadProfile(fakeStorage({ [PROFILE_KEY]: '{not json' }))).toEqual({});
    expect(loadProfile(fakeStorage({ [PROFILE_KEY]: '{"version":2,"theme":"paper"}' }))).toEqual(
      {},
    );
    expect(loadProfile(fakeStorage({ [PROFILE_KEY]: '"paper"' }))).toEqual({});
    expect(loadProfile(fakeStorage({ [PROFILE_KEY]: '{"version":1,"theme":7}' }))).toEqual({});
  });
});
