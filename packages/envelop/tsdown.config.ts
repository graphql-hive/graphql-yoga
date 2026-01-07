import { defineConfig } from 'tsdown';

export default defineConfig({
  name: '@envelop/execution',
  entry: './src/index.ts',
  outDir: './dist',
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  platform: 'node',
  target: 'es2022',
});
