---
'@envelop/response-cache': patch
---

The response cache no longer caches a result solely based on a type listed in `ttlPerType` when the result also contains a top-level type without an entry. Top-level result types without a specific TTL now fall back to the global `ttl`, so with `ttl: 0` and `ttlPerType: { First: 3600000 }` a result containing both `First` and an unlisted type is not cached, while a result containing only `First` still is.
