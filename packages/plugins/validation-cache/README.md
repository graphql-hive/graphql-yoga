## `@envelop/validation-cache`

This plugins adds simple LRU caching to your `validate`, to improve performance by caching the
validation result.

This plugins improves performance of validating by ~50% (based on benchmarks).

## Getting Started

```
yarn add @envelop/validation-cache
```

## Usage Example

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { useValidationCache } from '@envelop/validation-cache'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    // ... other plugins ...
    useValidationCache({
      // options goes here
    })
  ]
})
```

### API Reference

#### `cache`

Set this to pass in a cache instance. By default a new LRU cache is created using default `max` and
`ttl`.
