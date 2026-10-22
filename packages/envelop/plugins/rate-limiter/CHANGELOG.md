# @envelop/rate-limiter

## 11.0.0

### Major Changes

- [#4574](https://github.com/graphql-hive/graphql-yoga/pull/4574)
  [`79b0e8b`](https://github.com/graphql-hive/graphql-yoga/commit/79b0e8b0fc344b5e205e5d99aed33fdf0a98bd6b)
  Thanks [@egoodwinx](https://github.com/egoodwinx)! - ### Breaking Changes
  - **Node**: minimum supported version is now Node 22. Node 18 and 20 are no longer supported.
    Future releases will only support Node >=22.
  - **GraphQL**: minimum supported version is now GraphQL 16. GraphQL 14 and 15 are no longer
    supported.
  - **Request body parsing**: Yoga now limits request bodies to 25,000,000 bytes by default.
    Enforcing this limit streams the body through a byte counter, making POST body parsing
    asynchronous even for an in-memory body. As a result, `yoga.fetch()` can return a Promise where
    it previously returned a synchronous Response, even when all resolvers and plugins are
    synchronous.

  ### Migration
  - If you're on Node 18/20, upgrade to Node 22 or later before upgrading this package.
  - If you're on graphql 14/15, upgrade to graphql 16 or 17 first.
  - Await `yoga.fetch()` and response body parsing instead of relying on synchronous results. Set
    `maxRequestBodySize: false` in `createYoga` to disable the body-size limit and preserve
    synchronous parsing for in-memory bodies, but only if you enforce an appropriate request-body
    limit elsewhere.

- [#4623](https://github.com/graphql-hive/graphql-yoga/pull/4623)
  [`be89d05`](https://github.com/graphql-hive/graphql-yoga/commit/be89d0595fbdc2f8db838befd5d08287fcaad13f)
  Thanks [@ardatan](https://github.com/ardatan)! - ### Dependencies
  - Bump `@graphql-tools/utils` to `^13.1.1`, `@graphql-tools/schema` to `^11.0.0`, and
    `@graphql-tools/executor` to `^4.1.2`.

  ### Incremental delivery

  Yoga maps the GraphQL HTTP `Accept` header through `INCREMENTAL_DELIVERY_SPECS` from
  `@graphql-tools/utils` onto executor `incrementalSpec`. `multipart/mixed;incrementalSpec=v0.2`
  runs the v0.2 payload format and echoes that spec on `Content-Type`.
  `multipart/mixed;deferSpec=20220824` or bare `multipart/mixed` stays on v0.1. An unsupported
  incremental spec yields 406.

  A later incremental spec is a graphql-tools table row plus an executor publisher. Yoga, Hive
  Gateway, and HTTP executors pick it up by bumping `@graphql-tools/utils` /
  `@graphql-tools/executor`.

  ### Breaking Changes
  - `createGraphQLError` is removed. Use `new GraphQLError(message, options)` from `graphql`. To
    attach Yoga's experimental schema coordinate, use `withSchemaCoordinate(error, coordinate)` and
    read with `getSchemaCoordinate` from `@graphql-tools/utils`.
  - `mapMaybePromise` is removed (was exported from Yoga / `@envelop/core`). Use
    `handleMaybePromise` from `@whatwg-node/promise-helpers`.
  - Yoga no longer re-exports helpers that already live upstream:
    - `getSchemaCoordinate` -> `@graphql-tools/utils`
    - `mergeSchemas` -> `@graphql-tools/schema`
    - `DisposableSymbols` -> `@whatwg-node/server`
    - `mapAsyncIterator` / `isPromise` / `fakePromise` / `handleMaybePromise` / `MaybePromise` ->
      `@whatwg-node/promise-helpers`
  - `@envelop/core` `utils` no longer re-exports `mapAsyncIterator` or `isPromise`. Import from
    `@whatwg-node/promise-helpers`.
  - Use `asGetArgumentValuesVariables` / `coerceGetVariableValuesResult` from `@graphql-tools/utils`
    for GraphQL 16/17 `VariableValues` compatibility.

  ### Migration

  ```ts
  import { GraphQLError } from 'graphql'
  import { withSchemaCoordinate } from 'graphql-yoga'
  import { mergeSchemas } from '@graphql-tools/schema'
  import { getSchemaCoordinate } from '@graphql-tools/utils'
  import { handleMaybePromise, isPromise, type MaybePromise } from '@whatwg-node/promise-helpers'
  import { DisposableSymbols } from '@whatwg-node/server'

  throw withSchemaCoordinate(new GraphQLError('not found'), 'Query.user')
  ```

### Patch Changes

- Updated dependencies
  [[`862447a`](https://github.com/graphql-hive/graphql-yoga/commit/862447ad622be3cf945fe943b506add460eaf674),
  [`79b0e8b`](https://github.com/graphql-hive/graphql-yoga/commit/79b0e8b0fc344b5e205e5d99aed33fdf0a98bd6b),
  [`be89d05`](https://github.com/graphql-hive/graphql-yoga/commit/be89d0595fbdc2f8db838befd5d08287fcaad13f),
  [`79b0e8b`](https://github.com/graphql-hive/graphql-yoga/commit/79b0e8b0fc344b5e205e5d99aed33fdf0a98bd6b)]:
  - @envelop/core@6.0.0
  - @envelop/on-resolve@8.0.0

## 10.2.3

### Patch Changes

- [#4607](https://github.com/graphql-hive/graphql-yoga/pull/4607)
  [`d8b8860`](https://github.com/graphql-hive/graphql-yoga/commit/d8b8860c4c0deea72bb8aec7948caef695fa7d2a)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^12.0.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/12.0.3)
    (from `^11.2.2`, in `dependencies`)

## 10.2.2

### Patch Changes

- [#4604](https://github.com/graphql-hive/graphql-yoga/pull/4604)
  [`c6febdc`](https://github.com/graphql-hive/graphql-yoga/commit/c6febdc34e7f0d791c91f2e745ff0d388bf25b0c)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^11.2.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/11.2.2)
    (from `^11.2.0`, in `dependencies`)

## 10.2.1

### Patch Changes

- [#4577](https://github.com/graphql-hive/graphql-yoga/pull/4577)
  [`7bff35c`](https://github.com/graphql-hive/graphql-yoga/commit/7bff35cf0274d59ad5eaeeee3bfd0390fe593871)
  Thanks [@egoodwinx](https://github.com/egoodwinx)! - Add homepage and bugs.url to package.json
  files

- Updated dependencies
  [[`7bff35c`](https://github.com/graphql-hive/graphql-yoga/commit/7bff35cf0274d59ad5eaeeee3bfd0390fe593871)]:
  - @envelop/on-resolve@7.2.1
  - @envelop/core@5.6.1

## 10.2.0

### Minor Changes

- [#4545](https://github.com/graphql-hive/graphql-yoga/pull/4545)
  [`94ebe5b`](https://github.com/graphql-hive/graphql-yoga/commit/94ebe5b875d05c65506c5f0f9dcf89a84a9b6d76)
  Thanks [@egoodwinx](https://github.com/egoodwinx)! - Update to support graphql-js 17

  Bump package versions, fix expected typing, and update compatability with subscribe.

### Patch Changes

- Updated dependencies
  [[`94ebe5b`](https://github.com/graphql-hive/graphql-yoga/commit/94ebe5b875d05c65506c5f0f9dcf89a84a9b6d76)]:
  - @envelop/on-resolve@7.2.0
  - @envelop/core@5.6.0

## 10.1.0

### Minor Changes

- [#4530](https://github.com/graphql-hive/graphql-yoga/pull/4530)
  [`62c2cd1`](https://github.com/graphql-hive/graphql-yoga/commit/62c2cd1c563140a8850dbe0b66913bca39c2cfe5)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Field config now accepts an `identifier`
  template string as a lightweight alternative to `identifyFn`

  Supports `{args.argName}` and `{context.propName}` dot-path interpolation, equivalent to using
  `@rateLimit(identityArgs: [...])` via the directive but available in programmatic config.

  ```ts
  useRateLimiter({
    identifyFn: ctx => ctx.ip,
    configByField: [
      {
        type: 'Query',
        field: 'getProduct',
        window: '1m',
        max: 10,
        identifier: '{args.id}'
      },
      {
        type: 'Query',
        field: 'search',
        window: '1m',
        max: 30,
        identifier: '{context.ip}'
      }
    ]
  })
  ```

- [#4530](https://github.com/graphql-hive/graphql-yoga/pull/4530)
  [`62c2cd1`](https://github.com/graphql-hive/graphql-yoga/commit/62c2cd1c563140a8850dbe0b66913bca39c2cfe5)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - `identifyFn` now receives field argument
  values as a second parameter when used via `configByField`

  The per-field `identifyFn` on `ConfigByField` receives the resolved argument values, making it
  straightforward to rate limit unauthenticated requests by argument value without a directive.

  ```ts
  useRateLimiter({
    identifyFn: ctx => ctx.ip,
    configByField: [
      {
        type: 'Query',
        field: 'getProduct', // getProduct(id: ID!): Product!
        window: '1m',
        max: 10,
        identifyFn: (ctx, args) => String(args.id)
      }
    ]
  })
  ```

  Note: the root `identifyFn` also receives args as a second parameter when it acts as the fallback
  for a `configByField` entry, but args will be empty when it is invoked for directive-based rate
  limiting.
