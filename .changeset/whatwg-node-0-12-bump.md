---
'graphql-yoga': major
'@envelop/core': major
'@envelop/on-resolve': major
---

### Dependencies

- Bump `@whatwg-node/server` to `^0.12.0`, `@whatwg-node/fetch` to `^0.11.0`, and `@whatwg-node/promise-helpers` to `^2.0.0`.
- Request body size limiting uses `@whatwg-node/server`'s `useLimitRequestBodySize` directly (HTTP `onRequest`) with GraphQL error JSON via `responseFromError`.
- Unread request bodies are discarded after the response is decided (keep-alive friendly).
- Incoming global `Request` instances automatically use the native Fetch API (`pickRightFetchAPI`), so Next.js no longer needs `fetchAPI: { Response }`.

### Breaking Changes

- `engines.node` is now `>=22.15.0` (aligned with whatwg-node 0.12).
- `@envelop/core` no longer exports `mapMaybePromise` (removed upstream in `@whatwg-node/promise-helpers` v2). Use `handleMaybePromise(() => value, ...)` instead.
