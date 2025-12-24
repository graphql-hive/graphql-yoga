## `@envelop/parser-cache`

This plugins adds simple LRU caching to your `parse`, to improve performance by caching the parsed
result.

This plugins improves performance of parsing by ~60% (based on benchmarks).

## Getting Started

```
yarn add @envelop/parser-cache
```

## Usage Example

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { useParserCache } from '@envelop/parser-cache'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    // ... other plugins ...
    useParserCache({
      // options goes here
    })
  ]
})
```

### API Reference

#### `documentCache`

Set this to pass in a cache instance for caching documents. By default a new LRU cache is created
using default `max` and `ttl`.

#### `errorCache`

Set this to pass in a cache instance for caching errors. By default a new LRU cache is created using
default `max` and `ttl`.
