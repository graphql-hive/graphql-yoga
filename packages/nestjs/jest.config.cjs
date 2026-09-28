const { resolve } = require('path');
// eslint-disable-next-line import/no-extraneous-dependencies
const { pathsToModuleNameMapper } = require('ts-jest');

const CI = !!process.env.CI;
const ROOT_DIR = __dirname;
const PROJECT_ROOT = resolve(ROOT_DIR, '../../');
const TSCONFIG = resolve(PROJECT_ROOT, 'tsconfig.json');
const tsconfig = require(TSCONFIG);

const moduleNameMapper = pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
  prefix: `${PROJECT_ROOT}/`,
});
// `graphql`/`graphql/*` are pinned in tsconfig's `paths` to a single canonical declaration file,
// working around a TypeScript dual CJS/ESM declaration hazard (see tsconfig.json) - but that
// points at a `.d.ts` file, which isn't valid runtime JS. Drop these so `graphql` resolves
// normally through node module resolution instead.
delete moduleNameMapper['^graphql$'];
delete moduleNameMapper['^graphql/(.*)$'];

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: ROOT_DIR,
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper,
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  cacheDirectory: resolve(ROOT_DIR, `${CI ? '' : 'node_modules/'}.cache/jest`),
  testMatch: ['<rootDir>/__tests__/**/?(*.)+(spec|test).ts'],
  modulePathIgnorePatterns: ['dist'],
  resolver: 'bob-the-bundler/jest-resolver',
  setupFilesAfterEnv: [resolve(PROJECT_ROOT, 'jest-setup.js')],
};
