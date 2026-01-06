import { defineConfig, type UserConfig } from 'tsdown';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

interface PackageJson {
  name: string;
  buildOptions?: {
    input?: string;
  };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  bob?: boolean;
  'tsdown'?: Record<string, unknown>;
}

// Full list of packages to build
const PACKAGE_DIRS = [
  'packages/envelop/types',
  'packages/envelop/instrumentation',
  'packages/envelop/core',
  'packages/event-target/typed-event-target',
  'packages/plugins/graphql-middleware',
  'packages/plugins/graphql-modules',
  'packages/plugins/graphql-jit',
  'packages/plugins/live-query',
  'packages/plugins/dataloader',
  'packages/plugins/depth-limit',
  'packages/plugins/filter-operation-type',
  'packages/plugins/fragment-arguments',
  'packages/plugins/generic-auth',
  'packages/plugins/immediate-introspection',
  'packages/plugins/parser-cache',
  'packages/plugins/validation-cache',
  'packages/plugins/extended-validation',
  'packages/plugins/execute-subscription-event',
  'packages/plugins/rate-limiter',
  'packages/plugins/resource-limitations',
  'packages/plugins/response-cache/envelop',
  'packages/plugins/response-cache-cloudflare-kv',
  'packages/plugins/response-cache-redis',
  'packages/plugins/persisted-operations/envelop',
  'packages/plugins/preload-assets',
  'packages/plugins/prometheus/envelop',
  'packages/plugins/on-resolve',
  'packages/plugins/opentelemetry',
  'packages/plugins/operation-field-permissions',
  'packages/plugins/sentry',
  'packages/plugins/statsd',
  'packages/plugins/auth0',
  'packages/plugins/apollo-tracing',
  'packages/plugins/apollo-server-errors',
  'packages/plugins/apollo-datasources',
  'packages/plugins/apollo-federation',
  'packages/plugins/newrelic',
  'packages/client/apollo-link',
  'packages/client/urql-exchange',
  'packages/render-graphiql',
  'packages/render-apollo-sandbox',
  'packages/graphql-yoga',
  'packages/plugins/apollo-managed-federation',
  'packages/plugins/response-cache/yoga',
  'packages/plugins/sofa',
  'packages/testing',
];

// Generate tsdown config for a single package
function generatePackageConfig(packagePath: string) {
  const packageJsonPath = path.join(ROOT, packagePath, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as PackageJson;
  
  // Skip packages with bob: false
  if (packageJson.bob === false) {
    return null;
  }
  
  // Skip packages without buildOptions
  if (!packageJson.buildOptions?.input) {
    return null;
  }
  
  return {
    ...packageJson['tsdown'],
    name: packageJson.name,
    entry: path.join(ROOT, packagePath, packageJson.buildOptions.input),
    outDir: path.join(ROOT, packagePath, 'dist'),
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: false,
    minify: false,
    platform: 'node',
    target: 'es2022',
    external: [
      ...Object.keys(packageJson.dependencies || {}),
      ...Object.keys(packageJson.peerDependencies || {}),
      'typescript',
      'tslib',
    ],
  } as UserConfig;
}

// Collect all packages to build
const configs = PACKAGE_DIRS
  .map(dir => generatePackageConfig(dir))
  .filter((config): config is NonNullable<typeof config> => config !== null);

export default defineConfig(configs);
