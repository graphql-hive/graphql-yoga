import * as path from 'node:path';
import { defineConfig } from 'vite';
import $monacoEditorPlugin from 'vite-plugin-monaco-editor';

const monacoEditorPlugin: typeof $monacoEditorPlugin =
  // @ts-expect-error - We need to do this because the plugin is a CJS module
  $monacoEditorPlugin.default ?? $monacoEditorPlugin;

// https://vitejs.dev/config/
export default defineConfig({
  // TODO: Is this necessary ? The default stores it in the node_modules. Should we store it in bun's cache too ?
  // cacheDir: path.join(pnpmStoreDir, '.vite'),
  plugins: [
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - no types
    import('@vitejs/plugin-react').then(m =>
      (m.default || m)({
        // fastRefresh: false,
      }),
    ),
    monacoEditorPlugin({
      languageWorkers: ['editorWorkerService', 'json'],
      customWorkers: [
        {
          label: 'graphql',
          entry: 'monaco-graphql/esm/graphql.worker.js',
        },
      ],
    }),
  ],
  server: {
    port: 4001,
    proxy: {
      '/graphql': 'http://localhost:4000/graphql',
    },
  },
  define:
    // Having this environment variable set in development will break the dev server
    process.env['BUILD'] === 'true'
      ? {
          'process.env.NODE_ENV': '"production"',
        }
      : undefined,
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src', 'bundle.tsx'),
      name: 'YogaGraphiQL',
      fileName: format => `yoga-graphiql.${format}.js`,
    },
    rollupOptions: {
      output: {
        /** prevent code-splitting */
        inlineDynamicImports: false,
        manualChunks: () => '_.js',
      },
    },
  },
});
