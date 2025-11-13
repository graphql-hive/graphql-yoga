/* eslint-env node */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('node:fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('node:path');

// supply the wished graphql version as first argument of script
const graphqlVersion = process.argv[2];

const pkgPath = path.resolve(__dirname, '..', 'package.json');
const pkgFile = fs.readFileSync(pkgPath);

const pkg = JSON.parse(pkgFile.toString());
if (pkg?.pnpm?.overrides?.graphql === graphqlVersion) {
  console.log(`graphql version is already set to ${graphqlVersion}, skipping...`);
  process.exit(0);
}
pkg.pnpm.overrides = {
  ...pkg.pnpm.overrides,
  graphql: graphqlVersion,
};

fs.writeFileSync(pkgPath, JSON.stringify(pkg, undefined, '  ') + '\n');

// disable apollo federation and sofa testing with <16 versions
const graphql15AndLess = parseInt(graphqlVersion.split('.')[0]) <= 15;

for (const testPath of [`examples/apollo-federation`]) {
  if (graphql15AndLess) {
    // disable
    const testPathAbs = path.resolve(__dirname, '..', testPath, '__integration-tests__');
    if (fs.existsSync(testPathAbs)) {
      fs.renameSync(
        testPathAbs,
        path.resolve(__dirname, '..', testPath, '__DISABLED_integration-tests__'),
      );
    }
  } else {
    // enable if disabled
    const testPathAbs = path.resolve(__dirname, '..', testPath, '__DISABLED_integration-tests__');
    if (fs.existsSync(testPathAbs)) {
      fs.renameSync(testPathAbs, path.resolve(__dirname, '..', testPath, '__integration-tests__'));
    }
  }
}
