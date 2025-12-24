#### `useExtendContext`

Easily extends the context with custom fields.

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine, useExtendContext } from '@envelop/core'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    useExtendContext(async contextSoFar => {
      return {
        myCustomField: {
          /* ... */
        }
      }
    })
    // ... other plugins ...
  ]
})
```
