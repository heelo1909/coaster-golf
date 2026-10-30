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
  await expect(page.getByTestId('daily-countdown')).toHaveText('Next in 00:00:10');
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
