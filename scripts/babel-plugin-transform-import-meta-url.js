/**
 * Rewrites `import.meta.url` to a CJS equivalent for Babel-transformed test files.
 *
 * `babel-plugin-transform-import-meta` (and, as far as we've seen, every other published
 * alternative) generates `const _require = createRequire(_require('url')...)`, which throws
 * "Cannot access '_require' before initialization": Babel renames a locally re-declared
 * `require` (e.g. `const require = createRequire(import.meta.url)`, the standard Node ESM
 * idiom `@nestjs/*` v12 packages use) to `_require` to dodge the parameter shadowing, but then
 * those plugins reuse that same `_require` name to fetch the `url` module, so the declaration
 * ends up referencing itself. Using `module.require(...)` instead of a bare `require(...)` call
 * never collides with that renamed binding, since it doesn't reference the identifier at all.
 */
module.exports = function transformImportMetaUrl({ types: t }) {
  return {
    name: 'transform-import-meta-url',
    visitor: {
      MetaProperty(path) {
        if (path.node.meta.name !== 'import' || path.node.property.name !== 'meta') return;

        const memberExpression = path.parentPath;
        if (
          !memberExpression.isMemberExpression({ object: path.node }) ||
          !t.isIdentifier(memberExpression.node.property, { name: 'url' })
        ) {
          return;
        }

        memberExpression.replaceWith(
          t.memberExpression(
            t.callExpression(
              t.memberExpression(
                t.callExpression(
                  t.memberExpression(t.identifier('module'), t.identifier('require')),
                  [t.stringLiteral('url')],
                ),
                t.identifier('pathToFileURL'),
              ),
              [t.identifier('__filename')],
            ),
            t.identifier('href'),
          ),
        );
      },
    },
  };
};
