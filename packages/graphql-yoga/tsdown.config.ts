import { defineConfig } from 'tsdown';

export default defineConfig({
  name: 'graphql-yoga',
  entry: './src/index.ts',
  outDir: './dist',
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: false,
  minify: false,
  platform: 'node',
  target: 'es2022',
});
