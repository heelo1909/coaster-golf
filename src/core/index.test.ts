import { describe, expect, it } from 'vitest';
import { CORE_VERSION } from './index';

describe('core', () => {
  it('exposes a version so the game and the worker can check they match', () => {
    expect(CORE_VERSION).toBe(1);
  });
});
