#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function resolvePlaywrightCacheDir() {
  const customBrowsersPath = process.env['PLAYWRIGHT_BROWSERS_PATH'];
  if (customBrowsersPath && customBrowsersPath !== '0') {
    return customBrowsersPath;
  }

  if (process.platform === 'win32') {
    const localAppData = process.env['LOCALAPPDATA'] || path.join(os.homedir(), 'AppData', 'Local');
    return path.join(localAppData, 'ms-playwright');
  }

  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright');
  }

  return path.join(os.homedir(), '.cache', 'ms-playwright');
}

function ensurePlaywrightChromiumInstalled() {
  const playwrightCacheDir = resolvePlaywrightCacheDir();
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
    ['npx', ['playwright', 'install', 'chromium']],
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
