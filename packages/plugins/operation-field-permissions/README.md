## `@envelop/operation-field-permissions`

Disallow executing operations that select certain fields. Useful if you want to restrict the scope
of certain public API users to a subset of the public GraphQL schema, without triggering execution
(e.g. how [graphql-shield](https://github.com/maticzav/graphql-shield) works).

**Note:** This plugin and authorization on a resolver level (or via middleware) are complementary.
You should still verify whether a viewer is allowed to access certain data within your resolvers.

## Installation

```bash
yarn add @envelop/operation-field-permissions
```

## Usage Example

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine, useSchema } from '@envelop/core'
import { useOperationFieldPermissions } from '@envelop/operation-field-permissions'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    useSchema(schema),
    useOperationFieldPermissions({
      // we can access graphql context here
      getPermissions: async context => new Set(['Query.greetings', ...context.viewer.permissions])
    })
    /* ... other envelops */
  ]
})
```

**Schema**

```graphql
type Query {
  greetings: [String!]!
  foo: String
}
```

**Operation**

```graphql
query {
  foo
}
```

**Response**

```json
{
  "data": null,
  "errors": [
    {
      "message": "Insufficient permissions for selecting 'Query.foo'.",
      "locations": [
        {
          "line": 2,
          "column": 2
        }
      ]
    }
  ]
}
```
