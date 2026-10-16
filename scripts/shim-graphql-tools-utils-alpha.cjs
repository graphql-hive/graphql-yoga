/**
 * TEMP compat for graphql-tools#8515 alphas while gateway packages (delegate,
 * executor-http, federation) still import removed utils names.
 *
 * Follows the #8515 replacement table:
 * - createGraphQLError -> GraphQLError (+ optional coordinate)
 * - createDeferred / createDeferredPromise -> Promise.withResolvers()
 * - isPromise / fakePromise / mapAsyncIterator -> @whatwg-node/promise-helpers
 * - mapMaybePromise is NOT re-added; callers should use handleMaybePromise
 * - getArgumentValues -> re-export from graphql
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'node_modules', '.pnpm');
if (!fs.existsSync(root)) process.exit(0);

const marker = '/* graphql-tools-alpha-compat-shim */';

const createEsm = `import { GraphQLError } from 'graphql';

/** @deprecated Prefer \`new GraphQLError(message, options)\` (#8515). */
export function createGraphQLError(message, options) {
  const error = new GraphQLError(message, options);
  if (options?.coordinate != null && error.coordinate == null) {
    Object.defineProperties(error, {
      coordinate: { value: options.coordinate, enumerable: true, configurable: true },
    });
  }
  return error;
}
`;

const createCjs = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGraphQLError = createGraphQLError;
const graphql_1 = require("graphql");
function createGraphQLError(message, options) {
  const error = new graphql_1.GraphQLError(message, options);
  if (options?.coordinate != null && error.coordinate == null) {
    Object.defineProperties(error, {
      coordinate: { value: options.coordinate, enumerable: true, configurable: true },
    });
  }
  return error;
}
`;

const deferredEsm = `/** @deprecated Prefer \`Promise.withResolvers()\` (#8515). */
export function createDeferred() {
  return Promise.withResolvers();
}
export const createDeferredPromise = createDeferred;
`;

const deferredCjs = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeferred = createDeferred;
exports.createDeferredPromise = createDeferred;
function createDeferred() {
  return Promise.withResolvers();
}
`;

const deferredDts = `/** @deprecated Prefer \`Promise.withResolvers()\`. */
export declare function createDeferred<T = void>(): PromiseWithResolvers<T>;
/** @deprecated Prefer \`Promise.withResolvers()\`. */
export declare function createDeferredPromise<T = void>(): PromiseWithResolvers<T>;
`;

function stripEsmLike(content) {
  const idx = content.indexOf(marker);
  if (idx !== -1) return content.slice(0, idx).replace(/\s+$/, '') + '\n';
  return content
    .split('\n')
    .filter(line => {
      if (line.includes("from './createGraphQLError.")) return false;
      if (line.includes("from './createDeferred.")) return false;
      if (line.includes("from './mapMaybePromise.")) return false;
      if (line.includes("from '@whatwg-node/promise-helpers'") && line.trim().startsWith('export')) return false;
      return true;
    })
    .join('\n')
    .replace(/\s+$/, '') + '\n';
}

function stripCjs(content) {
  const idx = content.indexOf(marker);
  if (idx !== -1) return content.slice(0, idx).replace(/\s+$/, '') + '\n';
  const needle = 'var createGraphQLError_1 = require("./createGraphQLError.js");';
  const i = content.indexOf(needle);
  if (i !== -1) return content.slice(0, i).replace(/\s+$/, '') + '\n';
  return content;
}

function shimPackage(pkgDir) {
  const esmIndex = path.join(pkgDir, 'esm', 'index.js');
  if (!fs.existsSync(esmIndex)) return false;

  fs.writeFileSync(path.join(pkgDir, 'esm', 'createGraphQLError.js'), createEsm);
  fs.writeFileSync(path.join(pkgDir, 'cjs', 'createGraphQLError.js'), createCjs);
  fs.writeFileSync(path.join(pkgDir, 'esm', 'createDeferred.js'), deferredEsm);
  fs.writeFileSync(path.join(pkgDir, 'cjs', 'createDeferred.js'), deferredCjs);
  fs.writeFileSync(path.join(pkgDir, 'typings', 'createGraphQLError.d.ts'), `import { GraphQLError, type GraphQLErrorOptions } from 'graphql';
export type CreateGraphQLErrorOptions = GraphQLErrorOptions & { coordinate?: string };
/** @deprecated Prefer \`new GraphQLError(message, options)\`. */
export declare function createGraphQLError(message: string, options?: CreateGraphQLErrorOptions): GraphQLError;
`);
  fs.writeFileSync(path.join(pkgDir, 'typings', 'createGraphQLError.d.cts'), fs.readFileSync(path.join(pkgDir, 'typings', 'createGraphQLError.d.ts')));
  fs.writeFileSync(path.join(pkgDir, 'typings', 'createDeferred.d.ts'), deferredDts);
  fs.writeFileSync(path.join(pkgDir, 'typings', 'createDeferred.d.cts'), deferredDts);

  // drop leftover mapMaybePromise files if present
  for (const f of ['esm/mapMaybePromise.js', 'cjs/mapMaybePromise.js', 'typings/mapMaybePromise.d.ts', 'typings/mapMaybePromise.d.cts']) {
    const fp = path.join(pkgDir, f);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }

  fs.writeFileSync(
    esmIndex,
    stripEsmLike(fs.readFileSync(esmIndex, 'utf8')) +
      `${marker}
export { createGraphQLError } from './createGraphQLError.js';
export { createDeferred, createDeferredPromise } from './createDeferred.js';
export { getArgumentValues } from 'graphql';
export { fakePromise, isPromise, mapAsyncIterator } from '@whatwg-node/promise-helpers';
`,
  );

  fs.writeFileSync(
    path.join(pkgDir, 'typings', 'index.d.ts'),
    stripEsmLike(fs.readFileSync(path.join(pkgDir, 'typings', 'index.d.ts'), 'utf8')) +
      `${marker}
export { createGraphQLError } from './createGraphQLError.js';
export { createDeferred, createDeferredPromise } from './createDeferred.js';
export { getArgumentValues } from 'graphql';
export { fakePromise, isPromise, mapAsyncIterator } from '@whatwg-node/promise-helpers';
`,
  );

  fs.writeFileSync(
    path.join(pkgDir, 'typings', 'index.d.cts'),
    stripEsmLike(fs.readFileSync(path.join(pkgDir, 'typings', 'index.d.cts'), 'utf8')) +
      `${marker}
export { createGraphQLError } from './createGraphQLError.cjs';
export { createDeferred, createDeferredPromise } from './createDeferred.cjs';
export { getArgumentValues } from 'graphql';
export { fakePromise, isPromise, mapAsyncIterator } from '@whatwg-node/promise-helpers';
`,
  );

  fs.writeFileSync(
    path.join(pkgDir, 'cjs', 'index.js'),
    stripCjs(fs.readFileSync(path.join(pkgDir, 'cjs', 'index.js'), 'utf8')) +
      `${marker}
var createGraphQLError_1 = require("./createGraphQLError.js");
Object.defineProperty(exports, "createGraphQLError", { enumerable: true, get: function () { return createGraphQLError_1.createGraphQLError; } });
var createDeferred_1 = require("./createDeferred.js");
Object.defineProperty(exports, "createDeferred", { enumerable: true, get: function () { return createDeferred_1.createDeferred; } });
Object.defineProperty(exports, "createDeferredPromise", { enumerable: true, get: function () { return createDeferred_1.createDeferredPromise; } });
var promise_helpers_1 = require("@whatwg-node/promise-helpers");
Object.defineProperty(exports, "fakePromise", { enumerable: true, get: function () { return promise_helpers_1.fakePromise; } });
Object.defineProperty(exports, "isPromise", { enumerable: true, get: function () { return promise_helpers_1.isPromise; } });
Object.defineProperty(exports, "mapAsyncIterator", { enumerable: true, get: function () { return promise_helpers_1.mapAsyncIterator; } });
var graphql_1 = require("graphql");
Object.defineProperty(exports, "getArgumentValues", { enumerable: true, get: function () { return graphql_1.getArgumentValues; } });
`,
  );
  return true;
}

let count = 0;
for (const entry of fs.readdirSync(root)) {
  if (!entry.startsWith('@graphql-tools+utils@13.0.0-alpha-')) continue;
  const pkgDir = path.join(root, entry, 'node_modules', '@graphql-tools', 'utils');
  if (shimPackage(pkgDir)) count += 1;
}
console.log(`[shim-graphql-tools-utils-alpha] patched ${count} utils install(s)`);
