# @envelop/rate-limiter

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
