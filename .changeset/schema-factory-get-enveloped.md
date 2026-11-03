---
'graphql-yoga': patch
---

A schema factory function now works when `getEnveloped` is called outside of the request pipeline,
for example by `graphql-ws`. Instead of throwing "Request object is not available in the context",
the factory is called with the context passed to `getEnveloped`, and it has to return the schema
synchronously there.
