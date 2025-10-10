import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const __dirname = new URL('.', import.meta.url).pathname;

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: resolve(__dirname, 'test/e2e'),
  outputDir: resolve(__dirname, 'test/e2e/output'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
