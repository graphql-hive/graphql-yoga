const tseslintParser = require('@typescript-eslint/parser');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    ignores: [
      // Files from old .eslintignore
      'packages/graphql-yoga/src/landing-page-html.ts',
      'packages/graphql-yoga/src/graphiql-html.ts',
      '.tool-versions',
      '**/generated/**',
      '**/*.generated.*',
      'examples/apollo-federation-compatibility/src/resolvers-types.ts',
      '**/.bob',
      '**/.svelte-kit',
      '*.js',
      // Standard ignores
      'packages/render-graphiql/src/graphiql.ts',
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.yarn/**',
      '**/.cache/**',
      '**/coverage/**',
      '**/pnpm-lock.yaml',
      '**/yarn.lock',
      '**/package-lock.json',
      '.*',
      '!.eslintrc.json',
      // Examples have their own dependencies that may not be installed
      'examples/**',
      // Deno uses different module system
      'examples/deno/**',
      // Bun examples use bun-specific imports
      'examples/bun*/**',
      // Egg examples use egg-specific imports
      'examples/egg/**',
      // AWS CDK examples have external dependencies
      'examples/aws-lambda/**',
      // Azure functions have external dependencies
      'examples/azure-function/**',
      // Integration tests have external dependencies
      'integration-tests/**',
      // TSDown config files use tsdown as devDependency
      '**/tsdown.config.ts',
      // Generated Next.js files
      'website/.next/**',
      // Prettier config
      'prettier.config.mjs',
      // Scripts with node-specific rules
      'scripts/**',
      // Render graphiql generates the file at build time
      'packages/render-graphiql/src/index.ts',
    ],
  },
  {
    files: ['**/*.{ts,tsx,js,jsx,cjs,mjs}'],
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      import: require('eslint-plugin-import').fixupPluginRules || require('eslint-plugin-import'),
    },
    languageOptions: {
      parser: tseslintParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
    rules: {
      // TypeScript ESLint (non-type-aware rules)
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/prefer-namespace-keyword': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
      '@typescript-eslint/typedef': 'off',
      // Import
      'import/default': 'error',
      'import/export': 'error',
      'import/exports-last': 'off',
      'import/extensions': 'off',
      'import/first': 'error',
      'import/group-exports': 'off',
      'import/max-dependencies': 'off',
      'import/named': 'off', // Can have false positives
      'import/namespace': 'error',
      'import/newline-after-import': 'error',
      'import/no-absolute-path': 'error',
      'import/no-amd': 'error',
      'import/no-anonymous-default-export': 'off',
      'import/no-commonjs': 'off',
      'import/no-cycle': 'error',
      'import/no-default-export': 'off',
      'import/no-deprecated': 'off',
      'import/no-duplicates': 'error',
      'import/no-dynamic-require': 'off',
      'import/no-extraneous-dependencies': 'error',
      'import/no-import-module-exports': 'off',
      'import/no-internal-modules': 'off',
      'import/no-mutable-exports': 'error',
      'import/no-named-as-default': 'off',
      'import/no-named-as-default-member': 'error',
      'import/no-namespace': 'off',
      'import/no-nodejs-modules': 'off',
      'import/no-relative-packages': 'off',
      'import/no-restricted-paths': 'off',
      'import/no-self-import': 'error',
      'import/no-unassigned-import': 'off',
      'import/no-unresolved': 'error',
      'import/no-unused-modules': 'off',
      'import/no-useless-path-segments': 'error',
      'import/order': 'error',
      'import/prefer-default-export': 'off',
      // Custom rules
      'import/no-default-export': 'off',
      'no-console': 'off',
      // Disable rules that reference missing plugins
      'n/no-process-exit': 'off',
      'unicorn/no-negated-condition': 'off',
    },
  },
  {
    files: ['**/*.d.{ts,tsx}'],
    rules: {
      'no-var': 'off',
    },
  },
  {
    files: ['vite.config.ts', 'jest.config.js', 'tsup.config.ts', 'prettier.config.js'],
    rules: {
      'import/no-default-export': 'off',
    },
  },
  {
    files: [
      'jest.config.js',
      'webpack.config.js',
      'babel.config.js',
      'rollup.config.js',
      '*.config.cjs',
    ],
    languageOptions: {
      globals: {
        node: true,
      },
    },
    rules: {
      'import/newline-after-import': 'off',
    },
  },
  {
    files: ['packages/graphql-yoga/src/plugins/**/*.ts'],
  },
  {
    files: ['website/**/*.{ts,js,tsx}'],
    rules: {
      'import/no-default-export': 'off',
      'import/extensions': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
      'import/no-extraneous-dependencies': 'off',
      'import/no-mutable-exports': 'off',
      'import/no-unresolved': 'off',
      'import/order': 'off',
    },
  },
  {
    files: [
      'packages/**/tests/**',
      'packages/**/__tests__/**',
      'packages/**/*.spec.ts',
      'packages/**/*.test.ts',
    ],
    languageOptions: {
      globals: {
        jest: true,
      },
    },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      'import/extensions': 'off',
      'import/order': 'off',
      'import/no-extraneous-dependencies': 'off',
      'no-restricted-imports': 'off',
      'import/named': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-namespace': 'off',
    },
  },
  {
    files: ['e2e/**'],
    languageOptions: {
      globals: {
        jest: true,
      },
    },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      'import/extensions': 'off',
      'import/order': 'off',
      'import/no-extraneous-dependencies': 'off',
      'no-restricted-imports': 'off',
      'import/named': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['packages/graphiql/**', 'packages/render-graphiql/**'],
    rules: {
      'import/extensions': 'off',
      'import/no-default-export': 'off',
      'import/no-unresolved': 'off',
    },
  },
  {
    files: ['packages/**/*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'graphql',
              importNames: ['execute', 'subscribe', 'graphql', 'executeSync', 'graphqlSync'],
              message: 'Please use `normalizedExecutor` from `@graphql-tools/executor` instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'packages/**/tests/**',
      'packages/**/__tests__/**',
      'packages/**/*.spec.ts',
      'packages/**/*.test.ts',
      'e2e/**',
      'packages/testing/**',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['*.{spec,test}.*'],
    rules: {
      'import/extensions': ['error', 'never'],
    },
  },
  {
    files: ['scripts/**/*.{js,ts}'],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
];
