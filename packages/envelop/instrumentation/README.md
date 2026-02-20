## `@envelop/instrumentation`

This package contains utility functions and types to ease the use of instrumentation accross
Envelop, Yoga, whatwg-node and Hive Gateway plugins.

> [!NOTE] Instrumentation are automatically composed together. This should only be used if the
> default ordering doesn't suit your needs (ie. instrumentation and hooks should be executed in
> different order)

## `composeInstrumentation(instrumentation: Instrumentation[]): Instrumentation`

This function composes all the instrumentation into one. The instrumentation will be called in the
same order as they are in the array (from top to bottom).

```ts
import { composeInstrumentation } from '@envelop/instrumentation'

// Extract instrumentation to compose from their plugins
const { instrumentation: instrumentation1, ...plugin1 } = usePlugin1()
const { instrumentation: instrumentation2, ...plugin2 } = usePlugin2()

const getEnveloped = envelop({
  plugins: [
    plugin1,
    plugin2,
    // Plugin instrumentation and plugin hooks will be executed in a different order
    { instrumentation: composeInstrumentation([instrumentation1, instrumentation2]) }
  ]
})
```
