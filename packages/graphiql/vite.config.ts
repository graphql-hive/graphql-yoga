import { execSync } from 'node:child_process';
import * as path from 'node:path';
import { defineConfig } from 'vite';

const pnpmStoreDir = execSync('pnpm store path').toString('utf-8').trim();

// https://vitejs.dev/config/
export default defineConfig({
  cacheDir: path.join(pnpmStoreDir, '.vite'),
  plugins: [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import('@vitejs/plugin-react').then((m: any) =>
      (m.default || m)({
        // fastRefresh: false,
      }),
    ),
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
