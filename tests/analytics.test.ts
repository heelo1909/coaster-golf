import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { beaconTag } from '../scripts/analytics';

describe('analytics: the Cloudflare beacon only with a token', () => {
  it('adds nothing without a token, so dev, tests and forks report nothing', () => {
    expect(beaconTag(undefined)).toBe('');
    expect(beaconTag('')).toBe('');
  });

  it("adds Cloudflare's beacon with the site's token", () => {
    const token = '0123456789abcdef0123456789abcdef';
    const tag = beaconTag(token);
    expect(tag).toContain('src="https://static.cloudflareinsights.com/beacon.min.js"');
    expect(tag).toContain(`"token": "${token}"`);
  });

  it('refuses a token that could break or inject into the page', () => {
    expect(() => beaconTag('abc')).toThrow();
    expect(() => beaconTag(`0123456789abcdef0123456789abcde'`)).toThrow();
  });

  it('the privacy page says the analytics are there and what they see', () => {
    const privacy = readFileSync('docs/launch/privacy.md', 'utf8').toLowerCase();
    expect(privacy).toContain('cloudflare web analytics');
    expect(privacy).toContain('no cookies');
  });
});
