---
'graphql-yoga': minor
---

Limit the size of incoming HTTP request bodies by default to protect against denial-of-service
attacks from oversized payloads.

Requests whose `Content-Length` exceeds the limit are rejected with an HTTP 413 response before
the body is read, and the limit is also enforced while streaming the body so that requests with a
missing, incorrect, or chunked-transfer-encoded body are covered too.

The default limit is 25 MB. Configure it with the new `maxRequestBodySize` option, or set it to
`false` to disable the limit (not recommended unless an upstream reverse proxy already enforces
one):

```ts
createYoga({
  // Allow bodies up to 25 MB
  maxRequestBodySize: 25_000_000,
})
```

Also return an HTTP 400 response for malformed `multipart/form-data` requests (e.g. a missing or
invalid `boundary`), instead of masking the parse error as a generic 500 Internal Server Error.