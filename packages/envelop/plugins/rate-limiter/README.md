## `@envelop/rate-limiter`

This plugins uses [`graphql-rate-limit`](https://github.com/teamplanes/graphql-rate-limit#readme) in
order to limit the rate of calling queries and mutations.

## Getting Started

```
yarn add @envelop/rate-limiter
```

## Usage Example

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { IdentifyFn, useRateLimiter } from '@envelop/rate-limiter'

const identifyFn: IdentifyFn = context => {
  return context.request.ip
}

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    // ... other plugins ...
    useRateLimiter({
      identifyFn
    })
  ]
})
```

> By default, we assume that you have the GraphQL directive definition as part of your GraphQL
> schema (`directive @rateLimit(max: Int, window: String, message: String) on FIELD_DEFINITION`).

Then, in your GraphQL schema SDL, you can add `@rateLimit` directive to your fields, and the limiter
will get called only while resolving that specific field:

```graphql
type Query {
  posts: [Post]! @rateLimit(
    window: "5s", // time interval window for request limit quota
    max: 10,  // maximum requests allowed in time window
    message: "Too many calls!"  // quota reached error message
  )
  # unlimitedField: String
}
```

> You can apply that directive to any GraphQL `field` definition, not only to root fields.

### Error message interpolation

The `message` argument of the `@rateLimit` directive can be dynamic. You `{{var}}` or `{{ var }}`
syntax to interpolate variables.

```graphql
type Query {
  posts: [Post]! @rateLimit(window: "5s", max: 10, message: "Too many calls made by {{ id }}")
}
```

> The only available variable so far is `id`.

## Notes

All options available to the graphql-rate-limit getGraphQLRateLimiter function may also be passed
into useRateLimiter.

You can find more details here: https://github.com/teamplanes/graphql-rate-limit#readme
