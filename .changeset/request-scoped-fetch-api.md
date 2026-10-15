---
'graphql-yoga': patch
---

Remember the Fetch API selected for each request in `onRequest` (WeakMap keyed by `Request`) and pass that instance into Yoga's parse/params/result hooks instead of always using the server-wide `fetchAPI`. Expose `getFetchAPIByRequest(request)` so consumers (e.g. Hive Gateway) can resolve the same request-scoped Fetch API outside Yoga's hooks. Removes the ad-hoc native `TransformStream` swap in the body-size limiter; the correct Fetch API is already request-scoped.
