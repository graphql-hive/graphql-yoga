## `@envelop/immediate-introspection`

## Getting Started

```
yarn add @envelop/immediate-introspection
```

## Usage Example

Context building can be costly and require calling remote services. For simple GraphQL operations
that only select introspection fields building a context is not necessary.

The `useImmediateIntrospection` can be used to short circuit any further context building if a
GraphQL operation selection set only includes introspection fields within the selection set.

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine, useImmediateIntrospection } from '@envelop/core'
import { schema } from './schema'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    useSchema(schema),
    useImmediateIntrospection()
    // additional plugins
  ]
})
```

In case you want to authorize that an user is authenticated before allowing introspection the plugin
must be placed in front of the `useImmediateIntrospection()` call.

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine, useImmediateIntrospection } from '@envelop/core'
import { schema } from './schema'
import { useAuthorization } from './useAuthorization'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    useSchema(schema),
    useAuthorization(), // place this before
    useImmediateIntrospection()
    // additional plugins
  ]
})
```
