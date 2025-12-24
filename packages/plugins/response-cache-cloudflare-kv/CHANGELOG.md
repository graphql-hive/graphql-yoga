# @envelop/response-cache-cloudflare-kv

## 6.0.0

### Patch Changes

- Updated dependencies []:
  - @envelop/response-cache@9.0.0

## 5.0.0

### Patch Changes

- Updated dependencies
  [[`35539a7`](https://github.com/graphql-hive/envelop/commit/35539a780ef5f062006bb6bfb25d5ee77f5bf299)]:
  - @envelop/response-cache@8.1.0

## 4.0.0

### Patch Changes

- Updated dependencies []:
  - @envelop/response-cache@8.0.0

## 3.1.3

### Patch Changes

- Updated dependencies []:
  - @envelop/response-cache@7.1.3

## 3.1.2

### Patch Changes

- Updated dependencies
  [[`26137e7`](https://github.com/n1ru4l/envelop/commit/26137e7c3d0ff349af90724867c715f3b3809a7d),
  [`26137e7`](https://github.com/n1ru4l/envelop/commit/26137e7c3d0ff349af90724867c715f3b3809a7d)]:
  - @envelop/response-cache@7.1.2

## 3.1.1

### Patch Changes

- Updated dependencies []:
  - @envelop/response-cache@7.1.1

## 3.1.0

### Patch Changes

- Updated dependencies []:
  - @envelop/response-cache@7.1.0

## 3.0.0

### Patch Changes

- Updated dependencies
  [[`9bd1b20`](https://github.com/n1ru4l/envelop/commit/9bd1b207861540f9bee085026b9fab725a88e84e)]:
  - @envelop/response-cache@7.0.0

## 2.0.0

### Patch Changes

- Updated dependencies
  [[`7882ffb`](https://github.com/n1ru4l/envelop/commit/7882ffb5fd60ecb7dd5c1a291d6f7d619bdd2a23)]:
  - @envelop/response-cache@6.3.0

## 1.0.0

### Minor Changes

- [#2238](https://github.com/n1ru4l/envelop/pull/2238)
  [`430ee7d`](https://github.com/n1ru4l/envelop/commit/430ee7d78dea04d0a44312bdfd16062a675d9772)
  Thanks [@ardatan](https://github.com/ardatan)! - BREAKING: Now the cache implementation does not
  require the `ExecutionContext` or `KVNamespace` instance but only the name of the namespace

  ```ts
  import { createSchema, createYoga, YogaInitialContext } from 'graphql-yoga'
  import { useResponseCache } from '@envelop/response-cache'
  import { createKvCache } from '@envelop/response-cache-cloudflare-kv'
  import { resolvers } from './graphql-schema/resolvers.generated'
  import { typeDefs } from './graphql-schema/typeDefs.generated'

  export type Env = {
    GRAPHQL_RESPONSE_CACHE: KVNamespace
  }

  const graphqlServer = createYoga<Env & ExecutionContext>({
    schema: createSchema({ typeDefs, resolvers }),
    plugins: [
      useResponseCache({
        cache: createKvCache({
          KVName: 'GRAPHQL_RESPONSE_CACHE',
          keyPrefix: 'graphql' // optional
        }),
        session: () => null,
        includeExtensionMetadata: true,
        ttl: 1000 * 10 // 10 seconds
      })
    ]
  })

  export default {
    fetch: graphqlServer
  }
  ```

### Patch Changes

- Updated dependencies
  [[`430ee7d`](https://github.com/n1ru4l/envelop/commit/430ee7d78dea04d0a44312bdfd16062a675d9772)]:
  - @envelop/response-cache@6.2.0

## 0.3.0

### Minor Changes

- [#2105](https://github.com/n1ru4l/envelop/pull/2105)
  [`a2c7657`](https://github.com/n1ru4l/envelop/commit/a2c7657a22b8292a30bbb570f963776a08892891)
  Thanks [@AdiRishi](https://github.com/AdiRishi)! - Change @cloudflare/workers-types to an optional
  peer dependency of the package

### Patch Changes

- Updated dependencies
  [[`ee1b3c0`](https://github.com/n1ru4l/envelop/commit/ee1b3c05e01a7e5e7564cd8136f3bc2e558089b9),
  [`4a1e50b`](https://github.com/n1ru4l/envelop/commit/4a1e50bfbda0b9ee399cdf55c65a682e4f753aa9)]:
  - @envelop/response-cache@6.1.2

## 0.2.0

### Minor Changes

- [#2057](https://github.com/n1ru4l/envelop/pull/2057)
  [`78c2f26`](https://github.com/n1ru4l/envelop/commit/78c2f26eb4c485f6c8d009bfb8bb366b6f0c5d77)
  Thanks [@AdiRishi](https://github.com/AdiRishi)! - Initial release

### Patch Changes

- Updated dependencies
  [[`cafc43f`](https://github.com/n1ru4l/envelop/commit/cafc43f444f17a9d6fc2f283e3ba31a14c568b51),
  [`09a4bc1`](https://github.com/n1ru4l/envelop/commit/09a4bc146753faa84c7eaa3ba934fb3b66ea0640)]:
  - @envelop/response-cache@6.1.1
