#!/usr/bin/env node

const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

function ensurePlaywrightChromiumInstalled() {
  let executablePath;
  try {
    const { chromium } = require('playwright');
    executablePath = chromium.executablePath();
  } catch {
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
    process.exit(installResult.status ?? 1);
  }
}

ensurePlaywrightChromiumInstalled();
