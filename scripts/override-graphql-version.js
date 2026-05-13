/* eslint-env node */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('node:fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('node:path');

// supply the wished graphql version as first argument of script
const graphqlVersion = process.argv[2];

const pkgPath = path.resolve(__dirname, '..', 'package.json');
const pkgFile = fs.readFileSync(pkgPath);
const workspacePath = path.resolve(__dirname, '..', 'pnpm-workspace.yaml');

const pkg = JSON.parse(pkgFile.toString());

function setGraphqlOverrideInWorkspace(nextGraphqlVersion) {
  const workspaceFile = fs.readFileSync(workspacePath, 'utf8');
  const lines = workspaceFile.split('\n');
  let inOverrides = false;
  let foundGraphqlOverride = false;
  let overrideSectionExists = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inOverrides) {
      if (line.trim() === 'overrides:') {
        inOverrides = true;
        overrideSectionExists = true;
      }
      continue;
    }

    // End of overrides section
    if (line && !line.startsWith(' ')) {
      if (!foundGraphqlOverride) {
        lines.splice(i, 0, `  graphql: ${nextGraphqlVersion}`);
      }
      fs.writeFileSync(workspacePath, lines.join('\n').replace(/\n?$/, '\n'));
      return;
    }

    if (line.startsWith('  graphql:')) {
      lines[i] = `  graphql: ${nextGraphqlVersion}`;
      foundGraphqlOverride = true;
    }
  }

  if (!overrideSectionExists) {
    if (lines.length > 0 && lines[lines.length - 1] !== '') {
      lines.push('');
    }
    lines.push('overrides:');
    lines.push(`  graphql: ${nextGraphqlVersion}`);
  } else if (!foundGraphqlOverride) {
    lines.push(`  graphql: ${nextGraphqlVersion}`);
  }

  fs.writeFileSync(workspacePath, lines.join('\n').replace(/\n?$/, '\n'));
}

function getGraphqlOverrideFromWorkspace() {
  const workspaceFile = fs.readFileSync(workspacePath, 'utf8');
  const lines = workspaceFile.split('\n');
  let inOverrides = false;
  for (const line of lines) {
    if (!inOverrides) {
      if (line.trim() === 'overrides:') {
        inOverrides = true;
      }
      continue;
    }
    if (line && !line.startsWith(' ')) {
      break;
    }
    if (line.startsWith('  graphql:')) {
      return line.split(':').slice(1).join(':').trim();
    }
  }
  return undefined;
}

const currentGraphqlVersion = pkg?.pnpm?.overrides?.graphql ?? getGraphqlOverrideFromWorkspace();
if (currentGraphqlVersion === graphqlVersion) {
  console.log(`graphql version is already set to ${graphqlVersion}, skipping...`);
  process.exit(0);
}

if (pkg?.pnpm?.overrides) {
  pkg.pnpm.overrides = {
    ...pkg.pnpm.overrides,
    graphql: graphqlVersion,
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, undefined, '  ') + '\n');
} else {
  setGraphqlOverrideInWorkspace(graphqlVersion);
}

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
