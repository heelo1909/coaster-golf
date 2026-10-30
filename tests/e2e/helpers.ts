import type { Page } from '@playwright/test';

// Marks the how-to as seen before the page loads, for tests about other screens. Only when
// nothing is saved yet, so a test's own profile (a theme, say) survives reloads.
export async function skipHowTo(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      if (localStorage.getItem('cg:v1:profile') === null) {
        localStorage.setItem('cg:v1:profile', JSON.stringify({ version: 1, seenHowTo: true }));
      }
    } catch {
      // storage blocked by the test itself
    }
  });
}
