---
'graphql-yoga': patch
---

A schema factory function now works when `getEnveloped` is called outside of the request pipeline,
for example by `graphql-ws`. When the context passed to `getEnveloped` has a Fetch API `Request` as
`request`, the factory is called with that context instead of throwing "No schema found for this
request", and it has to return the schema synchronously there. The WebSocket recipes now pass the
upgrade request as `request`.
