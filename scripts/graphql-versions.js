/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const ALIAS_RE = /^graphql-(\d+)$/;

function getInstalledGraphQLVersions() {
  const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  const deps = { ...rootPkg.devDependencies, ...rootPkg.dependencies };

  /** @type {GraphQLVersion[]} */
  const versions = [];

  for (const [packageName, spec] of Object.entries(deps)) {
    const isPrimary = packageName === 'graphql';
    if (!isPrimary && !(ALIAS_RE.test(packageName) && spec.startsWith('npm:graphql@'))) {
      continue;
    }

    // These are all root dependencies, so pnpm links them into the root `node_modules`.
    const dir = path.join(ROOT_DIR, 'node_modules', packageName);
    const pkgJsonPath = path.join(dir, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) {
      throw new Error(
        `"${packageName}" is declared in the root package.json but not installed. ` +
          `Run \`pnpm install\` to be able to test against all supported graphql-js versions.`,
      );
    }

    const { version } = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    versions.push({
      packageName,
      version,
      major: parseInt(version.split('.')[0], 10),
      dir,
      isPrimary,
    });
  }

  return versions.sort((a, b) => a.major - b.major);
}

/**
 * The versions to actually run tests against, honoring `GRAPHQL_VERSION`.
 * @returns {GraphQLVersion[]}
 */
function getSelectedGraphQLVersions() {
  const installed = getInstalledGraphQLVersions();
  const selector = process.env.GRAPHQL_VERSION?.trim();

  if (!selector || selector === 'all') {
    return installed;
  }

  // Accept majors (`16`) as well as full versions (`16.14.2`), so the CI matrix values that used to
  // be passed to `scripts/override-graphql-version.js` keep working.
  const wanted = selector
    .split(',')
    .map(part => parseInt(part.trim().split('.')[0], 10))
    .filter(major => !Number.isNaN(major));

  const selected = installed.filter(version => wanted.includes(version.major));

  if (!selected.length) {
    throw new Error(
      `GRAPHQL_VERSION="${selector}" does not match any installed graphql-js version. ` +
        `Available: ${installed.map(v => v.major).join(', ')}.`,
    );
  }

  return selected;
}

/**
 * Jest `moduleNameMapper` entries redirecting every `graphql` import (ours and our dependencies') to
 * the given installed version. The primary `graphql` dependency needs no mapping.
 * @param {GraphQLVersion} version
 * @returns {Record<string, string>}
 */
function getGraphQLModuleNameMapper(version) {
  if (version.isPrimary) {
    return {};
  }
  return {
    '^graphql$': version.dir,
    '^graphql/(.*)$': `${version.dir}/$1`,
  };
}

module.exports = {
  getInstalledGraphQLVersions,
  getSelectedGraphQLVersions,
  getGraphQLModuleNameMapper,
};
