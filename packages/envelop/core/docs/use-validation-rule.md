#### `useValidationRule`

This plugin is the simplest plugin for adding a validation rule to your GraphQL schema. You can
specify any function that conforms to
[the `ValidationRule` type](https://github.com/graphql/graphql-js/blob/8a95335f545024c09abfa0f07cc326f73a0e466f/src/validation/ValidationContext.ts#L269).

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine, useValidationRule } from '@envelop/core'
import { depthLimit } from '@graphile/depth-limit'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    useValidationRule(
      depthLimit({
        maxDepth: 12,
        maxListDepth: 4,
        maxSelfReferentialDepth: 2
      })
    )
    // ... other plugins ...
  ]
})
```
