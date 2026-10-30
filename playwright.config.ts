import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  webServer: [
    {
      command: 'npm run dev -- --port 5199 --strictPort',
      url: 'http://localhost:5199',
      reuseExistingServer: true,
    },
    {
      // The leaderboard Worker on a local D1 (worker/CLAUDE.md), which the dev build calls.
      command: 'npm run worker:db && npm run worker:dev -- --port 8787',
      url: 'http://localhost:8787/leaderboard?level=c01',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  use: { baseURL: 'http://localhost:5199' },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'], viewport: { width: 375, height: 812 } } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
  ],
});
