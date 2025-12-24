#### `useLogger`

Logs parameters and information about the execution phases. You can easily plug your custom logger.

```ts
import { execute, parse, subscribe, validate } from 'graphql'
import { envelop, specifiedRules, useEngine, useLogger } from '@envelop/core'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    useLogger({
      logFn: (eventName, args) => {
        // Event could be `execute-start` / `execute-end` / `subscribe-start` / `subscribe-end`
        // `args` will include the arguments passed to execute/subscribe (in case of "start" event) and additional result in case of "end" event.
      }
    })
    // ... other plugins ...
  ]
})
```
