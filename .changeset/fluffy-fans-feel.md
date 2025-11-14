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

```json
{
  "data": null,
  "errors": [
    {
      "locations": [{ "column": 3, "line": 1 }],
      "message": "An Error Occured",
      "path": ["a"],
      "coordinate": "Query.a"
    }
  ]
}
```

## Security concerns

Adding a schema coordinate to errors exposes information about the schema, which can be an attack
vector if you rely on the fact your schema is private and secret.

This is why the `coordinate` attribute is masked from error by default when running in production
mode (`NODE_ENV != 'development'`). The `coordinate` attribute is still part of the error object,
but is hidden at serialization time so that it is not exposed to the client.

You can customize error masking by providing the `errorMasking` option:

```ts
import { createYoga, useErrorCoordinate } from 'graphql-yoga'
import { schema } from './schema'

export const yoga = createYoga({
  schema,
  plugins: [useErrorCoordinate()],
  maskedErrors: {
    isDev: process.env['NODE_ENV'] === 'development', // when `isDev` is true, errors are not masked
    maskError: (error, message, isDev) => {
      //... you can provide your own masking logic, to always expose `coordinate` for example.
    }
  }
})
```
