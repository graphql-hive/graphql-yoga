const { resolve } = require('path');

const { pathsToModuleNameMapper } = require('ts-jest');

const CI = !!process.env.CI;
const ROOT_DIR = __dirname;
const TSCONFIG = resolve(ROOT_DIR, '../../../', 'tsconfig.json');
const PROJECT_ROOT = resolve(ROOT_DIR, '../../../');
const tsconfig = require(TSCONFIG);

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'miniflare',
  rootDir: ROOT_DIR,
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
    prefix: `${PROJECT_ROOT}/`,
  }),
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  cacheDirectory: resolve(ROOT_DIR, `${CI ? '' : 'node_modules/'}.cache/jest`),
  modulePathIgnorePatterns: ['dist'],
  // Configuration is automatically loaded from `.env`, `package.json` and
  // `wrangler.toml` files by default, but you can pass any additional Miniflare
  // API options here:
  testEnvironmentOptions: {
    wranglerConfigPath: `${resolve(ROOT_DIR)}/wrangler.jest.toml`,
    bindings: { ENVIRONMENT: 'testing' },
  },
  resolver: 'bob-the-bundler/jest-resolver',
};
