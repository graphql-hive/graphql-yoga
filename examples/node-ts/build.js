/* eslint-disable */
const { build } = require('esbuild');
const { writeFileSync } = require('fs');

async function main() {
  await build({
    entryPoints: ['./src/index.ts'],
    outfile: 'dist/index.js',
    format: 'cjs',
    minify: false,
    bundle: true,
    platform: 'node',
    target: 'node22',
  });

  writeFileSync(
    './dist/package.json',
    JSON.stringify({
      name: 'yoga-test-function',
      version: '0.0.1',
    }),
  );

  console.info(`Node TS build done!`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
