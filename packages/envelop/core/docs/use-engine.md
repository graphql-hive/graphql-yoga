#### `useEngine`

This plugin can be used to customize the GraphQL Engine.

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'

const getEnveloped = envelop({
  plugins: [
    useEngine({
      parse,
      validate,
      specifiedRules,
      execute,
      subscribe
    })
  ]
})
```
