---
'graphql-yoga': major
'@envelop/core': major
'@envelop/on-resolve': major
---

### Dependencies

- Bump `@whatwg-node/server` to `^0.13.0`, `@whatwg-node/fetch` to `^0.12.0`, and `@whatwg-node/promise-helpers` to `^2.0.0`.
- Request body size limiting now wraps the selected request parser (HTTP `onRequestParse`) instead of replacing the request at `onRequest`, so `context.request` (and the `Request` object seen by plugin hooks) always stays the exact object passed to `yoga.fetch`. It still uses `@whatwg-node/server`'s `RequestBodyTooLargeError`/`InvalidContentLengthError` for GraphQL error JSON.
- Unread request bodies are discarded after the response is decided (keep-alive friendly).
- Incoming global `Request` instances automatically use the native Fetch API (`pickRightFetchAPI`), so Next.js no longer needs `fetchAPI: { Response }`.

### Breaking Changes

- `engines.node` is now `>=22.15.0` (aligned with whatwg-node 0.12+/0.13).
- `@envelop/core` no longer exports `mapMaybePromise` (removed upstream in `@whatwg-node/promise-helpers` v2). Use `handleMaybePromise(() => value, ...)` instead.
- `@whatwg-node/fetch` no longer exports `crypto`; use the platform `crypto` global. `TextEncoder` still comes from `fetchAPI` where hashing goes through Yoga’s FetchAPI.
