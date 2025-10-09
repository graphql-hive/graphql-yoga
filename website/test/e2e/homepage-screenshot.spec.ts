import { expect, test } from '@playwright/test';

test('homepage above-the-fold renders as expected', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.$eval('#devtools-indicator', el => el?.remove());
  await expect(page).toHaveScreenshot('homepage-above-the-fold.png', { fullPage: false });
});
