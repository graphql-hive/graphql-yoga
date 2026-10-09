---
'graphql-yoga': major
'@envelop/core': major
'@envelop/on-resolve': major
---

### Dependencies

- Bump `@whatwg-node/server` to `^0.13.0`, `@whatwg-node/fetch` to `^0.12.0`, and `@whatwg-node/promise-helpers` to `^2.0.0`.
- Delegate to @whatwg-node/server's useLimitRequestBodySize instead of a
hand-rolled byte counter, and swap in the native TransformStream when the
incoming request already has a native ReadableStream body — piping it
through the ponyfill TransformStream throws since they're different
realms. Thread an optional `fetchAPI` param through handle/parseRequest/
getResultForParams so callers can override which fetchAPI (native vs
ponyfill) the rest of the pipeline uses.
- Unread request bodies are discarded after the response is decided (keep-alive friendly).
- Incoming global `Request` instances automatically use the native Fetch API (`pickRightFetchAPI`), so Next.js no longer needs `fetchAPI: { Response }`.

### Breaking Changes

- `engines.node` is now `>=22.15.0` (aligned with whatwg-node 0.12+/0.13).
- `@envelop/core` no longer exports `mapMaybePromise` (removed upstream in `@whatwg-node/promise-helpers` v2). Use `handleMaybePromise(() => value, ...)` instead.
- `@whatwg-node/fetch` no longer exports `crypto`; use the platform `crypto` global. `TextEncoder` still comes from `fetchAPI` where hashing goes through Yoga’s FetchAPI.
