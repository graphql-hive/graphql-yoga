import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: './src/index.tsx',
  },
  format: ['esm', 'umd'],
  globalName: 'YogaGraphiQL',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});
