## `@envelop/filter-operation-type`

This plugins injects a validation rule into the validation phase that only allows the specified
operation types (e.g. `subscription`, `query` or `mutation`).

## Getting Started

```
yarn add @envelop/filter-operation-type
```

## Usage Example

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { useFilterAllowedOperations } from '@envelop/filter-operation-type'

const getEnveloped = envelop({
  // only allow execution of subscription operations
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    useFilterAllowedOperations(['subscription'])
  ]
})
```
