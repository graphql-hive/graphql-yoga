#### `usePayloadFormatter`

Allow you to format/modify execution result payload before returning it to your consumer.

The second argument `executionArgs` provides additional information for your formatter. It consists
of contextValue, variableValues, document, operationName, and other properties.

```ts
import { execute, parse, subscribe, validate } from 'graphql'
import { envelop, useEngine, usePayloadFormatter } from '@envelop/core'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    usePayloadFormatter((result, executionArgs) => {
      // Return a modified result here,
      // Or `false`y value to keep it as-is.
    })
    // ... other plugins ...
  ]
})
```
