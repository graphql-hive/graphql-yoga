---
'@graphql-yoga/nestjs': minor
'@graphql-yoga/nestjs-federation': minor
---

Add support for NestJS 12 (`@nestjs/common`/`@nestjs/core` v12, `@nestjs/graphql` v14) alongside the
existing NestJS 11 support (closes #4579).

Note: `@nestjs/graphql` v14 dropped server-side support for the legacy `subscriptions-transport-ws`
protocol. The `subscriptions-transport-ws` driver option still works when using `@nestjs/graphql`
v13, but has no effect under v14 — use `graphql-ws` instead.
