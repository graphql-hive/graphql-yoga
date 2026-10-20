---
'graphql-yoga': major
'@envelop/core': major
'@envelop/apollo-datasources': major
'@envelop/extended-validation': major
'@envelop/filter-operation-type': major
'@envelop/generic-auth': major
'@envelop/rate-limiter': major
'@envelop/resource-limitations': major
'@envelop/live-query': major
'@envelop/response-cache': major
'@envelop/testing': major
'@envelop/fragment-arguments': major
'@graphql-yoga/plugin-apollo-inline-trace': major
'@graphql-yoga/plugin-apollo-usage-report': major
'@graphql-yoga/plugin-defer-stream': major
'@graphql-yoga/plugin-sofa': major
'@graphql-yoga/apollo-link': major
'@graphql-yoga/urql-exchange': major
'@graphql-yoga/graphiql': major
'@graphql-yoga/nestjs': major
---

### Dependencies

- Bump `@graphql-tools/utils` to `^13.1.1`, `@graphql-tools/schema` to `^11.0.0`, and `@graphql-tools/executor` to `^4.1.1`.

### Incremental delivery

Yoga maps the GraphQL HTTP `Accept` header through `INCREMENTAL_DELIVERY_SPECS` from `@graphql-tools/utils` onto executor `incrementalSpec`. `multipart/mixed;incrementalSpec=v0.2` runs the v0.2 payload format and echoes that spec on `Content-Type`. `multipart/mixed;deferSpec=20220824` or bare `multipart/mixed` stays on v0.1. An unsupported incremental spec yields 406.

A later incremental spec is a graphql-tools table row plus an executor publisher. Yoga, Hive Gateway, and HTTP executors pick it up by bumping `@graphql-tools/utils` / `@graphql-tools/executor`.

### Breaking Changes

- `createGraphQLError` is removed. Use `new GraphQLError(message, options)` from `graphql`. To attach Yoga's experimental schema coordinate, use `withSchemaCoordinate(error, coordinate)` and read with `getSchemaCoordinate` from `@graphql-tools/utils`.
- Yoga no longer re-exports helpers that already live upstream:
  - `getSchemaCoordinate` -> `@graphql-tools/utils`
  - `mergeSchemas` -> `@graphql-tools/schema`
  - `DisposableSymbols` -> `@whatwg-node/server`
  - `mapAsyncIterator` / `isPromise` / `fakePromise` / `handleMaybePromise` / `MaybePromise` -> `@whatwg-node/promise-helpers`
- `@envelop/core` `utils` no longer re-exports `mapAsyncIterator` or `isPromise`. Import from `@whatwg-node/promise-helpers`.
- Use `asGetArgumentValuesVariables` / `coerceGetVariableValuesResult` from `@graphql-tools/utils` for GraphQL 16/17 `VariableValues` compatibility.

### Migration

```ts
import { GraphQLError } from 'graphql';
import { getSchemaCoordinate } from '@graphql-tools/utils';
import { mergeSchemas } from '@graphql-tools/schema';
import { DisposableSymbols } from '@whatwg-node/server';
import { handleMaybePromise, isPromise, type MaybePromise } from '@whatwg-node/promise-helpers';
import { withSchemaCoordinate } from 'graphql-yoga';

throw withSchemaCoordinate(new GraphQLError('not found'), 'Query.user');
```
