#### `useSchema`

This plugin is the simplest plugin for specifying your GraphQL schema. You can specify a schema
created from any tool that emits `GraphQLSchema` object.

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine, useSchema } from '@envelop/core'

const mySchema = buildSchema(/* ... */)

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    useSchema(mySchema)
    // ... other plugins ...
  ]
})
```
