import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import { beaconTag } from './scripts/analytics';

export default defineConfig(({ mode }) => ({
  // '/' for Cloudflare; the GitHub Pages workflow builds with BASE_PATH=/coaster-golf/.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    {
      // Cookie-free analytics in the built page, only when a token is set (scripts/analytics.ts).
      name: 'cf-web-analytics',
      apply: 'build',
      transformIndexHtml: (html: string) =>
        html.replace(
          '</head>',
          `${beaconTag(loadEnv(mode, process.cwd(), 'VITE_').VITE_CF_BEACON_TOKEN)}</head>`,
        ),
    },
  ],
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts', 'worker/test/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
}));
