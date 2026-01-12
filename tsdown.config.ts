import { defineConfig } from 'tsdown';

export default defineConfig({
  unbundle: true,
  format: ['esm', 'cjs'],
});
