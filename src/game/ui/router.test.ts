import { describe, expect, it } from 'vitest';
import { hashOf, parseHash } from './router';

describe('router: the URL hash mirrors the screen', () => {
  it('a level link opens that level', () => {
    expect(parseHash('#/play/c03')).toEqual({ screen: 'play', id: 'c03' });
    expect(parseHash('#/play/c15')).toEqual({ screen: 'play', id: 'c15' });
  });

  it('the daily has its own hash', () => {
    expect(parseHash('#/daily')).toEqual({ screen: 'daily' });
    expect(hashOf({ screen: 'daily' })).toBe('#/daily');
  });

  it('the how-to has its own hash', () => {
    expect(parseHash('#/howto')).toEqual({ screen: 'howto' });
    expect(parseHash('#/howto/')).toEqual({ screen: 'levels' });
  });

  it('the about and privacy pages have their own hashes', () => {
    expect(parseHash('#/about')).toEqual({ screen: 'about' });
    expect(parseHash('#/privacy')).toEqual({ screen: 'privacy' });
    expect(hashOf({ screen: 'privacy' })).toBe('#/privacy');
  });

  it('no hash, the levels hash, or anything unknown shows level select', () => {
    for (const hash of [
      '',
      '#',
      '#/',
      '#/levels',
      '#/play/',
      '#/play/C03',
      '#/play/c03/x',
      '#/nope',
    ]) {
      expect(parseHash(hash)).toEqual({ screen: 'levels' });
    }
  });

  it('every screen reads back from its own hash', () => {
    expect(hashOf({ screen: 'levels' })).toBe('#/levels');
    expect(hashOf({ screen: 'play', id: 'c07' })).toBe('#/play/c07');
    expect(hashOf({ screen: 'howto' })).toBe('#/howto');
    for (const route of [
      { screen: 'levels' } as const,
      { screen: 'howto' } as const,
      { screen: 'play', id: 'c07' } as const,
    ]) {
      expect(parseHash(hashOf(route))).toEqual(route);
    }
  });
});
