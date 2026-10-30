import { describe, expect, it } from 'vitest';
import { DAILY_KEY, loadDaily, saveDailyWin } from './daily';
import type { DailySave } from './daily';

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

const fresh = (): DailySave => ({ best: {}, streak: { current: 0, best: 0, lastPlayed: null } });

describe('daily saves: bests and the streak are remembered on this device', () => {
  it('saves and loads the best and the streak', () => {
    const storage = fakeStorage();
    const after = saveDailyWin(loadDaily(storage), 12, 7, '|x-2|-x', storage);
    expect(after).toEqual({
      best: { 12: { score: 7, equation: '|x-2|-x' } },
      streak: { current: 1, best: 1, lastPlayed: 12 },
    });
    expect(loadDaily(storage)).toEqual(after);
    expect(JSON.parse(storage.getItem(DAILY_KEY)!)).toEqual({ version: 1, ...after });
  });

  it('a first visit has no bests and no streak', () => {
    expect(loadDaily(fakeStorage())).toEqual(fresh());
  });

  it('solving on following days grows the streak; a second solve the same day does not', () => {
    const storage = fakeStorage();
    let save = saveDailyWin(fresh(), 12, 7, 'a', storage);
    save = saveDailyWin(save, 13, 5, 'b', storage);
    save = saveDailyWin(save, 13, 4, 'c', storage);
    expect(save.streak).toEqual({ current: 2, best: 2, lastPlayed: 13 });
    expect(loadDaily(storage).streak).toEqual({ current: 2, best: 2, lastPlayed: 13 });
    expect(loadDaily(storage).best[13]).toEqual({ score: 4, equation: 'c' });
  });

  it('keeps the shorter score for a day; a longer or equal one is ignored', () => {
    const storage = fakeStorage();
    let save = saveDailyWin(fresh(), 12, 7, 'first', storage);
    save = saveDailyWin(save, 12, 9, 'longer', storage);
    save = saveDailyWin(save, 12, 7, 'tie', storage);
    expect(save.best[12]).toEqual({ score: 7, equation: 'first' });
    expect(loadDaily(storage).best[12]).toEqual({ score: 7, equation: 'first' });
  });

  it('blocked storage never throws, and a solve still counts for this visit', () => {
    expect(loadDaily(blocked)).toEqual(fresh());
    expect(loadDaily(null)).toEqual(fresh());
    const save = saveDailyWin(fresh(), 12, 7, 'x', blocked);
    expect(save.streak.current).toBe(1);
    expect(saveDailyWin(save, 13, 7, 'x', null).streak.current).toBe(2);
  });

  it('corrupt JSON, an unknown version or a wrong shape fall back to nothing saved', () => {
    for (const raw of ['{not json', '{"version":2,"best":{},"streak":null}', '[]', '7']) {
      expect(loadDaily(fakeStorage({ [DAILY_KEY]: raw }))).toEqual(fresh());
    }
  });

  it('a broken best or streak is dropped without losing the rest', () => {
    const raw = JSON.stringify({
      version: 1,
      best: {
        12: { score: 7, equation: 'x' },
        13: { score: -1, equation: 'x' },
        abc: { score: 3, equation: 'x' },
      },
      streak: { current: 5, best: 2, lastPlayed: 12 },
    });
    expect(loadDaily(fakeStorage({ [DAILY_KEY]: raw }))).toEqual({
      best: { 12: { score: 7, equation: 'x' } },
      streak: { current: 0, best: 0, lastPlayed: null },
    });
  });
});
