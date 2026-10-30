// About and Privacy (Section 9): reachable from level select, linked to each other, open on a
// first visit without the how-to, and readable at phone width.

import { expect, test } from '@playwright/test';
import { skipHowTo } from './helpers';

test('level select links to About, which links to Privacy, and Back returns', async ({ page }) => {
  await skipHowTo(page);
  await page.goto('/#/levels');
  await page.getByTestId('about-link').click();
  await expect(page.getByTestId('about')).toContainText('shorter is better');
  await page.getByTestId('about').getByRole('link', { name: 'privacy page' }).click();
  await expect(page).toHaveURL(/#\/privacy$/);
  await expect(page.getByTestId('privacy')).toContainText('no cookies');
  const contact = page.getByRole('link', { name: 'heelo1909@gmail.com' });
  await expect(contact).toHaveAttribute('href', 'mailto:heelo1909@gmail.com');
  await page.getByTestId('doc-back').click();
  await expect(page.getByTestId('level-select')).toBeVisible();
  await page.getByTestId('privacy-link').click();
  await expect(page.getByTestId('privacy')).toBeVisible();
});

test('a privacy link opens straight away on a first visit, with no sideways scroll', async ({
  page,
}) => {
  await page.goto('/#/privacy');
  await expect(page.getByTestId('privacy')).toContainText('13 or older');
  await expect(page.getByTestId('how-to')).toHaveCount(0);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(wide).toBe(false);
});
