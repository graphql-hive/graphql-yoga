/* eslint-disable @typescript-eslint/no-var-requires */
const { resolve } = require('node:path');
const { pathsToModuleNameMapper } = require('ts-jest');
const {
  getGraphQLModuleNameMapper,
  getSelectedGraphQLVersions,
} = require('./scripts/graphql-versions.js');
const CI = !!process.env.CI;

const ROOT_DIR = __dirname;
const TSCONFIG = resolve(ROOT_DIR, 'tsconfig.json');
const tsconfig = require(TSCONFIG);

process.env.LC_ALL = 'en_US';

const nodeMajor = parseInt(process.versions.node.split('.')[0]);

// Every supported graphql-js major is installed side by side through npm aliases, so a single
// install can be tested against all of them. Which ones actually run is decided at runtime, see
// `scripts/graphql-versions.js`.
const graphqlVersions = getSelectedGraphQLVersions();

/**
 * @param {number} graphqlMajor
 * @returns {string[]}
 */
function createTestMatch(graphqlMajor) {
  const testMatch = [];

  if (process.env.INTEGRATION_TEST === 'true') {
    testMatch.push('<rootDir>/**/__integration-tests__/**/?(*.)+(spec|test).[jt]s?(x)');
    if (nodeMajor <= 14) {
      testMatch.push('!**/examples/sveltekit/**', '!**/examples/fastify*/**');
    }
    testMatch.push('!**/examples/bun*/**');
    testMatch.push('**/examples/bun-pothos/__integration-tests__/bun-pothos.spec.ts');
    // hackernews's postinstall skips codegen below Node 22 (`@graphql-codegen/cli`'s `listr2`
    // dependency requires it), so its gitignored generated schema files won't exist there.
    if (nodeMajor < 22) {
      testMatch.push('!**/examples/hackernews/**');
    }
    // apollo federation and sofa don't support graphql 15
    if (graphqlMajor <= 15) {
      testMatch.push('!**/examples/apollo-federation/**');
    }
    // nexus only supports graphql 15.x/16.x (calls `assertValidName`, removed in v17);
    // sveltekit's @envelop/graphql-jit doesn't support v17 yet either.
    if (graphqlMajor >= 17) {
      testMatch.push('!**/examples/sveltekit/**', '!**/examples/file-upload-nexus/**');
    }
  } else {
    testMatch.push(
      '<rootDir>/packages/**/?(*.)+(spec|test).[jt]s?(x)',
      '!**/__integration-tests__/**',
    );
  }

  // Skip for Node 20 and below
  if (nodeMajor <= 20) {
    testMatch.push('!**/nestjs/**');
  }

  if (nodeMajor <= 26 && process.env.LEAKS_TEST) {
    testMatch.push('!**/graphql-scalars.spec.ts');
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
      '!**/newrelic.spec.ts',
      '!**/get-graphql-rate-limiter.spec.ts',
      '!**/sentry.spec.ts',
    );
  }

  testMatch.push('!**/dist/**', '!**/.bob/**');

  return testMatch;
}

/** Projects that bring their own jest config, so they run once instead of per graphql version. */
const standaloneProjects = [];

if (process.env.INTEGRATION_TEST === 'true') {
  // Supports Node 18+ only, so we can ignore it in CI for now
  if (nodeMajor > 18) {
    standaloneProjects.push(
      // Cloudflare plugin tests need very different build settings
      // giving Jest a string as project name will make it rely on jest.config files in the package subfolder
      '<rootDir>/packages/envelop/plugins/response-cache-cloudflare-kv',
    );
  }
}

const tsPathsModuleNameMapper = pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
  prefix: `${ROOT_DIR}/`,
});

const projects = graphqlVersions.map(graphqlVersion => ({
  // `jest --selectProjects graphql-16` runs only that version
  displayName: `graphql-${graphqlVersion.major}`,
  prettierPath: null,
  restoreMocks: true,
  reporters: ['default'],
  modulePathIgnorePatterns: ['dist'],
  moduleNameMapper: {
    // must come first, so `graphql` itself is redirected before the workspace path aliases
    // (`@graphql-yoga/*`, …) get a chance to match
    ...getGraphQLModuleNameMapper(graphqlVersion),
    ...tsPathsModuleNameMapper,
  },
  cacheDirectory: resolve(
    ROOT_DIR,
    `${CI ? '' : 'node_modules/'}.cache/jest/graphql-${graphqlVersion.major}`,
  ),
  testMatch: createTestMatch(graphqlVersion.major),
  testPathIgnorePatterns: ['<rootDir>/packages/envelop/plugins/response-cache-cloudflare-kv'],
  testTimeout: process.env.INTEGRATION_TEST === 'true' ? 10_000 : undefined,
  resolver: 'bob-the-bundler/jest-resolver',
  setupFilesAfterEnv: ['<rootDir>/jest-setup.js'],
}));

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: ROOT_DIR,
  projects: [...projects, ...standaloneProjects],
  reporters: ['default'],
  collectCoverage: false,
};
