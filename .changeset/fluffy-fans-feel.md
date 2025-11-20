---
'graphql-yoga': minor
---

Add experimental support for
[`coordinate` error attribute proposal](https://github.com/graphql/graphql-spec/pull/1200).

The `coordinate` attribute indicates the coordinate in the schema of the resolver which experienced
the errors. It allows for an easier error source identification than with the `path` which can be
difficult to walk, or even lead to unsolvable ambiguities when using Union or Interface types.

## Usage

Since this is experimental, it has to be explicitly enabled by adding the appropriate plugin to the
Yoga instance:

```ts
import { createYoga, useErrorCoordinate } from 'graphql-yoga'
import { schema } from './schema'

export const yoga = createYoga({
  schema,
  plugins: [useErrorCoordinate()]
})
```

Once enabled, located errors will gain the `coordinate` attribute:

```ts
const myPlugin = {
  onExecutionResult({ result }) {
    if (result.errors) {
      for (const error of result.errors) {
        console.log('Error at', error.coordinate, ':', error.message)
      }
    }
  }
}
```

## Security concerns

Adding a schema coordinate to errors exposes information about the schema, which can be an attack
vector if you rely on the fact your schema is private and secret.

This is why the `coordinate` attribute is not serialized by default, and will not be exposed to
clients.

If you want to send this information to client, override either each `toJSON` error's method, or add
a dedicated extension.

```ts
import { GraphQLError } from 'graphql'
import { createYoga, maskError, useErrorCoordinate } from 'graphql-yoga'
import { schema } from './schema'

export const yoga = createYoga({
  schema,
  plugins: [useErrorCoordinate()],
  maskedErrors: {
    isDev: process.env['NODE_ENV'] === 'development', // when `isDev` is true, errors are not masked
    maskError: (error, message, isDev) => {
      if (error instanceof GraphQLError) {
        error.toJSON = () => {
          // Get default graphql serialized error representation
          const json = GraphQLError.prototype.toJSON.apply(error)
          // Manually add the coordinate attribute. You can also use extensions instead.
          json.coordinate = error.coordinate
          return json
        }
      }

      // Keep the default error masking implementation
      return maskError(error, message, isDev)
    }
  }
})
```
