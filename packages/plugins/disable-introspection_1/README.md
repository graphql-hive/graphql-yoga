## `@envelop/disable-introspection`

This plugin injects the `NoSchemaIntrospectionCustomRule` validation rule exported from the
`graphql` module to the validation phase for disabling introspection.

## Getting Started

```
yarn add @envelop/disable-introspection
```

## Usage Example

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { useDisableIntrospection } from '@envelop/disable-introspection'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    useDisableIntrospection()
  ]
})
```

## Optional configuration

The plugin optionally accepts a configuration object:

```
{
  disableIf?: ({context, params}) => boolean
}
```

- `disableIf`: A function that allow you to evaluate the need to disable introspection, based on the
  incoming operation. If introspection needs to be disabled/enabled based on the dynamic parameter
  (GraphQL operation, or, incoming request/headers), use this function to determine when
  introspection needs to be disabled. Return true for disabling the introspection for the incoming
  operation, or false to allow introspection.
