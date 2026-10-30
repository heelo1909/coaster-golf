import { describe, expect, it } from 'vitest';
import { PROGRESS_KEY, loadProgress, saveBest } from './progress';

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

describe('progress: best scores are remembered on this device', () => {
  it('saves and loads the best score and equation per level', () => {
    const storage = fakeStorage();
    const after = saveBest(loadProgress(storage), 'c02', 5, '3-x/2', storage);
    expect(after).toEqual({ best: { c02: { score: 5, equation: '3-x/2' } } });
    expect(loadProgress(storage)).toEqual(after);
    expect(JSON.parse(storage.getItem(PROGRESS_KEY)!)).toEqual({
      version: 1,
      best: { c02: { score: 5, equation: '3-x/2' } },
    });
  });

  it('a first visit has no bests', () => {
    expect(loadProgress(fakeStorage())).toEqual({ best: {} });
  });

  it('saveBest keeps the shorter score; a tie keeps the first equation', () => {
    const storage = fakeStorage();
    let progress = saveBest({ best: {} }, 'c05', 8, 'x(8-x)/8', storage);
    progress = saveBest(progress, 'c05', 9, '(8-x)x/8+0', storage);
    expect(progress.best.c05).toEqual({ score: 8, equation: 'x(8-x)/8' });
    progress = saveBest(progress, 'c05', 8, 'x/8*(8-x)', storage);
    expect(progress.best.c05).toEqual({ score: 8, equation: 'x(8-x)/8' });
    saveBest(progress, 'c05', 6, 'x-xx/8', storage);
    expect(loadProgress(storage).best.c05).toEqual({ score: 6, equation: 'x-xx/8' });
  });

  it('other levels are kept when one improves', () => {
    const storage = fakeStorage();
    const progress = saveBest({ best: {} }, 'c01', 1, '0', storage);
    saveBest(progress, 'c02', 5, '3-x/2', storage);
    expect(Object.keys(loadProgress(storage).best)).toEqual(['c01', 'c02']);
  });

  it('blocked storage never throws, and wins still count for this visit', () => {
    expect(loadProgress(blocked)).toEqual({ best: {} });
    expect(loadProgress(null)).toEqual({ best: {} });
    const progress = saveBest({ best: {} }, 'c01', 1, '0', blocked);
    expect(progress.best.c01).toEqual({ score: 1, equation: '0' });
    expect(saveBest(progress, 'c02', 5, '3-x/2', null).best.c02?.score).toBe(5);
  });

  it('corrupt JSON, an unknown version or a wrong shape fall back to no bests', () => {
    for (const raw of [
      '{not json',
      '{"version":2,"best":{"c01":{"score":1,"equation":"0"}}}',
      '"c01"',
      '{"version":1}',
      '{"version":1,"best":null}',
    ]) {
      expect(loadProgress(fakeStorage({ [PROGRESS_KEY]: raw }))).toEqual({ best: {} });
    }
  });

  it('a broken entry is dropped without losing the others', () => {
    const raw = JSON.stringify({
      version: 1,
      best: {
        c01: { score: 1, equation: '0' },
        c02: { score: '5', equation: '3-x/2' },
        c03: { score: 0, equation: 'x' },
        c04: { score: 2.5, equation: 'x' },
        c05: { score: 7, equation: '' },
        c06: null,
      },
    });
    expect(loadProgress(fakeStorage({ [PROGRESS_KEY]: raw }))).toEqual({
      best: { c01: { score: 1, equation: '0' } },
    });
  });
});
