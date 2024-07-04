/* eslint-disable */
const { build } = require('esbuild');
const { writeFileSync } = require('fs');

async function main() {
  await build({
    entryPoints: ['./src/index.ts'],
    outfile: 'dist/Yoga/index.js',
    format: 'cjs',
    minify: false,
    bundle: true,
    platform: 'node',
    target: 'node18',
    external: ['@azure/functions-core'],
  });

  writeFileSync(
    './dist/package.json',
    JSON.stringify({
      name: 'yoga-test-function',
      version: '0.0.1',
    }),
  );

  writeFileSync(
    './dist/host.json',
    JSON.stringify({
      version: '2.0',
      logging: {
        applicationInsights: {
          samplingSettings: {
            isEnabled: true,
            excludedTypes: 'Request',
          },
        },
      },
      extensionBundle: {
        id: 'Microsoft.Azure.Functions.ExtensionBundle',
        version: '[2.*, 3.0.0)',
      },
    }),
  );

  writeFileSync(
    './dist/Yoga/function.json',
    JSON.stringify({
      bindings: [
        {
          authLevel: 'anonymous',
          type: 'httpTrigger',
          direction: 'in',
          name: 'req',
          methods: ['get', 'post'],
        },
        {
          type: 'http',
          direction: 'out',
          name: 'res',
        },
      ],
    }),
  );

  console.info(`Azure Function build done!`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
