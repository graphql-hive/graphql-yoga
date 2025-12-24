## `@envelop/execute-subscription-event`

Utilities for hooking into the
[ExecuteSubscriptionEvent](<https://spec.graphql.org/draft/#ExecuteSubscriptionEvent()>) phase.

### `useContextValuePerExecuteSubscriptionEvent`

Create a new context object per `ExecuteSubscriptionEvent` phase, allowing to bypass common issues
with context objects such as [`DataLoader`](https://github.com/graphql-hive/envelop/issues/80)
[caching](https://github.com/graphql/graphql-js/issues/894)
[issues](https://github.com/apollographql/subscriptions-transport-ws/issues/330).

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { useContextValuePerExecuteSubscriptionEvent } from '@envelop/execute-subscription-event'
import { createContext, createDataLoaders } from './context'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    useContext(() => createContext()),
    useContextValuePerExecuteSubscriptionEvent(() => ({
      // Existing context is merged with this context partial
      // By recreating the DataLoader we ensure no DataLoader caches from the previous event/initial field subscribe call are are hit
      contextPartial: {
        dataLoaders: createDataLoaders()
      }
    }))
    // ... other plugins ...
  ]
})
```

Alternatively, you can also provide a callback that is invoked after each
[`ExecuteSubscriptionEvent`](<https://spec.graphql.org/draft/#ExecuteSubscriptionEvent()>) phase.

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { useContextValuePerExecuteSubscriptionEvent } from '@envelop/execute-subscription-event'
import { createContext, createDataLoaders } from './context'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    useContext(() => createContext()),
    useContextValuePerExecuteSubscriptionEvent(({ args }) => ({
      onEnd: () => {
        // Note that onEnd is invoked only after each ExecuteSubscriptionEvent phase
        // This means the initial event will still use the cache from potential subscribe dataloader calls
        // If you use this to clear DataLoader caches it is recommended to not do any DataLoader calls within your field subscribe function.
        args.contextValue.dataLoaders.users.clearAll()
        args.contextValue.dataLoaders.posts.clearAll()
      }
    }))
    // ... other plugins ...
  ]
})
```
