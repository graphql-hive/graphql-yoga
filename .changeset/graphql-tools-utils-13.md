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
---

### Dependencies

- Bump `@graphql-tools/utils` to `^13.0.0`, `@graphql-tools/schema` to `^11.0.0`, and `@graphql-tools/executor` to `^3.0.0` ([graphql-tools#8515](https://github.com/ardatan/graphql-tools/pull/8515)).

### Breaking Changes

- `createGraphQLError` is removed. Use `new GraphQLError(message, options)` from `graphql`. To attach Yoga's experimental schema coordinate, use `withSchemaCoordinate(error, coordinate)` (read with `getSchemaCoordinate` from `@graphql-tools/utils`, re-exported by Yoga).
- Yoga no longer re-exports `mapAsyncIterator`, `isPromise`, `fakePromise`, `handleMaybePromise`, or `MaybePromise`. Import them from `@whatwg-node/promise-helpers`.
- `@envelop/core` `utils` no longer re-exports `mapAsyncIterator` or `isPromise`. Import from `@whatwg-node/promise-helpers`.

### Migration

```ts
import { GraphQLError } from 'graphql';
import { handleMaybePromise, isPromise, type MaybePromise } from '@whatwg-node/promise-helpers';
import { withSchemaCoordinate, getSchemaCoordinate } from 'graphql-yoga';

throw withSchemaCoordinate(new GraphQLError('not found'), 'Query.user');
```
