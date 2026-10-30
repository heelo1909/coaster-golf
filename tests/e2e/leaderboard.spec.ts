// Leaderboard smoke test against the local Worker and D1 (playwright.config.ts starts both).
// Each run uses a fresh nickname, since the local database keeps rows between runs.

import { expect, test } from '@playwright/test';
import { skipHowTo } from './helpers';

test('a win can be submitted, asking for a nickname once, and shows up on the board', async ({
  page,
}, info) => {
  const nickname = `e2e_${info.project.name.slice(0, 1)}${Date.now().toString(36)}`.slice(0, 16);
  await skipHowTo(page);
  await page.goto('/#/play/c01');
  await page.getByTestId('equation-input').fill('0');
  await page.getByTestId('equation-input').press('Enter');
  await page.getByTestId('leaderboard-button').click();

  await expect(page.getByTestId('leaderboard')).toBeVisible();
  await page.getByTestId('nickname-input').fill('a b');
  await expect(page.getByTestId('nickname-hint')).toHaveText('Only letters, numbers and _.');
  await page.getByTestId('nickname-input').fill(nickname);
  await page.getByTestId('nickname-save').click();
  await expect(page.getByTestId('leaderboard-status')).toContainText(/You're #\d+/);
  const mine = page.getByTestId('leaderboard-rows').locator('li[data-mine]');
  await expect(mine).toContainText(nickname);
  await page.getByTestId('leaderboard-close').click();
  await expect(page.getByTestId('leaderboard')).toHaveCount(0);

  // The nickname is remembered: the next board submits straight away.
  await page.getByTestId('equation-input').fill('0*x');
  await page.getByTestId('equation-input').press('Enter');
  await page.getByTestId('leaderboard-button').click();
  await expect(page.getByTestId('leaderboard-status')).toContainText('Your best still stands');
  await expect(page.getByTestId('nickname-input')).toHaveCount(0);
});
