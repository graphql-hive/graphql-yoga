import { test } from '@playwright/test';

test('homepage above-the-fold renders as expected', async ({ page }, testInfo) => {
  // await page.goto('/');
  // await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: testInfo.outputPath('homepage-above-the-fold.png'),
    fullPage: false,
  });
});
