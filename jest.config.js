import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CI = !!process.env.CI;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = __dirname;

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
    '!**/tests_ignored/**',
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
    '!**/sentry.spec.ts',
    '!**/get-graphql-rate-limiter.spec.ts',
    '!**/newrelic.spec.ts',
  );
}

testMatch.push('!**/dist/**', '!**/.bob/**');

export default {
  prettierPath: null,
  testEnvironment: 'node',
  rootDir: ROOT_DIR,
  restoreMocks: true,
  reporters: ['default'],
  modulePathIgnorePatterns: ['dist'],
  transformIgnorePatterns: ['node_modules/(?!(package-up|find-up-simple)/)'],
  moduleNameMapper: {
    // graphql-yoga main package
    '^graphql-yoga$': `${ROOT_DIR}/packages/graphql-yoga/src/index.ts`,
    // @graphql-yoga plugins (in packages/plugins/)
    '^@graphql-yoga/plugin-([^/]+)$': [
      `${ROOT_DIR}/packages/plugins/$1/src/index.ts`,
      `${ROOT_DIR}/packages/plugins/$1/yoga/src/index.ts`,
    ],
    // @graphql-yoga/redis-event-target is in packages/event-target/
    '^@graphql-yoga/redis-event-target$': `${ROOT_DIR}/packages/event-target/redis-event-target/src/index.ts`,
    // @graphql-yoga/* - covers other packages under packages/
    '^@graphql-yoga/(.*)$': `${ROOT_DIR}/packages/$1/src/index.ts`,
    // @envelop/testing is in packages/testing/ (not under packages/envelop/) - put before general pattern
    '^@envelop/testing$': `${ROOT_DIR}/packages/testing/src/index.ts`,
    // @envelop/* - covers envelop core packages and plugins with envelop source
    '^@envelop/(?!instrumentation$)(.*)$': [
      `${ROOT_DIR}/packages/envelop/$1/src/index.ts`,
      `${ROOT_DIR}/packages/plugins/$1/src/index.ts`,
      `${ROOT_DIR}/packages/plugins/$1/envelop/src/index.ts`,
    ],
    // Remove .js extension from imports
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverage: false,
  cacheDirectory: resolve(ROOT_DIR, `${CI ? '' : 'node_modules/'}.cache/jest`),
  testMatch,
  testTimeout
};
