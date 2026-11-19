---
'graphql-yoga': minor
---

The `stringify` serializer of an execution result may now return the UTF-8 encoded JSON as a `Uint8Array`, which is used as the response body as is. Batched and event-stream responses decode it.
