# @envelop/response-cache

## 9.0.0

### Patch Changes

- Updated dependencies
  [[`0434fbd`](https://github.com/graphql-hive/envelop/commit/0434fbdf9e6a33a64f5cb5fe34662ea4815647eb)]:
  - @envelop/core@5.4.0

## 8.1.0

### Minor Changes

- [#2258](https://github.com/graphql-hive/envelop/pull/2258)
  [`35539a7`](https://github.com/graphql-hive/envelop/commit/35539a780ef5f062006bb6bfb25d5ee77f5bf299)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Deprecate `ttlPerType` in favor of
  `ttlPerSchemaCoordinate`, for a more streamlined API

  ## Migration instructions

  If you where using `ttlPerType`, you can merge the object into the `ttlPerSchemaCoordinate`, the
  syntax doesn't change.

  ```diff
  useResponseCache({
    session: null,
  - ttlPerType: {
  -   User: 10_000,
  -   Profile: 600_000,
  - },
    ttlPerSchemaCoordinate: {
      'Query.me': 0
  +    User: 10_000,
  +    Profile: 600_000,
    }
  })
  ```

## 8.0.2

### Patch Changes

- [#2262](https://github.com/graphql-hive/envelop/pull/2262)
  [`2525301`](https://github.com/graphql-hive/envelop/commit/25253013bb5a717d362c2aad1bfd8ca5e88d15b0)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`lru-cache@^11.0.0` ↗︎](https://www.npmjs.com/package/lru-cache/v/11.0.0)
    (from `^10.0.0`, in `dependencies`)
- Updated dependencies
  [[`92948d8`](https://github.com/graphql-hive/envelop/commit/92948d8c060e45a02e55101045b74df76320616d)]:
  - @envelop/core@5.3.2

## 8.0.1

### Patch Changes

- [#2611](https://github.com/graphql-hive/envelop/pull/2611)
  [`8dd5bda`](https://github.com/graphql-hive/envelop/commit/8dd5bda4cd23e9bb32ed0513d76fab3800452ef9)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Add a `withState` override to ease the
  typing of plugins whith the same state for all scopes.

- Updated dependencies
  [[`8dd5bda`](https://github.com/graphql-hive/envelop/commit/8dd5bda4cd23e9bb32ed0513d76fab3800452ef9)]:
  - @envelop/core@5.3.1

## 8.0.0

### Patch Changes

- Updated dependencies
  [[`3ebaa3b`](https://github.com/graphql-hive/envelop/commit/3ebaa3b75b34f9a61aa517166f538796b383bfad)]:
  - @envelop/core@5.3.0

## 7.1.3

### Patch Changes

- Updated dependencies
  [[`914f9ed`](https://github.com/n1ru4l/envelop/commit/914f9ed3b753f771d938b4beb8fd31753b48771e),
  [`914f9ed`](https://github.com/n1ru4l/envelop/commit/914f9ed3b753f771d938b4beb8fd31753b48771e)]:
  - @envelop/core@5.2.3

## 7.1.2

### Patch Changes

- [#2484](https://github.com/n1ru4l/envelop/pull/2484)
  [`26137e7`](https://github.com/n1ru4l/envelop/commit/26137e7c3d0ff349af90724867c715f3b3809a7d)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Added dependency
    [`@whatwg-node/promise-helpers@^1.2.4` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.2.4)
    (to `dependencies`)

- [#2484](https://github.com/n1ru4l/envelop/pull/2484)
  [`26137e7`](https://github.com/n1ru4l/envelop/commit/26137e7c3d0ff349af90724867c715f3b3809a7d)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Added dependency
    [`@whatwg-node/promise-helpers@^1.2.4` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.2.4)
    (to `dependencies`)
- Updated dependencies
  [[`26137e7`](https://github.com/n1ru4l/envelop/commit/26137e7c3d0ff349af90724867c715f3b3809a7d),
  [`26137e7`](https://github.com/n1ru4l/envelop/commit/26137e7c3d0ff349af90724867c715f3b3809a7d)]:
  - @envelop/core@5.2.2

## 7.1.1

### Patch Changes

- Updated dependencies
  [[`90dd1a6`](https://github.com/n1ru4l/envelop/commit/90dd1a665e027ec309df4411f04a310806ee8f15),
  [`90dd1a6`](https://github.com/n1ru4l/envelop/commit/90dd1a665e027ec309df4411f04a310806ee8f15)]:
  - @envelop/core@5.2.1

## 7.1.0

### Patch Changes

- Updated dependencies
  [[`a107c89`](https://github.com/n1ru4l/envelop/commit/a107c896d7a7b1af7417ed0708be336db2ecbb54),
  [`a107c89`](https://github.com/n1ru4l/envelop/commit/a107c896d7a7b1af7417ed0708be336db2ecbb54)]:
  - @envelop/core@5.2.0

## 7.0.1

### Patch Changes

- Updated dependencies
  [[`5b6a166`](https://github.com/n1ru4l/envelop/commit/5b6a166f5e2c12e6aa4679eb4e3209de43b0efc1)]:
  - @envelop/core@5.1.1

## 7.0.0

### Patch Changes

- [#2438](https://github.com/n1ru4l/envelop/pull/2438)
  [`9bd1b20`](https://github.com/n1ru4l/envelop/commit/9bd1b207861540f9bee085026b9fab725a88e84e)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle instance objects properly (JS Date etc)

- Updated dependencies
  [[`9bd1b20`](https://github.com/n1ru4l/envelop/commit/9bd1b207861540f9bee085026b9fab725a88e84e)]:
  - @envelop/core@5.1.0

## 6.3.0

### Minor Changes

- [#2392](https://github.com/n1ru4l/envelop/pull/2392)
  [`7882ffb`](https://github.com/n1ru4l/envelop/commit/7882ffb5fd60ecb7dd5c1a291d6f7d619bdd2a23)
  Thanks [@ardatan](https://github.com/ardatan)! - New `onTtl` hook to manipulate TTL of the cached
  response

## 6.2.5

### Patch Changes

- [#2337](https://github.com/n1ru4l/envelop/pull/2337)
  [`931a6da`](https://github.com/n1ru4l/envelop/commit/931a6dad4b179c77d061c6da90e858c49ab3092d)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.10.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.10.0)
    (from `^0.9.0`, in `dependencies`)

## 6.2.4

### Patch Changes

- [`c1720a8`](https://github.com/n1ru4l/envelop/commit/c1720a8ff4fb2ecc246da8e147f032ee46adda00)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix handling of primitive list values that was
  introduced in the last release.

## 6.2.3

### Patch Changes

- [#2310](https://github.com/n1ru4l/envelop/pull/2310)
  [`9ddb3bd`](https://github.com/n1ru4l/envelop/commit/9ddb3bd77772255715159d699c4273616c46e566)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - internal refactors

## 6.2.2

### Patch Changes

- [#2309](https://github.com/n1ru4l/envelop/pull/2309)
  [`4fd5917`](https://github.com/n1ru4l/envelop/commit/4fd5917d09988a175624ea75540a1a8aeaf89fbf)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Strip `__responseCacheId` and
  `__responseCacheTypeName` from incremental delivery execution result.

## 6.2.1

### Patch Changes

- [#2266](https://github.com/n1ru4l/envelop/pull/2266)
  [`389d5f6`](https://github.com/n1ru4l/envelop/commit/389d5f696a209fd82f92157769d2b28114d8c454)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - The plugin now try to reduce the size
  of the resulting query by not adding a `__typename` aliased selection if `__typename` is already
  selected.

## 6.2.0

### Minor Changes

- [#2238](https://github.com/n1ru4l/envelop/pull/2238)
  [`430ee7d`](https://github.com/n1ru4l/envelop/commit/430ee7d78dea04d0a44312bdfd16062a675d9772)
  Thanks [@ardatan](https://github.com/ardatan)! - Accept a factory function to `cache` that takes
  the context and returns the cache implementation

## 6.1.2

### Patch Changes

- [#2111](https://github.com/n1ru4l/envelop/pull/2111)
  [`ee1b3c0`](https://github.com/n1ru4l/envelop/commit/ee1b3c05e01a7e5e7564cd8136f3bc2e558089b9)
  Thanks [@klippx](https://github.com/klippx)! - Fixes return type of shouldCacheResult

* [`4a1e50b`](https://github.com/n1ru4l/envelop/commit/4a1e50bfbda0b9ee399cdf55c65a682e4f753aa9)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Do not cache response with a TTL equal
  to 0, whatever API is used to define the TTL

## 6.1.1

### Patch Changes

- [#2094](https://github.com/n1ru4l/envelop/pull/2094)
  [`cafc43f`](https://github.com/n1ru4l/envelop/commit/cafc43f444f17a9d6fc2f283e3ba31a14c568b51)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Run enabled once only in execution

* [#2090](https://github.com/n1ru4l/envelop/pull/2090)
  [`09a4bc1`](https://github.com/n1ru4l/envelop/commit/09a4bc146753faa84c7eaa3ba934fb3b66ea0640)
  Thanks [@klippx](https://github.com/klippx)! - Fix TTL being NaN when using `@cacheControl`
  without `maxAge` argument.

## 6.1.0

### Minor Changes

- [#2044](https://github.com/n1ru4l/envelop/pull/2044)
  [`5d87e987`](https://github.com/n1ru4l/envelop/commit/5d87e987010c002f581b85d3970dfed8f4f5db1a)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Expose `hashSHA256` sha256
  implementation to ease the customization of cache key factory.

## 6.0.1

### Patch Changes

- [`4183b275`](https://github.com/n1ru4l/envelop/commit/4183b2752d22e82bc819d2b5adc20f2dedf6697c)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Fix leak of cache metadata in the
  result when cache is skipped.

## 6.0.0

### Major Changes

- [#1986](https://github.com/n1ru4l/envelop/pull/1986)
  [`68e7a2a5`](https://github.com/n1ru4l/envelop/commit/68e7a2a59a2f9872652b4bae28f30c3a2fb70487)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - **Breaking Change:** Support of Node 16
  is dropped.

* [#1977](https://github.com/n1ru4l/envelop/pull/1977)
  [`a4343bee`](https://github.com/n1ru4l/envelop/commit/a4343beefedafe0965fa9713b52ce5df1e80571c)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - The `enable` parameter now allows to
  entirely disable caching. It is checked eagerly and disables all cache related processing.

  **Breaking Change:**

  Previously, `enable` was only controlling cache reading. This means that previously, the automatic
  cache invalidation was still working even with `enable` returning false, which is no longer the
  case. The alternative is to cautiously invalidate data in the related resolvers.

* Updated dependencies
  [[`68e7a2a5`](https://github.com/n1ru4l/envelop/commit/68e7a2a59a2f9872652b4bae28f30c3a2fb70487),
  [`f7ef03c0`](https://github.com/n1ru4l/envelop/commit/f7ef03c07ae1af3abf08de86bc95fe626bbc7913)]:
  - @envelop/core@5.0.0

## 5.5.0

### Minor Changes

- [#1970](https://github.com/n1ru4l/envelop/pull/1970)
  [`b2ce17e2`](https://github.com/n1ru4l/envelop/commit/b2ce17e235a3e6708f21c45726e5382bedf56951)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Automatically add the entities id to
  the request document. This change allows the plugin to not require anymore each query to carefuly
  include all keys of all entities.

## 5.4.0

### Minor Changes

- [#1961](https://github.com/n1ru4l/envelop/pull/1961)
  [`eccdcad6`](https://github.com/n1ru4l/envelop/commit/eccdcad63df682506f6e17b68694d596212fca42)
  Thanks [@marhaupe](https://github.com/marhaupe)! - Fix cache invalidations when result contains
  empty values

## 5.3.2

### Patch Changes

- [#1927](https://github.com/n1ru4l/envelop/pull/1927)
  [`e3c90116`](https://github.com/n1ru4l/envelop/commit/e3c9011640b73aaede4e5e472a5d45aab947165c)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@envelop/core@^4.0.2` ↗︎](https://www.npmjs.com/package/@envelop/core/v/4.0.2) (from
    `^4.0.1`, in `peerDependencies`)

* [`c9e493b8`](https://github.com/n1ru4l/envelop/commit/c9e493b8d62121f573e9f40406dc7bc866a3cf93)
  Thanks [@ardatan](https://github.com/ardatan)! - Ignore subscriptions in response caching

* Updated dependencies
  [[`dee6b8d2`](https://github.com/n1ru4l/envelop/commit/dee6b8d215f21301660090037b6685e86d217593)]:
  - @envelop/core@4.0.3

## 5.3.1

### Patch Changes

- [#1956](https://github.com/n1ru4l/envelop/pull/1956)
  [`d427c338`](https://github.com/n1ru4l/envelop/commit/d427c338f2666b4b92a9002a9489c21c389dfd3d)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not add \_\_typename in the root of
  subscription operations

- [#1955](https://github.com/n1ru4l/envelop/pull/1955)
  [`83b77b60`](https://github.com/n1ru4l/envelop/commit/83b77b6030b979b382d334a45015c7cb7adeda13)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Handle mutations when using `@defer` or
  `@stream` directives

- Updated dependencies
  [[`db20864a`](https://github.com/n1ru4l/envelop/commit/db20864aac3fcede3e265ae63b2e8cb4664ba23a)]:
  - @envelop/core@4.0.2

## 5.3.0

### Minor Changes

- [#1941](https://github.com/n1ru4l/envelop/pull/1941)
  [`be16ad2c`](https://github.com/n1ru4l/envelop/commit/be16ad2c8b77e8ce44c279b9b242618e57d51d2e)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Give access to the context in the cache
  key builder function

## 5.2.0

### Minor Changes

- [#1884](https://github.com/n1ru4l/envelop/pull/1884)
  [`58174743`](https://github.com/n1ru4l/envelop/commit/58174743ad0f638423cea2d7f100147e0317c72a)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - add support for scopes to enforce cache
  privacy

- [#1896](https://github.com/n1ru4l/envelop/pull/1896)
  [`834e1e39`](https://github.com/n1ru4l/envelop/commit/834e1e396c5f4b055fce52e61927a99cde6f7a6c)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - add support for @defer and @stream

### Patch Changes

- [#1896](https://github.com/n1ru4l/envelop/pull/1896)
  [`834e1e39`](https://github.com/n1ru4l/envelop/commit/834e1e396c5f4b055fce52e61927a99cde6f7a6c)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.0.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.0.3)
    (from `^10.0.0`, in `dependencies`)

- Updated dependencies []:
  - @envelop/core@4.0.1

## 5.1.0

### Minor Changes

- [#1603](https://github.com/n1ru4l/envelop/pull/1603)
  [`ea907c60`](https://github.com/n1ru4l/envelop/commit/ea907c609b97242510fa78b2848a98e4b26108bc)
  Thanks [@ardatan](https://github.com/ardatan)! - Support for
  `directive @cacheControl(maxAge: Int) on FIELD_DEFINITION | OBJECT | INTERFACE | UNION`

### Patch Changes

- [#1879](https://github.com/n1ru4l/envelop/pull/1879)
  [`d3ecee35`](https://github.com/n1ru4l/envelop/commit/d3ecee350883eabd99fd9fe4fa58c72a616cc6b5)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`lru-cache@^10.0.0` ↗︎](https://www.npmjs.com/package/lru-cache/v/10.0.0)
    (from `^9.1.1`, in `dependencies`)

- [#1883](https://github.com/n1ru4l/envelop/pull/1883)
  [`84eb5b46`](https://github.com/n1ru4l/envelop/commit/84eb5b464a9ec89391aa52d2296700fcc5d4763c)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - fix response cache extensions type

## 5.0.1

### Patch Changes

- [#1873](https://github.com/n1ru4l/envelop/pull/1873)
  [`914d78c3`](https://github.com/n1ru4l/envelop/commit/914d78c33d527137f4b7c69982b30044e91fda33)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not revisit cached parser result which adds
  extra \_\_typename properties in the execution result

## 5.0.0

### Major Changes

- [#1776](https://github.com/n1ru4l/envelop/pull/1776)
  [`332f1f22`](https://github.com/n1ru4l/envelop/commit/332f1f221f655421a850adb834afe549d50b4fac)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 and require Node 16 or higher

- [#1767](https://github.com/n1ru4l/envelop/pull/1767)
  [`0b127cc4`](https://github.com/n1ru4l/envelop/commit/0b127cc40f2e6a003a05cbeb0b6f004a08ada9d2)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - bump lru cache dependency version

- Updated dependencies
  [[`332f1f22`](https://github.com/n1ru4l/envelop/commit/332f1f221f655421a850adb834afe549d50b4fac),
  [`a36925c7`](https://github.com/n1ru4l/envelop/commit/a36925c7df0538f88b51682e4e23f4b16f6fae2b)]:
  - @envelop/core@4.0.0

### Patch Changes

- [#1767](https://github.com/n1ru4l/envelop/pull/1767)
  [`0b127cc4`](https://github.com/n1ru4l/envelop/commit/0b127cc40f2e6a003a05cbeb0b6f004a08ada9d2)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - dependencies updates:
  - Updated dependency [`lru-cache@^9.1.1` ↗︎](https://www.npmjs.com/package/lru-cache/v/9.1.1)
    (from `^6.0.0`, in `dependencies`)

- [#1776](https://github.com/n1ru4l/envelop/pull/1776)
  [`332f1f22`](https://github.com/n1ru4l/envelop/commit/332f1f221f655421a850adb834afe549d50b4fac)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^10.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.0.0)
    (from `^8.8.0`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/fetch@^0.9.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.9.0)
    (from `^0.8.0`, in `dependencies`)

- [#1728](https://github.com/n1ru4l/envelop/pull/1728)
  [`a36925c7`](https://github.com/n1ru4l/envelop/commit/a36925c7df0538f88b51682e4e23f4b16f6fae2b)
  Thanks [@ardatan](https://github.com/ardatan)! - - Memoize parsed document string result and use
  it wherever possible, and export `getDocumentString` function to allow users to use it as well.
  - Use `WeakMap`s with `DocumentNode` wherever possible instead of using LRU Cache with strings. It
    is more optimal if a parser caching is used

## 4.0.8

### Patch Changes

- [#1735](https://github.com/n1ru4l/envelop/pull/1735)
  [`972c087f`](https://github.com/n1ru4l/envelop/commit/972c087fb3a47076588121cc6079278276654377)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.8.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.8.0)
    (from `^0.6.5`, in `dependencies`)

## 4.0.7

### Patch Changes

- [#1725](https://github.com/n1ru4l/envelop/pull/1725)
  [`c1eb2c09`](https://github.com/n1ru4l/envelop/commit/c1eb2c09ac535b076a5c13430c3892d98f7ef957)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - dependencies updates:
  - Updated dependency [`tslib@^2.5.0` ↗︎](https://www.npmjs.com/package/tslib/v/2.5.0) (from
    `^2.4.0`, in `dependencies`)

- Updated dependencies
  [[`c1eb2c09`](https://github.com/n1ru4l/envelop/commit/c1eb2c09ac535b076a5c13430c3892d98f7ef957)]:
  - @envelop/core@3.0.6

## 4.0.6

### Patch Changes

- [#1724](https://github.com/n1ru4l/envelop/pull/1724)
  [`94e39a5d`](https://github.com/n1ru4l/envelop/commit/94e39a5de56409fdda58e9dd5c9472366e95171a)
  Thanks [@ardatan](https://github.com/ardatan)! - - Respect existing extensions in the result
  - Add `cacheKey` to `shouldCacheResult` function
- Updated dependencies
  [[`270249cf`](https://github.com/n1ru4l/envelop/commit/270249cfb7650f8ad64f0167bb45a99475a03b04)]:
  - @envelop/core@3.0.5

## 4.0.5

### Patch Changes

- [#1623](https://github.com/n1ru4l/envelop/pull/1623)
  [`d50fa6f0`](https://github.com/n1ru4l/envelop/commit/d50fa6f0b71e9ceb13b492e3a0961a6e9d75824f)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@whatwg-node/fetch@^0.6.5` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.6.5) (to
    `dependencies`)

- [#1625](https://github.com/n1ru4l/envelop/pull/1625)
  [`8a90f541`](https://github.com/n1ru4l/envelop/commit/8a90f5411dce07ae23915cced951708517bb6da5)
  Thanks [@mayrn-techdivision](https://github.com/mayrn-techdivision)! - Fix ignoredTypes and
  ttlPerType not working for types without id field

- [#1623](https://github.com/n1ru4l/envelop/pull/1623)
  [`d50fa6f0`](https://github.com/n1ru4l/envelop/commit/d50fa6f0b71e9ceb13b492e3a0961a6e9d75824f)
  Thanks [@ardatan](https://github.com/ardatan)! - Use WhatWG crypto

## 4.0.4

### Patch Changes

- Updated dependencies []:
  - @envelop/core@3.0.4

## 4.0.3

### Patch Changes

- Updated dependencies
  [[`6b48ef96`](https://github.com/n1ru4l/envelop/commit/6b48ef962020eb7dfd2918626b8a394bff673e4f)]:
  - @envelop/core@3.0.3

## 4.0.2

### Patch Changes

- [#1560](https://github.com/n1ru4l/envelop/pull/1560)
  [`22f5ccfb`](https://github.com/n1ru4l/envelop/commit/22f5ccfbe69eb052cda6c1908425b63e3d906243)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Plugins with context generic for correct
  inheritance

- Updated dependencies
  [[`22f5ccfb`](https://github.com/n1ru4l/envelop/commit/22f5ccfbe69eb052cda6c1908425b63e3d906243)]:
  - @envelop/core@3.0.2

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

## 3.2.0

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

## 3.1.0

### Minor Changes

- Updated dependencies
  [[`5a5f5c04`](https://github.com/n1ru4l/envelop/commit/5a5f5c04177b9e1379fd77db5d6383160879d449),
  [`d828f129`](https://github.com/n1ru4l/envelop/commit/d828f1291254a0f9dfdc3654611087859e4c9708)]:
  - @envelop/core@2.5.0

## 3.0.2

### Patch Changes

- 071f946: Fix CommonJS TypeScript resolution with `moduleResolution` `node16` or `nodenext`
- Updated dependencies [071f946]
  - @envelop/core@2.4.2

## 3.0.1

### Patch Changes

- Updated dependencies [787d28a2]
  - @envelop/core@2.4.1

## 3.0.0

### Major Changes

- 887fc07: **BREAKING** Require the user to provide a `session` function by default.

  Previously, using the response cache automatically used a global cache. For security reasons there
  is no longer a default value for the `session` config property. If you did not set the `session`
  function before and want a global cache that is shared by all users, you need to update your code
  to the following:

  ```ts
  import { envelop } from '@envelop/core'
  import { useResponseCache } from '@envelop/response-cache'

  const getEnveloped = envelop({
    plugins: [
      // ... other plugins ...
      useResponseCache({
        // use global cache for all operations
        session: () => null
      })
    ]
  })
  ```

  Otherwise, you should return from your cache function a value that uniquely identifies the viewer.

  ```ts
  import { envelop } from '@envelop/core'
  import { useResponseCache } from '@envelop/response-cache'

  const getEnveloped = envelop({
    plugins: [
      // ... other plugins ...
      useResponseCache({
        // return null as a fallback for caching the result globally
        session: context => context.user?.id ?? null
      })
    ]
  })
  ```

- a5d8dcb: **Better default document string storage**

  Previously non parsed operation document was stored in the context with a symbol to be used
  "documentString" in the later. But this can be solved with a "WeakMap" so the modification in the
  context is no longer needed.

  **BREAKING CHANGE**: Replace `getDocumentStringFromContext` with `getDocumentString`

  However, some users might provide document directly to the execution without parsing it via
  `parse`. So in that case, we replaced the context parameter with the execution args including
  `document`, `variableValues` and `contextValue` to the new `getDocumentString`.

  Now a valid document string should be returned from the new `getDocumentString`.

  **Custom document string caching example.**

  ```ts
  const myCache = new WeakMap<DocumentNode, string>()

  // Let's say you keep parse results in somewhere else like below
  function parseDocument(document: string): DocumentNode {
    const parsedDocument = parse(document)
    myCache.set(parsedDocument, document)
    return parsedDocument
  }

  // Then you can interact with your existing caching solution inside the response cache plugin like below
  useResponseCache({
    getDocumentString(document: DocumentNode): string {
      // You can also add a fallback to `graphql-js`'s print function
      // to let the plugin works
      const possibleDocumentStr = myCache.get(document)
      if (!possibleDocumentStr) {
        console.warn(`Something might be wrong with my cache setup`)
        return print(document)
      }
      return possibleDocumentStr
    }
  })
  ```

  **Migration from `getDocumentStringFromContext`.**

  So if you use `getDocumentStringFromContext` like below before;

  ```ts
  function getDocumentStringFromContext(contextValue: any) {
    return contextValue.myDocumentString
  }
  ```

  You have to change it to the following;

  ```ts
  import { print } from 'graphql'

  function getDocumentString(executionArgs: ExecutionArgs) {
    // We need to fallback to `graphql`'s print to return a value no matter what.
    return executionArgs.contextValue.myDocumentString ?? print(executionArgs.document)
  }
  ```

## 2.4.0

### Minor Changes

- 8bb2738: Support TypeScript module resolution.
- Updated dependencies [8bb2738]
  - @envelop/core@2.4.0

## 2.3.3

### Patch Changes

- fbf6155: update package.json repository links to point to the new home
- Updated dependencies [fbf6155]
  - @envelop/core@2.3.3

## 2.3.2

### Patch Changes

- Updated dependencies [07d029b]
  - @envelop/core@2.3.2

## 2.3.1

### Patch Changes

- Updated dependencies [d5c2c9a]
  - @envelop/core@2.3.1

## 2.3.0

### Minor Changes

- Updated dependencies [af23408]
  - @envelop/core@2.3.0

## 2.2.0

### Minor Changes

- Updated dependencies [ada7fb0]
- Updated dependencies [d5115b4]
- Updated dependencies [d5115b4]
  - @envelop/core@2.2.0

## 2.1.1

### Patch Changes

- 5400c3f: fix infinite loop while applying schema transforms

## 2.1.0

### Minor Changes

- Updated dependencies [78b3db2]
- Updated dependencies [f5eb436]
  - @envelop/core@2.1.0

## 2.0.0

### Patch Changes

- Updated dependencies [4106e08]
- Updated dependencies [aac65ef]
- Updated dependencies [4106e08]
  - @envelop/core@2.0.0

## 1.0.1

### Patch Changes

- 3dfddb5: Bump graphql-tools/utils to v8.6.1 to address a bug in getArgumentsValues
- Updated dependencies [3dfddb5]
  - @envelop/core@1.7.1

## 1.0.0

### Patch Changes

- Updated dependencies [d9cfb7c]
  - @envelop/core@1.7.0

## 0.6.0

### Minor Changes

- b919b21: Add cross-platform support for platforms that do not have the `Node.js` `crypto` module
  available by using the `WebCrypto` API. This adds support for deno, cloudflare workers and the
  browser.

  **BREAKING**: The `BuildResponseCacheKeyFunction` function type now returns `Promise<string>`
  instead of `string.`. The function `defaultBuildResponseCacheKey` now returns a `Promise`. The
  `UseResponseCacheParameter.buildResponseCacheKey` config option must return a `Promise`.
  **BREAKING**: The `defaultBuildResponseCacheKey` now uses the hash algorithm `SHA256` instead of
  `SHA1`.

## 0.5.1

### Patch Changes

- b1a0331: Properly list `@envelop/core` as a `peerDependency` in plugins.

  This resolves issues where the bundled envelop plugins published to npm had logic inlined from the
  `@envelop/core` package, causing `instanceof` check of `EnvelopError` to fail.

- Updated dependencies [b1a0331]
  - @envelop/core@1.6.1

## 0.5.0

### Minor Changes

- 090cae4: GraphQL v16 support

## 0.4.0

### Minor Changes

- 04120de: add support for GraphQL.js 16

## 0.3.0

### Minor Changes

- 0623cf7: Introspection query operations are no longer cached by default.

  In case you still want to cache query operations you can set the `ttlPerSchemaCoordinate`
  parameter to `{ "Query.__schema": undefined }` for caching introspection forever or
  `{ "Query.__schema": 100 }` for caching introspection for a specific time. We do not recommend
  caching introspection.

  Query operation execution results that contain errors are no longer cached.

## 0.2.1

### Patch Changes

- 9688945: Allow to set ttl=0 to disable caching, and use ttlPerType to maintain a whitelist
- a749ec0: Include operationName for building the cache key hash. Previously, sending the same
  operation document with a different operationName value could result in the wrong response being
  served from the cache.

  Use `fast-json-stable-stringify` for stringifying the variableValues. This will ensure that the
  cache is hit more often as the variable value serialization is now more stable.

## 0.2.0

### Minor Changes

- 075fc77: Expose metadata by setting the `includeExtensionMetadata` option.
  - `extension.responseCache.hit` - Whether the result was served form the cache or not
  - `extension.responseCache.invalidatedEntities` - Entities that got invalidated by a mutation
    operation

  Take a look at the README for mor information and examples.

## 0.1.0

### Minor Changes

- 823b335: initial release
