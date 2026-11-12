---
'@graphql-yoga/plugin-graphql-sse': patch
---

The SSE endpoint now routes operations through the same request pipeline (`onParams` hooks, then parse/validate/execute) that Yoga's HTTP endpoint already uses, so `onParams`-based plugins are enforced consistently across both transports.
