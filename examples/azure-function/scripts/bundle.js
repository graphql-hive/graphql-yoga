const { build } = require('esbuild');
const { join } = require('path');

const projectRoot = join(__dirname, '..');

async function main() {
  await build({
    entryPoints: [join(projectRoot, './src/functions/index.ts')],
    outfile: join(projectRoot, 'dist/functions/index.js'),
    format: 'cjs',
    minify: false,
    bundle: true,
    platform: 'node',
    target: 'node20',
    external: ['@azure/functions-core'],
  });

  console.info(`Azure Function build done!`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
