/* eslint-disable @typescript-eslint/no-var-requires */
const { resolve } = require('node:path');
const { pathsToModuleNameMapper } = require('ts-jest');
const CI = !!process.env.CI;

const ROOT_DIR = __dirname;
const TSCONFIG = resolve(ROOT_DIR, 'tsconfig.json');
const tsconfig = require(TSCONFIG);

process.env.LC_ALL = 'en_US';

const testMatch = [];

const projects = [];

let testTimeout = undefined;

if (process.env.INTEGRATION_TEST === 'true') {
  testTimeout = 10_000;
  testMatch.push('<rootDir>/**/__integration-tests__/**/?(*.)+(spec|test).[jt]s?(x)');
  if (parseInt(process.versions.node.split('.')[0]) <= 14) {
    testMatch.push('!**/examples/sveltekit/**', '!**/examples/fastify*/**');
  }
  testMatch.push('!**/examples/bun*/**');
  testMatch.push('**/examples/bun-pothos/__integration-tests__/bun-pothos.spec.ts');
  // Supports Node 18+ only, so we can ignore it in CI for now
  if (process.versions.node.split('.')[0] > 18) {
    projects.push(
      // Cloudflare plugin tests need very different build settings
      // giving Jest a string as project name will make it rely on jest.config files in the package subfolder
      '<rootDir>/packages/envelop/plugins/response-cache-cloudflare-kv',
    );
  }
} else {
  testMatch.push(
    '<rootDir>/packages/**/?(*.)+(spec|test).[jt]s?(x)',
    '!**/__integration-tests__/**',
  );
}

// Skip for Node 18 and below
if (parseInt(process.versions.node.split('.')[0]) <= 20) {
  testMatch.push('!**/nestjs/**');
}

projects.unshift({
  prettierPath: null,
  restoreMocks: true,
  reporters: ['default'],
  modulePathIgnorePatterns: ['dist'],
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
    prefix: `${ROOT_DIR}/`,
  }),
  cacheDirectory: resolve(ROOT_DIR, `${CI ? '' : 'node_modules/'}.cache/jest`),
  testMatch,
  testPathIgnorePatterns: ['<rootDir>/packages/envelop/plugins/response-cache-cloudflare-kv'],
  testTimeout,
  resolver: 'bob-the-bundler/jest-resolver',
  setupFilesAfterEnv: ['<rootDir>/jest-setup.js'],
});

// tests that leak due to external dependencies
if (process.env.LEAKS_TEST === 'true') {
  testMatch.push(
    '!**/hackernews.spec.ts',
    '!**/apollo-link.spec.ts',
    '!**/urql-exchange.spec.ts',
    '!**/apollo-link.spec.ts',
    '!**/uwebsockets.test.ts',
    '!**/apollo-client.test.ts',
    '!**/browser.spec.ts',
    '!**/egg.spec.ts',
    '!**/sveltekit.spec.ts',
    '!**/newrelic.spec.ts',
    '!**/get-graphql-rate-limiter.spec.ts',
    '!**/sentry.spec.ts',
  );
}

testMatch.push('!**/dist/**', '!**/.bob/**');

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: ROOT_DIR,
  projects,
  reporters: ['default'],
  collectCoverage: false,
};
