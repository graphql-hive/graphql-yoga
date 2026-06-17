---
'@envelop/rate-limiter': minor
---

`identifyFn` now receives field argument values as a second parameter when used via `configByField`

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
      identifyFn: (ctx, args) => String(args.id),
    },
  ],
})
```

Note: the root `identifyFn` also receives args as a second parameter when it acts as the fallback
for a `configByField` entry, but args will be empty when it is invoked for directive-based rate
limiting.
