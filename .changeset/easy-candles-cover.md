---
'@envelop/response-cache-cloudflare-kv': major
'@envelop/operation-field-permissions': major
'@envelop/execute-subscription-event': major
'@envelop/immediate-introspection': major
'@envelop/disable-introspection': major
'@envelop/filter-operation-type': major
'@envelop/apollo-server-errors': major
'@envelop/persisted-operations': major
'@envelop/resource-limitations': major
'@envelop/response-cache-redis': major
'@envelop/extended-validation': major
'@envelop/apollo-datasources': major
'@envelop/fragment-arguments': major
'@envelop/graphql-middleware': major
'@envelop/apollo-federation': major
'@envelop/validation-cache': major
'@envelop/graphql-modules': major
'@graphql-yoga/redis-event-target': major
'@graphql-yoga/typed-event-target': major
'@envelop/apollo-tracing': major
'@envelop/preload-assets': major
'@envelop/response-cache': major
'@envelop/opentelemetry': major
'@graphql-yoga/plugin-disable-introspection': major
'@envelop/generic-auth': major
'@envelop/parser-cache': major
'@envelop/rate-limiter': major
'@graphql-yoga/plugin-persisted-operations': major
'@envelop/depth-limit': major
'@envelop/graphql-jit': major
'@graphql-yoga/plugin-apollo-inline-trace': major
'@envelop/dataloader': major
'@envelop/live-query': major
'@envelop/on-resolve': major
'@envelop/prometheus': major
'@envelop/newrelic': major
'@envelop/instrumentation': major
'@graphql-yoga/plugin-csrf-prevention': major
'@envelop/sentry': major
'@envelop/statsd': major
'@graphql-yoga/plugin-response-cache': major
'@envelop/auth0': major
'@graphql-yoga/urql-exchange': major
'@graphql-yoga/plugin-defer-stream': major
'@graphql-yoga/plugin-graphql-sse': major
'@graphql-yoga/apollo-link': major
'@graphql-yoga/plugin-prometheus': major
'@graphql-yoga/nestjs-federation': major
'@envelop/testing': major
'@graphql-yoga/render-graphiql': major
'@envelop-examples/pothos': major
'@envelop/types': major
'@envelop/core': major
'graphql-yoga': major
'@graphql-yoga/plugin-sofa': major
'@graphql-yoga/subscription': major
'@graphql-yoga/plugin-apq': major
'@graphql-yoga/plugin-jwt': major
'@graphql-yoga/logger': major
'@graphql-yoga/nestjs': major
'@graphql-yoga/apollo-managed-federation': minor
'@graphql-yoga/plugin-apollo-usage-report': minor
'@graphql-yoga/render-apollo-sandbox': minor
---

### Breaking Changes

- **Node**: minimum supported version is now Node 24. Node 18 and 20 are no longer supported. Future releases will only support Node >=22.
- **GraphQL**: minimum supported version is now GraphQL 16. GraphQL 14 and 15 are no longer supported.

### Migration

- If you're on Node 18/20, upgrade to Node 24 (or at least >=22) before upgrading this package.
- If you're on graphql 14/15, upgrade to graphql 16 or 17 first.