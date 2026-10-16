---
'graphql-yoga': patch
---

Stop swapping in `globalThis.TransformStream` inside the request body-size limiter. `@whatwg-node/server` already passes the request-appropriate Fetch API (native vs ponyfill) into Yoga as the handler's third argument, so `onRequestParse` receives a realm-compatible `TransformStream` without an ad-hoc guard.
