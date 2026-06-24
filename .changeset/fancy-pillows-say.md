---
'@envelop/rate-limiter': minor
---

Field config now accepts an `identifier` template string as a lightweight alternative to `identifyFn`

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
      identifier: '{args.id}',
    },
    {
      type: 'Query',
      field: 'search',
      window: '1m',
      max: 30,
      identifier: '{context.ip}',
    },
  ],
})
```
