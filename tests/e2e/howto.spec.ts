// First-visit how-to smoke test (tests/CLAUDE.md, flow 1). Each test starts with empty
// storage; both projects run it (375×812 touch and 1280×800).

import { expect, test } from '@playwright/test';

test('a first visit shows the how-to, which leads to level select and stays dismissed', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('how-to')).toBeVisible();
  await expect(page.getByTestId('how-to')).toContainText('Shorter wins.');
  const scroll = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(scroll).toBeLessThanOrEqual(0);

  await page.getByTestId('how-to-done').click();
  await expect(page).toHaveURL(/#\/levels$/);
  await expect(page.getByTestId('level-select')).toBeVisible();

  await page.reload();
  await expect(page.getByTestId('level-select')).toBeVisible();
  await expect(page.getByTestId('how-to')).toHaveCount(0);
});

test('a first visit through a level link shows the how-to, then that level', async ({ page }) => {
  await page.goto('/#/play/c01');
  await expect(page.getByTestId('how-to')).toBeVisible();
  await page.getByTestId('how-to-done').click();
  await expect(page).toHaveURL(/#\/play\/c01$/);
});

test('a first visit through a locked level link ends on level select', async ({ page }) => {
  await page.goto('/#/play/c05');
  await page.getByTestId('how-to-done').click();
  await expect(page.getByTestId('level-select')).toBeVisible();
  await expect(page).toHaveURL(/#\/levels$/);
});

test('level select links back to the how-to, which returns to level select', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('how-to-done').click();
  await page.getByTestId('how-to-link').click();
  await expect(page.getByTestId('how-to')).toBeVisible();
  await page.getByTestId('how-to-done').click();
  await expect(page.getByTestId('level-select')).toBeVisible();
});
