---
'graphql-yoga': patch
---

dependencies: bump `@whatwg-node/server` to `^0.13.1` so native `Request` subclasses (Next.js `NextRequest`, including the App Router `proxyNextRequest` Proxy) are classified as the platform Fetch API. The body-size limiter no longer throws a cross-realm `TypeError` / 500 on those requests; oversized bodies still return 413.

See https://github.com/graphql-hive/graphql-yoga/issues/4633 and https://github.com/ardatan/whatwg-node/pull/3717.
