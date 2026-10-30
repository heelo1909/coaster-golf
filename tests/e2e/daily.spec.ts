// Daily level smoke tests (tests/CLAUDE.md). The page's clock is faked so the test can cross
// midnight UTC; which daily that is comes from core, so the test doesn't pin the launch date.

import { readFileSync, readdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { dailyLevelIndex, dailyNumber } from '../../src/core';
import type { Level } from '../../src/core';
import { skipHowTo } from './helpers';

// daily[i] is d{i+1}.json (pinned in tests/levels.test.ts); read straight from the files,
// since Playwright's loader can't import JSON modules.
const dir = new URL('../../src/levels/daily/', import.meta.url);
const size = readdirSync(dir).filter((f) => f.endsWith('.json')).length;
const dailyLevel = (k: number): Level =>
  JSON.parse(
    readFileSync(
      new URL(`d${String(dailyLevelIndex(k, size) + 1).padStart(3, '0')}.json`, dir),
      'utf8',
    ),
  ) as Level;

const lateEvening = new Date('2027-03-14T23:59:50Z');
const n = dailyNumber(lateEvening);
const today = dailyLevel(n);
const tomorrow = dailyLevel(n + 1);

test.beforeEach(async ({ page }) => {
  await skipHowTo(page);
  await page.clock.install({ time: lateEvening });
});

test("level select leads to today's daily, which counts down to midnight UTC", async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('daily-card')).toContainText(`#${n}`);
  await expect(page.getByTestId('daily-card')).toContainText(today.name);
  await page.getByTestId('daily-card').click();
  await expect(page).toHaveURL(/#\/daily$/);
  await expect(page.getByTestId('daily-bar')).toContainText(`Daily #${n}`);
  // The faked clock keeps running, so a slow page may already be a second or two in.
  await expect(page.getByTestId('daily-countdown')).toHaveText(/^Next in 00:00:(0\d|10)$/);
  await expect(page.getByTestId('char-counter')).toHaveText(`0 chars · par ${today.par}`);
});

test('solving the daily saves the best and starts a streak; the new day keeps it', async ({
  page,
}) => {
  await page.goto('/#/daily');
  await page.getByTestId('equation-input').fill(today.reference);
  await page.getByTestId('equation-input').press('Enter');
  await expect(page.getByTestId('result-title')).toContainText('Made it!');
  await expect(page.getByTestId('next-level')).toHaveCount(0);
  await expect(page.getByTestId('daily-streak')).toHaveText('🔥 1-day streak');
  await expect(page.getByTestId('best-line')).toContainText(today.reference);

  await page.reload();
  await expect(page.getByTestId('daily-streak')).toHaveText('🔥 1-day streak');
  await expect(page.getByTestId('best-line')).toContainText(today.reference);

  // Midnight UTC passes while the page is open.
  await page.clock.runFor(15_000);
  await page.getByTestId('daily-new').click();
  await expect(page.getByTestId('daily-bar')).toContainText(`Daily #${n + 1}`);
  await expect(page.getByTestId('char-counter')).toHaveText(`0 chars · par ${tomorrow.par}`);
  await expect(page.getByTestId('best-line')).toBeEmpty();
  await expect(page.getByTestId('daily-streak')).toHaveText('🔥 1-day streak');
});

// Records what the page shares or copies instead of touching the real clipboard or share sheet.
async function recordSharing(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { shared: string[] };
    w.shared = [];
    const record = async (text: string): Promise<void> => void w.shared.push(text);
    Object.defineProperty(navigator, 'share', {
      value: async ({ text }: { text: string }) => record(text),
    });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: record } });
  });
}

test('Share gives the score, par and streak but never the equation', async ({ page }, info) => {
  await recordSharing(page);
  await page.goto('/#/daily');
  await page.getByTestId('daily-share').click();
  await page.getByTestId('equation-input').fill(today.reference);
  await page.getByTestId('equation-input').press('Enter');
  await expect(page.getByTestId('result-title')).toContainText('Made it!');
  await page.getByTestId('share-button').click();
  if (info.project.name === 'desktop')
    await expect(page.getByTestId('share-button')).toHaveText('Copied!');

  const shared = await page.evaluate(() => (window as unknown as { shared: string[] }).shared);
  expect(shared).toHaveLength(2);
  expect(shared[0]).toBe(`Coaster Golf #${n} 🎢 — not yet! 💥\ncoastergolf.example`);
  const chars = today.reference.length;
  expect(shared[1]).toBe(
    [
      `Coaster Golf #${n} 🎢`,
      `${chars === 1 ? '1 char' : `${chars} chars`} (par ${today.par}) ⛳`,
      '🔥 1-day streak',
      'coastergolf.example',
    ].join('\n'),
  );
  for (const text of shared) expect(text).not.toContain(today.reference);
});
