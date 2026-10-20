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

- Bump `@graphql-tools/utils` to `^13.1.0` and `@graphql-tools/schema` to `^11.0.0` ([graphql-tools#8515](https://github.com/ardatan/graphql-tools/pull/8515), [graphql-tools#8540](https://github.com/ardatan/graphql-tools/pull/8540), [graphql-tools#8546](https://github.com/ardatan/graphql-tools/pull/8546), [graphql-tools#8550](https://github.com/ardatan/graphql-tools/pull/8550)). Incremental HTTP spec mapping (`INCREMENTAL_DELIVERY_SPECS`) lands in utils via [graphql-tools#8552](https://github.com/ardatan/graphql-tools/pull/8552).
- Bump `@graphql-tools/executor` to `^4.1.0` ([graphql-tools#8536](https://github.com/ardatan/graphql-tools/pull/8536), [graphql-tools#8550](https://github.com/ardatan/graphql-tools/pull/8550)): use `getVariableValues` from `graphql` (no longer re-exported from executor); pass `incrementalSpec: 'v0.1' | 'v0.2'` for incremental delivery payload format.
- Bump `@graphql-tools/graphql-tag-pluck` to `9.0.1` ([graphql-tools#8537](https://github.com/ardatan/graphql-tools/pull/8537)).

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
