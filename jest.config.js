/* eslint-disable @typescript-eslint/no-var-requires */
const { resolve } = require('node:path');
const { pathsToModuleNameMapper } = require('ts-jest');
const CI = !!process.env.CI;

const ROOT_DIR = __dirname;
const TSCONFIG = resolve(ROOT_DIR, 'tsconfig.json');
const tsconfig = require(TSCONFIG);

process.env.LC_ALL = 'en_US';

const testMatch = [];

let testTimeout = undefined;

if (process.env.INTEGRATION_TEST === 'true') {
  testTimeout = 10_000;
  testMatch.push('<rootDir>/**/__integration-tests__/**/?(*.)+(spec|test).[jt]s?(x)');
  if (parseInt(process.versions.node.split('.')[0]) <= 14) {
    testMatch.push('!**/examples/sveltekit/**', '!**/examples/fastify*/**');
  }
  testMatch.push('!**/examples/bun*/**');
  testMatch.push('**/examples/bun-pothos/__integration-tests__/bun-pothos.spec.ts');
} else {
  testMatch.push(
    '<rootDir>/packages/**/?(*.)+(spec|test).[jt]s?(x)',
    '!**/__integration-tests__/**',
  );
}

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
  );
}

testMatch.push('!**/dist/**', '!**/.bob/**');

module.exports = {
  prettierPath: null,
  testEnvironment: 'node',
  rootDir: ROOT_DIR,
  restoreMocks: true,
  reporters: ['default'],
  modulePathIgnorePatterns: ['dist'],
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
    prefix: `${ROOT_DIR}/`,
  }),
  collectCoverage: false,
  cacheDirectory: resolve(ROOT_DIR, `${CI ? '' : 'node_modules/'}.cache/jest`),
  testMatch,
  testTimeout,
  resolver: 'bob-the-bundler/jest-resolver',
};
