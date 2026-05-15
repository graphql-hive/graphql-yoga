#!/usr/bin/env node

const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

function ensurePlaywrightChromiumInstalled() {
  let executablePath;
  try {
    const { chromium } = require('playwright');
    executablePath = chromium.executablePath();
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code !== 'MODULE_NOT_FOUND') {
      console.warn('Unable to detect existing Playwright Chromium binary. Installing Chromium.');
    }
    executablePath = undefined;
  }

  if (executablePath && fs.existsSync(executablePath)) {
    return;
  }

  const installResult = spawnSync('pnpm', ['exec', 'playwright', 'install', 'chromium'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (installResult.status !== 0) {
    console.error('Failed to install Playwright Chromium binary.');
    process.exit(installResult.status ?? 1);
  }
}

ensurePlaywrightChromiumInstalled();
