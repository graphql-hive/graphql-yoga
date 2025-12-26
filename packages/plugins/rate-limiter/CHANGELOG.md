# @envelop/rate-limiter

## 9.0.0

### Patch Changes

- Updated dependencies
  [[`0434fbd`](https://github.com/graphql-hive/envelop/commit/0434fbdf9e6a33a64f5cb5fe34662ea4815647eb)]:
  - @envelop/core@5.4.0
  - @envelop/on-resolve@7.0.0

## 8.1.1

### Patch Changes

- [#2690](https://github.com/graphql-hive/envelop/pull/2690)
  [`8f709a7`](https://github.com/graphql-hive/envelop/commit/8f709a7fb2809e7526c1bb591bc5fd6597807d6f)
  Thanks [@Tolsee](https://github.com/Tolsee)! - Fix rate limiting being wrongly applied to all
  fields with a default configuration.

## 8.1.0

### Minor Changes

- [#2676](https://github.com/graphql-hive/envelop/pull/2676)
  [`6164637`](https://github.com/graphql-hive/envelop/commit/6164637288edb0b9f26986f5ffc36eed00dbedfd)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Validate the configuration at schema
  loading time. The plugin now throws an error on invalid configuration, such as:
  - Multiple field configuration matching the same field
  - A field configuration matching a field already having a directive

### Patch Changes

- [#2676](https://github.com/graphql-hive/envelop/pull/2676)
  [`6164637`](https://github.com/graphql-hive/envelop/commit/6164637288edb0b9f26986f5ffc36eed00dbedfd)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:
  - Added dependency
    [`@types/picomatch@^4.0.2` ↗︎](https://www.npmjs.com/package/@types/picomatch/v/4.0.2) (to
    `dependencies`)
  - Added dependency [`picomatch@^4.0.3` ↗︎](https://www.npmjs.com/package/picomatch/v/4.0.3) (to
    `dependencies`)
  - Removed dependency [`minimatch@^10.0.1` ↗︎](https://www.npmjs.com/package/minimatch/v/10.0.1)
    (from `dependencies`)

- [#2676](https://github.com/graphql-hive/envelop/pull/2676)
  [`6164637`](https://github.com/graphql-hive/envelop/commit/6164637288edb0b9f26986f5ffc36eed00dbedfd)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Massive reduction of performance impact
  on GraphQL execution. Overhead has been minimalized on rate-limited fields, and entirely
  suppressed on other fields.

- [#2676](https://github.com/graphql-hive/envelop/pull/2676)
  [`6164637`](https://github.com/graphql-hive/envelop/commit/6164637288edb0b9f26986f5ffc36eed00dbedfd)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Fixed `rateLimitDirectiveName` option
  being ignored.

- Updated dependencies
  [[`92948d8`](https://github.com/graphql-hive/envelop/commit/92948d8c060e45a02e55101045b74df76320616d)]:
  - @envelop/core@5.3.2

## 8.0.0

### Patch Changes

- Updated dependencies
  [[`3ebaa3b`](https://github.com/graphql-hive/envelop/commit/3ebaa3b75b34f9a61aa517166f538796b383bfad)]:
  - @envelop/core@5.3.0
  - @envelop/on-resolve@6.0.0

## 7.1.3

### Patch Changes

- Updated dependencies
  [[`914f9ed`](https://github.com/n1ru4l/envelop/commit/914f9ed3b753f771d938b4beb8fd31753b48771e),
  [`914f9ed`](https://github.com/n1ru4l/envelop/commit/914f9ed3b753f771d938b4beb8fd31753b48771e)]:
  - @envelop/core@5.2.3
  - @envelop/on-resolve@5.1.3

## 7.1.2

### Patch Changes

- [#2484](https://github.com/n1ru4l/envelop/pull/2484)
  [`26137e7`](https://github.com/n1ru4l/envelop/commit/26137e7c3d0ff349af90724867c715f3b3809a7d)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/promise-helpers@^1.2.4` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.2.4)
    (from `^1.0.0`, in `dependencies`)

- [#2484](https://github.com/n1ru4l/envelop/pull/2484)
  [`26137e7`](https://github.com/n1ru4l/envelop/commit/26137e7c3d0ff349af90724867c715f3b3809a7d)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/promise-helpers@^1.2.4` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.2.4)
    (from `^1.0.0`, in `dependencies`)
- Updated dependencies
  [[`26137e7`](https://github.com/n1ru4l/envelop/commit/26137e7c3d0ff349af90724867c715f3b3809a7d),
  [`26137e7`](https://github.com/n1ru4l/envelop/commit/26137e7c3d0ff349af90724867c715f3b3809a7d)]:
  - @envelop/core@5.2.2
  - @envelop/on-resolve@5.1.2

## 7.1.1

### Patch Changes

- Updated dependencies
  [[`90dd1a6`](https://github.com/n1ru4l/envelop/commit/90dd1a665e027ec309df4411f04a310806ee8f15),
  [`90dd1a6`](https://github.com/n1ru4l/envelop/commit/90dd1a665e027ec309df4411f04a310806ee8f15)]:
  - @envelop/core@5.2.1
  - @envelop/on-resolve@5.1.1

## 7.1.0

### Patch Changes

- Updated dependencies
  [[`a107c89`](https://github.com/n1ru4l/envelop/commit/a107c896d7a7b1af7417ed0708be336db2ecbb54),
  [`a107c89`](https://github.com/n1ru4l/envelop/commit/a107c896d7a7b1af7417ed0708be336db2ecbb54)]:
  - @envelop/core@5.2.0
  - @envelop/on-resolve@5.1.0

## 7.0.2

### Patch Changes

- [#2455](https://github.com/n1ru4l/envelop/pull/2455)
  [`5b6a166`](https://github.com/n1ru4l/envelop/commit/5b6a166f5e2c12e6aa4679eb4e3209de43b0efc1)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@whatwg-node/promise-helpers@^1.0.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.0.0)
    (to `dependencies`)
- Updated dependencies
  [[`5b6a166`](https://github.com/n1ru4l/envelop/commit/5b6a166f5e2c12e6aa4679eb4e3209de43b0efc1),
  [`5b6a166`](https://github.com/n1ru4l/envelop/commit/5b6a166f5e2c12e6aa4679eb4e3209de43b0efc1)]:
  - @envelop/core@5.1.1
  - @envelop/on-resolve@5.0.1

## 7.0.1

### Patch Changes

- [#2443](https://github.com/n1ru4l/envelop/pull/2443)
  [`75ae40e`](https://github.com/n1ru4l/envelop/commit/75ae40e9fe744fb74fea71c098589a2211c142fc)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency [`lodash.get@^4.4.2` ↗︎](https://www.npmjs.com/package/lodash.get/v/4.4.2) (to
    `dependencies`)
  - Added dependency [`ms@^2.1.3` ↗︎](https://www.npmjs.com/package/ms/v/2.1.3) (to `dependencies`)
  - Removed dependency
    [`graphql-middleware@^6.1.35` ↗︎](https://www.npmjs.com/package/graphql-middleware/v/6.1.35)
    (from `dependencies`)
  - Removed dependency
    [`graphql-rate-limit@^3.3.0` ↗︎](https://www.npmjs.com/package/graphql-rate-limit/v/3.3.0)
    (from `dependencies`)

## 7.0.0

### Patch Changes

- Updated dependencies
  [[`9bd1b20`](https://github.com/n1ru4l/envelop/commit/9bd1b207861540f9bee085026b9fab725a88e84e)]:
  - @envelop/core@5.1.0
  - @envelop/on-resolve@5.0.0

## 6.2.1

### Patch Changes

- [#2330](https://github.com/n1ru4l/envelop/pull/2330)
  [`b1210bc`](https://github.com/n1ru4l/envelop/commit/b1210bcb1aad1545e953c48ca3adfc064e854a2d)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Added dependency
    [`graphql-middleware@^6.1.35` ↗︎](https://www.npmjs.com/package/graphql-middleware/v/6.1.35)
    (to `dependencies`)

- [#2330](https://github.com/n1ru4l/envelop/pull/2330)
  [`b1210bc`](https://github.com/n1ru4l/envelop/commit/b1210bcb1aad1545e953c48ca3adfc064e854a2d)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Add graphql-middleware as a dependency

## 6.2.0

### Minor Changes

- [#2292](https://github.com/n1ru4l/envelop/pull/2292)
  [`c3dd2c3`](https://github.com/n1ru4l/envelop/commit/c3dd2c3525b42fcab773e0ae8a637caea5c33558)
  Thanks [@ardatan](https://github.com/ardatan)! - Now you can define a custom string interpolation
  function to be used in the rate limit message. This is useful when you want to include dynamic
  values in the message.

  ```ts
  useRateLimiter({
    configByField: [
      {
        type: 'Query',
        field: 'search', // You can also use glob patterns
        max: 10,
        window: '1m',
        message:
          'My custom message with interpolated values: ${args.searchTerm} and ${context.user.id}'
      }
    ],
    interpolateMessage: (message, args, context) => {
      return message.replace(/\${(.*?)}/g, (_, key) => {
        return key.split('.').reduce((acc, part) => acc[part], { args, context })
      })
    }
  })
  ```

- [#2292](https://github.com/n1ru4l/envelop/pull/2292)
  [`c3dd2c3`](https://github.com/n1ru4l/envelop/commit/c3dd2c3525b42fcab773e0ae8a637caea5c33558)
  Thanks [@ardatan](https://github.com/ardatan)! - New directive SDL;

  ```graphql
  directive @rateLimit(
    max: Int
    window: String
    message: String
    identityArgs: [String]
    arrayLengthField: String
    readOnly: Boolean
    uncountRejected: Boolean
  ) on FIELD_DEFINITION
  ```

- [#2292](https://github.com/n1ru4l/envelop/pull/2292)
  [`c3dd2c3`](https://github.com/n1ru4l/envelop/commit/c3dd2c3525b42fcab773e0ae8a637caea5c33558)
  Thanks [@ardatan](https://github.com/ardatan)! - Programmatic API to define rate limit
  configuration in addition to directives

  ```ts
  useRateLimiter({
    configByField: [
      {
        type: 'Query',
        field: 'search', // You can also use glob patterns
        max: 10,
        window: '1m'
      }
    ]
  })
  ```

### Patch Changes

- [#2292](https://github.com/n1ru4l/envelop/pull/2292)
  [`c3dd2c3`](https://github.com/n1ru4l/envelop/commit/c3dd2c3525b42fcab773e0ae8a637caea5c33558)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`graphql-rate-limit@^3.3.0` ↗︎](https://www.npmjs.com/package/graphql-rate-limit/v/3.3.0)
    (from `3.3.0`, in `dependencies`)
  - Added dependency
    [`@graphql-tools/utils@^10.5.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.5.4)
    (to `dependencies`)
  - Added dependency [`minimatch@^10.0.1` ↗︎](https://www.npmjs.com/package/minimatch/v/10.0.1) (to
    `dependencies`)

- [#2276](https://github.com/n1ru4l/envelop/pull/2276)
  [`ba368ba`](https://github.com/n1ru4l/envelop/commit/ba368bac9539177689eb9e561f388cff7f0cf048)
  Thanks [@deggertsen](https://github.com/deggertsen)! - useRateLimiter will now accept all options
  available to graphql-rate-limit getGraphQLRateLimiter function so that they are usable.
- Updated dependencies
  [[`c3dd2c3`](https://github.com/n1ru4l/envelop/commit/c3dd2c3525b42fcab773e0ae8a637caea5c33558),
  [`c3dd2c3`](https://github.com/n1ru4l/envelop/commit/c3dd2c3525b42fcab773e0ae8a637caea5c33558)]:
  - @envelop/on-resolve@4.1.1
  - @envelop/core@5.0.2

## 6.1.0

### Patch Changes

- Updated dependencies
  [[`408f5be3`](https://github.com/n1ru4l/envelop/commit/408f5be3943775157c9ae29f0d9c7ee78c3c369e)]:
  - @envelop/on-resolve@4.1.0

## 6.0.0

### Major Changes

- [#1986](https://github.com/n1ru4l/envelop/pull/1986)
  [`68e7a2a5`](https://github.com/n1ru4l/envelop/commit/68e7a2a59a2f9872652b4bae28f30c3a2fb70487)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - **Breaking Change:** Support of Node 16
  is dropped.

- Updated dependencies
  [[`68e7a2a5`](https://github.com/n1ru4l/envelop/commit/68e7a2a59a2f9872652b4bae28f30c3a2fb70487),
  [`f7ef03c0`](https://github.com/n1ru4l/envelop/commit/f7ef03c07ae1af3abf08de86bc95fe626bbc7913)]:
  - @envelop/core@5.0.0

### Patch Changes

- Updated dependencies
  [[`68e7a2a5`](https://github.com/n1ru4l/envelop/commit/68e7a2a59a2f9872652b4bae28f30c3a2fb70487)]:
  - @envelop/on-resolve@4.0.0

## 5.0.3

### Patch Changes

- [#1927](https://github.com/n1ru4l/envelop/pull/1927)
  [`e3c90116`](https://github.com/n1ru4l/envelop/commit/e3c9011640b73aaede4e5e472a5d45aab947165c)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@envelop/on-resolve@^3.0.2` ↗︎](https://www.npmjs.com/package/@envelop/on-resolve/v/3.0.2)
    (from `^3.0.1`, in `dependencies`)
  - Updated dependency
    [`@envelop/core@^4.0.2` ↗︎](https://www.npmjs.com/package/@envelop/core/v/4.0.2) (from
    `^4.0.1`, in `peerDependencies`)

- Updated dependencies
  [[`dee6b8d2`](https://github.com/n1ru4l/envelop/commit/dee6b8d215f21301660090037b6685e86d217593)]:
  - @envelop/core@4.0.3
- Updated dependencies
  [[`e3c90116`](https://github.com/n1ru4l/envelop/commit/e3c9011640b73aaede4e5e472a5d45aab947165c)]:
  - @envelop/on-resolve@3.0.3

## 5.0.2

### Patch Changes

- Updated dependencies
  [[`db20864a`](https://github.com/n1ru4l/envelop/commit/db20864aac3fcede3e265ae63b2e8cb4664ba23a)]:
  - @envelop/core@4.0.2
- Updated dependencies []:
  - @envelop/on-resolve@3.0.2

## 5.0.1

### Patch Changes

- Updated dependencies []:
  - @envelop/core@4.0.1
- Updated dependencies []:
  - @envelop/on-resolve@3.0.1

## 5.0.0

### Major Changes

- [#1776](https://github.com/n1ru4l/envelop/pull/1776)
  [`332f1f22`](https://github.com/n1ru4l/envelop/commit/332f1f221f655421a850adb834afe549d50b4fac)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 and require Node 16 or higher

- Updated dependencies
  [[`332f1f22`](https://github.com/n1ru4l/envelop/commit/332f1f221f655421a850adb834afe549d50b4fac),
  [`a36925c7`](https://github.com/n1ru4l/envelop/commit/a36925c7df0538f88b51682e4e23f4b16f6fae2b)]:
  - @envelop/core@4.0.0

### Patch Changes

- Updated dependencies
  [[`332f1f22`](https://github.com/n1ru4l/envelop/commit/332f1f221f655421a850adb834afe549d50b4fac),
  [`7066ce98`](https://github.com/n1ru4l/envelop/commit/7066ce98df8e4ed18be618eb821ca50074557452)]:
  - @envelop/on-resolve@3.0.0

## 4.0.6

### Patch Changes

- [#1725](https://github.com/n1ru4l/envelop/pull/1725)
  [`c1eb2c09`](https://github.com/n1ru4l/envelop/commit/c1eb2c09ac535b076a5c13430c3892d98f7ef957)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - dependencies updates:
  - Updated dependency [`tslib@^2.5.0` ↗︎](https://www.npmjs.com/package/tslib/v/2.5.0) (from
    `^2.4.0`, in `dependencies`)

- Updated dependencies
  [[`c1eb2c09`](https://github.com/n1ru4l/envelop/commit/c1eb2c09ac535b076a5c13430c3892d98f7ef957)]:
  - @envelop/core@3.0.6
- Updated dependencies []:
  - @envelop/on-resolve@2.0.6

## 4.0.5

### Patch Changes

- Updated dependencies
  [[`270249cf`](https://github.com/n1ru4l/envelop/commit/270249cfb7650f8ad64f0167bb45a99475a03b04)]:
  - @envelop/core@3.0.5
- Updated dependencies []:
  - @envelop/on-resolve@2.0.5

## 4.0.4

### Patch Changes

- Updated dependencies []:
  - @envelop/core@3.0.4
- Updated dependencies []:
  - @envelop/on-resolve@2.0.4

## 4.0.3

### Patch Changes

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

## 3.6.0

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

## 3.5.0

### Minor Changes

- Updated dependencies
  [[`5a5f5c04`](https://github.com/n1ru4l/envelop/commit/5a5f5c04177b9e1379fd77db5d6383160879d449),
  [`d828f129`](https://github.com/n1ru4l/envelop/commit/d828f1291254a0f9dfdc3654611087859e4c9708)]:
  - @envelop/core@2.5.0

## 3.4.2

### Patch Changes

- 071f946: Fix CommonJS TypeScript resolution with `moduleResolution` `node16` or `nodenext`
- Updated dependencies [071f946]
  - @envelop/core@2.4.2

## 3.4.1

### Patch Changes

- Updated dependencies [787d28a2]
  - @envelop/core@2.4.1

## 3.4.0

### Minor Changes

- 8bb2738: Support TypeScript module resolution.
- Updated dependencies [8bb2738]
  - @envelop/core@2.4.0

## 3.3.3

### Patch Changes

- fbf6155: update package.json repository links to point to the new home
- Updated dependencies [fbf6155]
  - @envelop/core@2.3.3

## 3.3.2

### Patch Changes

- Updated dependencies [07d029b]
  - @envelop/core@2.3.2

## 3.3.1

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

## 1.3.0

### Minor Changes

- b343f4a: Support {{id}} interpolation and onRateLimitError callback
- b343f4a: Introduce transformError to modify the error

## 1.2.1

### Patch Changes

- b1a0331: Properly list `@envelop/core` as a `peerDependency` in plugins.

  This resolves issues where the bundled envelop plugins published to npm had logic inlined from the
  `@envelop/core` package, causing `instanceof` check of `EnvelopError` to fail.

- Updated dependencies [b1a0331]
  - @envelop/core@1.6.1

## 1.2.0

### Minor Changes

- 090cae4: GraphQL v16 support

## 1.1.0

### Minor Changes

- 04120de: add support for GraphQL.js 16

## 1.0.0

### Major Changes

- 40bc444: v1 major release for envelop packages

## 0.1.1

### Patch Changes

- 28ad742: Improve TypeScript types

## 0.1.0

### Minor Changes

- eb6f53b: ESM Support for all plugins and envelop core

## 0.0.1

### Patch Changes

- 5fc65a4: Create @envelope/rate-limiter plugin
