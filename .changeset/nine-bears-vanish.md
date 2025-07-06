---
'@graphql-yoga/plugin-persisted-operations': minor
---

Add helper function `isPersistedDocumentContext`.

This function can help you determine whether the GraphQL execution is done within the context of a
persisted document and for example apply additional plugins or security measures conditionally.

**Usage Example: Enable max depth rule conditionally**

```ts
import { createYoga } from 'graphql-yoga'
import { maxDepthRule } from '@escape.tech/graphql-armor-max-depth'
import { usePersistedOperations, isPersistedDocumentContext } from '@graphql-yoga/plugin-persisted-operations'
import schema from './schema.js'
import store from './store.js'

const yoga = createYoga({
  plugins: [
    usePersistedOperations({
      getPersistedOperation(key: string) {
        return store.get(key) || null
      },
      allowArbitraryOperations: true
    }),
    {
      onValidate(ctx) {
        if (isPersistedDocumentContext(ctx.context)) {
          return
        }

        ctx.addValidationRule(
          maxDepthRule({
            n: 20
          })
        )
      }
    }
  ],
  schema
})
```
