import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: './src/index.ts',
  outDir: './dist',
  format: ['esm', 'cjs'],
  dts: false, // Disabled due to memory issues
  sourcemap: true,
  clean: true,
  treeshake: false,
  minify: false,
  platform: 'node',
  target: 'es2022',
  external: [
    'newrelic',
    'typescript',
    'tslib',
  ],
});
