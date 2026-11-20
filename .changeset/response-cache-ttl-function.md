---
'@envelop/response-cache': minor
'@graphql-yoga/plugin-response-cache': minor
---

`ttlPerType` and `ttlPerSchemaCoordinate` now also accept a function, which allows to opt out of caching for every type that is not explicitly listed (e.g. `typeName => ttls[typeName] ?? 0`). Plain objects keep working as before.
