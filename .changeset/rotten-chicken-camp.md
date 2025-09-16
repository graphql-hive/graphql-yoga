---
'@graphql-yoga/plugin-response-cache': patch
---

Fix types for the `cache` option. Envelop cache implementations (redis and CloudFlare KV) are now
usable without TS errors.
