#### `useErrorHandler`

This plugin triggers a custom function when execution encounters an error.

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine, useErrorHandler } from '@envelop/core'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    useErrorHandler((errors, args) => {
      // This callback is called once, containing all GraphQLError emitted during execution phase
    })
    // ... other plugins ...
  ]
})
```
