import { defineConfig, devices } from '@playwright/test';
import { BASE_URL } from './e2e/support/env';

/**
 * E2E configuration for the wizard (CLAUDE.md section 4: @playwright/test, no schematics).
 *
 * The tests run against the docker compose stack with the seed (ADR-0002 topology): the `frontend`
 * nginx container serves the Angular build and proxies the read-only content API on one origin;
 * Strapi keeps its own port for the admin panel and for the Node-side test setup. Nothing is
 * mocked, except where a test aborts a request in the browser on purpose (US-01-AC-17).
 *
 * Environment variables are read in e2e/support/env.ts (defaults from the ADR-0002 topology).
 * There is no `webServer` block: the stack is started by `docker compose up`, not by Playwright.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  // One worker, in file order: us-01-config-change adds and removes a published field, which the
  // other files must never see (they assert the exact field list).
  workers: 1,
  fullyParallel: false,
  retries: 0,
  forbidOnly: !!process.env['CI'],
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    locale: 'es-CO',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
