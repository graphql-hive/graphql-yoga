---
'@envelop/response-cache-cloudflare-kv': major
'@graphql-yoga/nestjs-federation': major
'@graphql-yoga/nestjs': major
'graphql-yoga': patch
---

Remove the built-in `subscriptions` driver option and its `graphql-ws` /
`subscriptions-transport-ws` wiring (previously implemented via `@nestjs/graphql`'s
`GqlSubscriptionService`).

Update the tsconfig to build paths purposefully to remove conflicts when building federation nestjs and nestjs packages. 

Fix open handle leak in multipart tests.

`@nestjs/graphql` v14 (required for NestJS 12 support) dropped server-side support for
`subscriptions-transport-ws`, and the driver-level `graphql-ws` integration held a socket open after
shutdown. Rather than keep a partial, driver-managed subscriptions setup, `YogaDriver` and
`YogaFederationDriver` no longer accept a `subscriptions` option. Wire up subscriptions yourself
using GraphQL Yoga's own subscription support (e.g. the `graphql-ws` package, or
`@graphql-yoga/plugin-graphql-sse`) the same way you would for a standalone `graphql-yoga` server.

