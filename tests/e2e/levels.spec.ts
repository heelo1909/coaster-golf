// Level select and local progress smoke tests (tests/CLAUDE.md). Each test starts with empty
// storage; both projects run them (375×812 touch and 1280×800).

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { skipHowTo } from './helpers';

test.beforeEach(async ({ page }) => {
  await skipHowTo(page);
});

async function win(page: Page, equation: string): Promise<void> {
  await page.getByTestId('equation-input').fill(equation);
  await page.getByTestId('equation-input').press('Enter');
  await expect(page.getByTestId('result-title')).toContainText('Made it!');
}

test('the site opens on level select with only level 1 open', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('level-select')).toBeVisible();
  await expect(page.locator('[data-testid^="level-c"][data-testid$="-score"]')).toHaveCount(15);
  await expect(page.getByTestId('level-c01')).toBeEnabled();
  await expect(page.getByTestId('level-c02')).toBeDisabled();
  await expect(page.getByTestId('level-c15')).toBeDisabled();
  const scroll = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(scroll).toBeLessThanOrEqual(0);
});

test('beating level 1 unlocks level 2 and shows the best score, also after a reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('level-c01').click();
  await win(page, '0');
  await page.getByTestId('back-to-levels').click();
  await expect(page.getByTestId('level-c01-score')).toHaveText('Best 1 ★');
  await expect(page.getByTestId('level-c02')).toBeEnabled();
  await expect(page.getByTestId('level-c03')).toBeDisabled();

  await page.reload();
  await expect(page.getByTestId('level-c01-score')).toHaveText('Best 1 ★');
  await page.getByTestId('level-c02').click();
  await expect(page.getByTestId('char-counter')).toHaveText('0 chars · par 5');
});

test('a link to a locked level goes to level select; Back returns from a level', async ({
  page,
}) => {
  await page.goto('/#/play/c05');
  await expect(page.getByTestId('level-select')).toBeVisible();
  await expect(page).toHaveURL(/#\/levels$/);

  await page.getByTestId('level-c01').click();
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId('level-select')).toBeVisible();
});

test('a beaten level shows the best equation, and only a shorter win replaces it', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('level-c01').click();
  await expect(page.getByTestId('best-line')).toBeEmpty();
  await win(page, '0*x');
  await expect(page.getByTestId('best-line')).toHaveText('Your best: 0*x · 3 chars');
  await win(page, 'x-x+0');
  await expect(page.getByTestId('best-line')).toHaveText('Your best: 0*x · 3 chars');
  await win(page, '0');
  await expect(page.getByTestId('best-line')).toHaveText('Your best: 0 · 1 char');

  await page.reload();
  await expect(page.getByTestId('best-line')).toHaveText('Your best: 0 · 1 char');
});

test('with storage blocked the game still plays, unlocks for the visit and says it will not save', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });
  });
  await page.goto('/');
  // Nothing can be saved, so the how-to comes first again; it leads to level 1.
  await page.getByTestId('how-to-done').click();
  await page.getByTestId('back-to-levels').click();
  await expect(page.getByTestId('not-saving')).toHaveText(
    "Progress won't be saved in this browser.",
  );
  await page.getByTestId('level-c01').click();
  await win(page, '0');
  await page.getByTestId('next-level').click();
  await expect(page.getByTestId('char-counter')).toHaveText('0 chars · par 5');
  await page.getByTestId('back-to-levels').click();
  await expect(page.getByTestId('level-c01-score')).toHaveText('Best 1 ★');
  await expect(page.getByTestId('not-saving')).toHaveCount(0); // once per visit

  await page.getByTestId('theme-toggle').click();
  await page.getByTestId('theme-paper').click();
  expect(errors).toEqual([]);
});
