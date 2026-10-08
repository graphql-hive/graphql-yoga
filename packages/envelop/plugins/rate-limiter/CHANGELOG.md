# @envelop/rate-limiter

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
