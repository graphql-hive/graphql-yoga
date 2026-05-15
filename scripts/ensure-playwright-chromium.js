#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function ensurePlaywrightChromiumInstalled() {
  const playwrightCacheDir = path.join(os.homedir(), '.cache', 'ms-playwright');
  const playwrightCacheEntries = fs.existsSync(playwrightCacheDir)
    ? fs.readdirSync(playwrightCacheDir)
    : [];
  const hasChromiumBrowser = playwrightCacheEntries.some(entry => entry.startsWith('chromium-'));
  const hasChromiumHeadlessShell = playwrightCacheEntries.some(entry =>
    entry.startsWith('chromium_headless_shell-'),
  );

  if (hasChromiumBrowser && hasChromiumHeadlessShell) {
    return;
  }

  const installCommands = [
    ['pnpm', ['exec', 'playwright', 'install', 'chromium']],
    ['corepack', ['pnpm', 'exec', 'playwright', 'install', 'chromium']],
  ];

  let installSucceeded = false;
  for (const [command, args] of installCommands) {
    const installResult = spawnSync(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    if (installResult.status === 0) {
      installSucceeded = true;
      break;
    }
  }

  if (!installSucceeded) {
    console.error('Failed to install Playwright Chromium binary.');
    process.exit(1);
  }
}

ensurePlaywrightChromiumInstalled();
