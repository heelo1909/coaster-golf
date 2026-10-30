import { describe, expect, it } from 'vitest';
import { storageWorks } from './store';

describe('store: the game can tell when saves will not stick', () => {
  it('working storage passes the check and is left as it was', () => {
    const data = new Map<string, string>();
    const storage = {
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    } as Storage;
    expect(storageWorks(storage)).toBe(true);
    expect(data.size).toBe(0);
  });

  it('missing, blocked or full storage fails the check without throwing', () => {
    const full = {
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {},
    } as unknown as Storage;
    const blocked = new Proxy({} as Storage, {
      get() {
        throw new Error('storage blocked');
      },
    });
    expect(storageWorks(null)).toBe(false);
    expect(storageWorks(full)).toBe(false);
    expect(storageWorks(blocked)).toBe(false);
  });
});
