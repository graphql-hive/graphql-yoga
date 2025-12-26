# @envelop/sentry

## 15.0.0

### Patch Changes

- Updated dependencies
  [[`0434fbd`](https://github.com/graphql-hive/envelop/commit/0434fbdf9e6a33a64f5cb5fe34662ea4815647eb)]:
  - @envelop/core@5.4.0

## 14.1.0

### Minor Changes

- [#2715](https://github.com/graphql-hive/envelop/pull/2715)
  [`262e761`](https://github.com/graphql-hive/envelop/commit/262e761cefdea77ae602bb9f8e06dcd9d11cc9c3)
  Thanks [@thomasleduc](https://github.com/thomasleduc)! - Support Sentry v9 and v10

## 14.0.0

### Patch Changes

- Updated dependencies
  [[`3ebaa3b`](https://github.com/graphql-hive/envelop/commit/3ebaa3b75b34f9a61aa517166f538796b383bfad)]:
  - @envelop/core@5.3.0

## 13.1.3

### Patch Changes

- Updated dependencies
  [[`914f9ed`](https://github.com/n1ru4l/envelop/commit/914f9ed3b753f771d938b4beb8fd31753b48771e),
  [`914f9ed`](https://github.com/n1ru4l/envelop/commit/914f9ed3b753f771d938b4beb8fd31753b48771e)]:
  - @envelop/core@5.2.3

## 13.1.2

### Patch Changes

- Updated dependencies
  [[`26137e7`](https://github.com/n1ru4l/envelop/commit/26137e7c3d0ff349af90724867c715f3b3809a7d),
  [`26137e7`](https://github.com/n1ru4l/envelop/commit/26137e7c3d0ff349af90724867c715f3b3809a7d)]:
  - @envelop/core@5.2.2

## 13.1.1

### Patch Changes

- Updated dependencies
  [[`90dd1a6`](https://github.com/n1ru4l/envelop/commit/90dd1a665e027ec309df4411f04a310806ee8f15),
  [`90dd1a6`](https://github.com/n1ru4l/envelop/commit/90dd1a665e027ec309df4411f04a310806ee8f15)]:
  - @envelop/core@5.2.1

## 13.1.0

### Patch Changes

- Updated dependencies
  [[`a107c89`](https://github.com/n1ru4l/envelop/commit/a107c896d7a7b1af7417ed0708be336db2ecbb54),
  [`a107c89`](https://github.com/n1ru4l/envelop/commit/a107c896d7a7b1af7417ed0708be336db2ecbb54)]:
  - @envelop/core@5.2.0

## 13.0.1

### Patch Changes

- Updated dependencies
  [[`5b6a166`](https://github.com/n1ru4l/envelop/commit/5b6a166f5e2c12e6aa4679eb4e3209de43b0efc1)]:
  - @envelop/core@5.1.1

## 13.0.0

### Patch Changes

- Updated dependencies
  [[`9bd1b20`](https://github.com/n1ru4l/envelop/commit/9bd1b207861540f9bee085026b9fab725a88e84e)]:
  - @envelop/core@5.1.0

## 12.0.0

### Major Changes

- [#2323](https://github.com/n1ru4l/envelop/pull/2323)
  [`2993773`](https://github.com/n1ru4l/envelop/commit/299377308c1c5901e5babeecd1715088977912d9)
  Thanks [@Karibash](https://github.com/Karibash)! - Make it possible to get the active span in the
  GraphQL resolver

  **Breaking Change:** With this change, this plugin now wraps the execute function. This plugin
  should be placed last so that the execute function is not overwritten by another plugin.

  ```ts
  const yoga = createYoga({
    plugins: [
      ...otherPlugins,
      useSentry({
        // ...
      })
    ]
  })
  ```

## 11.0.0

### Major Changes

- [#2335](https://github.com/n1ru4l/envelop/pull/2335)
  [`073774c`](https://github.com/n1ru4l/envelop/commit/073774ce7eb06b6b8f13d758046cfa8e5d4eb654)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Fix: Update code to better feat the new
  Sentry v8 API

  **Breaking Change:**
  - `startTransaction` option has been removed.
  - `forceTransaction` option has been added, disabled by default.

## 10.0.0

### Major Changes

- [#2277](https://github.com/n1ru4l/envelop/pull/2277)
  [`9f65fcb`](https://github.com/n1ru4l/envelop/commit/9f65fcba8e0a6c37b43ac71012a46e4ff65f3157)
  Thanks [@trixobird](https://github.com/trixobird)! - dependencies updates:
  - Updated dependency
    [`@sentry/node@^8.0.0` ↗︎](https://www.npmjs.com/package/@sentry/node/v/8.0.0) (from
    `^6 || ^7`, in `peerDependencies`)

## 9.0.0

### Major Changes

- [#2163](https://github.com/n1ru4l/envelop/pull/2163)
  [`7686b33`](https://github.com/n1ru4l/envelop/commit/7686b33db95a94b472ba3b19f274b5b4d78e8867)
  Thanks [@MarcelCutts](https://github.com/MarcelCutts)! - Removed includedResolverArgs from
  SentryPluginOptions as it lead to no functionality.

## 8.0.0

### Major Changes

- [`aff6ea0`](https://github.com/n1ru4l/envelop/commit/aff6ea09e71f07355dd91ba152dcc9534466d41f)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Allow to provide the context type as a
  generic parameter

  **Breaking Change:** Since this introduces a typed context as a generic, TS will not always infer
  the correct type for you. If you have a custom Context type, please consider explicitly pass this
  context type as a generic argument:

  ```ts
  cont yoga = createYoga<CustomContext>({
    plugins: [
      useSentry<CustomContext>({
        //...
      })
    ]
  })
  ```

## 7.1.1

### Patch Changes

- [`398564c`](https://github.com/n1ru4l/envelop/commit/398564c53886f8b11faae76e49f061fe3fa5b43f)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Revert the addition of a typed context
  since it is a breaking change. This will be re-added in a major release.

## 7.1.0

### Minor Changes

- [#2103](https://github.com/n1ru4l/envelop/pull/2103)
  [`58d80ea`](https://github.com/n1ru4l/envelop/commit/58d80ea472c73b791d3b2644cf0e3439f69f7b0a)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Allow to provide the context type as a
  generic parameter

## 7.0.0

### Major Changes

- [#1986](https://github.com/n1ru4l/envelop/pull/1986)
  [`68e7a2a5`](https://github.com/n1ru4l/envelop/commit/68e7a2a59a2f9872652b4bae28f30c3a2fb70487)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - **Breaking Change:** Support of Node 16
  is dropped.

- Updated dependencies
  [[`68e7a2a5`](https://github.com/n1ru4l/envelop/commit/68e7a2a59a2f9872652b4bae28f30c3a2fb70487),
  [`f7ef03c0`](https://github.com/n1ru4l/envelop/commit/f7ef03c07ae1af3abf08de86bc95fe626bbc7913)]:
  - @envelop/core@5.0.0

## 6.0.3

### Patch Changes

- [#1927](https://github.com/n1ru4l/envelop/pull/1927)
  [`e3c90116`](https://github.com/n1ru4l/envelop/commit/e3c9011640b73aaede4e5e472a5d45aab947165c)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@envelop/core@^4.0.2` ↗︎](https://www.npmjs.com/package/@envelop/core/v/4.0.2) (from
    `^4.0.1`, in `peerDependencies`)

- Updated dependencies
  [[`dee6b8d2`](https://github.com/n1ru4l/envelop/commit/dee6b8d215f21301660090037b6685e86d217593)]:
  - @envelop/core@4.0.3

## 6.0.2

### Patch Changes

- Updated dependencies
  [[`db20864a`](https://github.com/n1ru4l/envelop/commit/db20864aac3fcede3e265ae63b2e8cb4664ba23a)]:
  - @envelop/core@4.0.2

## 6.0.1

### Patch Changes

- Updated dependencies []:
  - @envelop/core@4.0.1

## 6.0.0

### Major Changes

- [#1776](https://github.com/n1ru4l/envelop/pull/1776)
  [`332f1f22`](https://github.com/n1ru4l/envelop/commit/332f1f221f655421a850adb834afe549d50b4fac)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 and require Node 16 or higher

- Updated dependencies
  [[`332f1f22`](https://github.com/n1ru4l/envelop/commit/332f1f221f655421a850adb834afe549d50b4fac),
  [`a36925c7`](https://github.com/n1ru4l/envelop/commit/a36925c7df0538f88b51682e4e23f4b16f6fae2b)]:
  - @envelop/core@4.0.0

### Patch Changes

- [#1728](https://github.com/n1ru4l/envelop/pull/1728)
  [`a36925c7`](https://github.com/n1ru4l/envelop/commit/a36925c7df0538f88b51682e4e23f4b16f6fae2b)
  Thanks [@ardatan](https://github.com/ardatan)! - - Memoize parsed document string result and use
  it wherever possible, and export `getDocumentString` function to allow users to use it as well.
  - Use `WeakMap`s with `DocumentNode` wherever possible instead of using LRU Cache with strings. It
    is more optimal if a parser caching is used

## 5.1.1

### Patch Changes

- [#1725](https://github.com/n1ru4l/envelop/pull/1725)
  [`c1eb2c09`](https://github.com/n1ru4l/envelop/commit/c1eb2c09ac535b076a5c13430c3892d98f7ef957)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - dependencies updates:
  - Updated dependency [`tslib@^2.5.0` ↗︎](https://www.npmjs.com/package/tslib/v/2.5.0) (from
    `^2.4.0`, in `dependencies`)

- Updated dependencies
  [[`c1eb2c09`](https://github.com/n1ru4l/envelop/commit/c1eb2c09ac535b076a5c13430c3892d98f7ef957)]:
  - @envelop/core@3.0.6

## 5.1.0

### Minor Changes

- [#1632](https://github.com/n1ru4l/envelop/pull/1632)
  [`2a175b47`](https://github.com/n1ru4l/envelop/commit/2a175b476a47d17225946277ff00f0a90ae50044)
  Thanks [@jeengbe](https://github.com/jeengbe)! - feat: add cache for printed documents

### Patch Changes

- Updated dependencies
  [[`270249cf`](https://github.com/n1ru4l/envelop/commit/270249cfb7650f8ad64f0167bb45a99475a03b04)]:
  - @envelop/core@3.0.5

## 5.0.0

### Major Changes

- [#1583](https://github.com/n1ru4l/envelop/pull/1583)
  [`f6361e86`](https://github.com/n1ru4l/envelop/commit/f6361e864e8d0a434a539a78679b263fc78964f7)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Remove `trackResolvers` functionality.

  This feature resulted in errors being reported multiple times. In the future we might re-add it as
  a standalone plugin, right now we don't see any benefit from it.

### Patch Changes

- [#1583](https://github.com/n1ru4l/envelop/pull/1583)
  [`f6361e86`](https://github.com/n1ru4l/envelop/commit/f6361e864e8d0a434a539a78679b263fc78964f7)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - dependencies updates:
  - Removed dependency
    [`@envelop/on-resolve@^2.0.4` ↗︎](https://www.npmjs.com/package/@envelop/on-resolve/v/2.0.4)
    (from `dependencies`)

- [#1583](https://github.com/n1ru4l/envelop/pull/1583)
  [`f6361e86`](https://github.com/n1ru4l/envelop/commit/f6361e864e8d0a434a539a78679b263fc78964f7)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix synergy together with the masked error plugin
  by copying over the original error when attaching the sentry event id

## 4.0.4

### Patch Changes

- Updated dependencies []:
  - @envelop/core@3.0.4
- Updated dependencies []:
  - @envelop/on-resolve@2.0.4

## 4.0.3

### Patch Changes

- [#1571](https://github.com/n1ru4l/envelop/pull/1571)
  [`6b48ef96`](https://github.com/n1ru4l/envelop/commit/6b48ef962020eb7dfd2918626b8a394bff673e4f)
  Thanks [@ardatan](https://github.com/ardatan)! - Deeply check if it is an original GraphQL Error

- Updated dependencies
  [[`6b48ef96`](https://github.com/n1ru4l/envelop/commit/6b48ef962020eb7dfd2918626b8a394bff673e4f)]:
  - @envelop/core@3.0.3
- Updated dependencies []:
  - @envelop/on-resolve@2.0.3

## 4.0.2

### Patch Changes

- Updated dependencies
  [[`22f5ccfb`](https://github.com/n1ru4l/envelop/commit/22f5ccfbe69eb052cda6c1908425b63e3d906243)]:
  - @envelop/core@3.0.2
- Updated dependencies []:
  - @envelop/on-resolve@2.0.2

## 4.0.0

### Major Changes

- [#1487](https://github.com/n1ru4l/envelop/pull/1487)
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f)
  Thanks [@saihaj](https://github.com/saihaj)! - Default skip reporting `GraphQLError`

- Updated dependencies
  [[`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f)]:
  - @envelop/core@3.0.0

### Patch Changes

- Updated dependencies
  [[`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f)]:
  - @envelop/on-resolve@2.0.0

## 3.8.1

### Patch Changes

- [#1526](https://github.com/n1ru4l/envelop/pull/1526)
  [`4a583b7a`](https://github.com/n1ru4l/envelop/commit/4a583b7aa81f23e8938d15a853949bdce420f178)
  Thanks [@kamilkisiela](https://github.com/kamilkisiela)! - fix: EnvelopError was not skipped by
  default

## 3.8.0

### Minor Changes

- [#1499](https://github.com/n1ru4l/envelop/pull/1499)
  [`1f7af02b`](https://github.com/n1ru4l/envelop/commit/1f7af02b9f1a16058a6d69fcd48425a93be655c6)
  Thanks [@viniciuspalma](https://github.com/viniciuspalma)! - Adding tslib to package dependencies

  Projects that currently are using yarn Berry with PnP or any strict dependency resolver, that
  requires that all dependencies are specified on package.json otherwise it would endue in an error
  if not treated correct

  Since https://www.typescriptlang.org/tsconfig#importHelpers is currently being used, tslib should
  be exported as a dependency to external runners get the proper import.

  Change on each package:

  ```json
  // package.json
  {
    "dependencies": {
      "tslib": "^2.4.0"
    }
  }
  ```

- Updated dependencies
  [[`1f7af02b`](https://github.com/n1ru4l/envelop/commit/1f7af02b9f1a16058a6d69fcd48425a93be655c6),
  [`ae7bc9a3`](https://github.com/n1ru4l/envelop/commit/ae7bc9a36abd595b0a91f7b4e133017d3eb99a4a)]:
  - @envelop/core@2.6.0

## 3.7.0

### Minor Changes

- Updated dependencies
  [[`5a5f5c04`](https://github.com/n1ru4l/envelop/commit/5a5f5c04177b9e1379fd77db5d6383160879d449),
  [`d828f129`](https://github.com/n1ru4l/envelop/commit/d828f1291254a0f9dfdc3654611087859e4c9708)]:
  - @envelop/core@2.5.0

## 3.6.3

### Patch Changes

- 071f946: Fix CommonJS TypeScript resolution with `moduleResolution` `node16` or `nodenext`
- Updated dependencies [071f946]
  - @envelop/core@2.4.2

## 3.6.2

### Patch Changes

- d54091f: Fix interoperability between the plugin and Sentry Integrations

## 3.6.1

### Patch Changes

- Updated dependencies [787d28a2]
  - @envelop/core@2.4.1

## 3.6.0

### Minor Changes

- 79ebe78: New feature: `traceparentData` (default: `{}`) - Adds tracing data to be sent to Sentry -
  this includes traceId, parentId and more. This can be used in connection with headers from the
  request to add the tracing details for Sentry.

## 3.5.0

### Minor Changes

- 8bb2738: Support TypeScript module resolution.
- Updated dependencies [8bb2738]
  - @envelop/core@2.4.0

### Patch Changes

- b1851eb: Create a more friendly error message in case the Sentry SDK is not properly configured.

## 3.4.2

### Patch Changes

- 3612010: supporting sentry v7.0.0
- fbf6155: update package.json repository links to point to the new home
- Updated dependencies [fbf6155]
  - @envelop/core@2.3.3

## 3.4.1

### Patch Changes

- Updated dependencies [07d029b]
  - @envelop/core@2.3.2

## 3.4.0

### Minor Changes

- 0be88fe: Expose sentry event id in error extensions

### Patch Changes

- Updated dependencies [d5c2c9a]
  - @envelop/core@2.3.1

## 3.3.0

### Minor Changes

- Updated dependencies [af23408]
  - @envelop/core@2.3.0

## 3.2.0

### Minor Changes

- Updated dependencies [ada7fb0]
- Updated dependencies [d5115b4]
- Updated dependencies [d5115b4]
  - @envelop/core@2.2.0

## 3.1.1

### Patch Changes

- b96ca65: Handle errors in async iterables, defer and stream queries. Better grouping of errors in
  lists by mapping the index number to a constant: `$index`

## 3.1.0

### Minor Changes

- Updated dependencies [78b3db2]
- Updated dependencies [f5eb436]
  - @envelop/core@2.1.0

## 3.0.0

### Patch Changes

- Updated dependencies [4106e08]
- Updated dependencies [aac65ef]
- Updated dependencies [4106e08]
  - @envelop/core@2.0.0

## 2.0.0

### Patch Changes

- Updated dependencies [d9cfb7c]
  - @envelop/core@1.7.0

## 1.5.1

### Patch Changes

- ccd86fe: Patch for defaultSkipError, which should return true if the error is an EnvelopError
  instance.

## 1.5.0

### Minor Changes

- 450abd4: Adds a new `skipError` option, which allows users to skip certain errors.

  It's useful in the case where a user has defined custom error types, such as `ValidationError`
  which may be used to validate resolver arguments.

## 1.4.1

### Patch Changes

- b1a0331: Properly list `@envelop/core` as a `peerDependency` in plugins.

  This resolves issues where the bundled envelop plugins published to npm had logic inlined from the
  `@envelop/core` package, causing `instanceof` check of `EnvelopError` to fail.

- Updated dependencies [b1a0331]
  - @envelop/core@1.6.1

## 1.4.0

### Minor Changes

- 090cae4: GraphQL v16 support

## 1.3.0

### Minor Changes

- 04120de: add support for GraphQL.js 16

## 1.2.1

### Patch Changes

- 016bbe2: do not report Envelop Error to sentry

## 1.2.0

### Minor Changes

- 1e2be95: Add configureScope option

## 1.1.0

### Minor Changes

- b5bdcad: Adds "skip" to indicate whether or not to skip the entire Sentry flow for given GraphQL
  operation

## 1.0.2

### Patch Changes

- 94db02d: Update usage of plugins to use the correct `isAsyncIterable` and new helper
  `handleStreamOrSingleExecutionResult`

## 1.0.1

### Patch Changes

- 8021229: fix ESM graphql import

## 1.0.0

### Major Changes

- 40bc444: v1 major release for envelop packages

## 0.3.1

### Patch Changes

- 28ad742: Improve TypeScript types

## 0.3.0

### Minor Changes

- eb6f53b: ESM Support for all plugins and envelop core

## 0.2.1

### Patch Changes

- f4924c7: Fix defaults

## 0.2.0

### Minor Changes

- e55c50a: Add trackResolvers
- e55c50a: Allow to reuse existing transaction

## 0.1.1

### Patch Changes

- 5fc65a4: Improved type-safety for internal context

## 0.1.0

### Minor Changes

- 2fba0b4: Initial version bump

## 0.0.2

### Patch Changes

- b1333b0: Initial packages release

## 0.0.1

### Patch Changes

- c499ae8: First bump as envelop
- 2cfc726: Fixes
