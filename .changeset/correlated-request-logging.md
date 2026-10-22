---
'graphql-yoga': major
'@graphql-yoga/nestjs': major
'@graphql-yoga/plugin-jwt': minor
'@graphql-yoga/plugin-apollo-inline-trace': patch
'@graphql-yoga/plugin-apollo-usage-report': patch
'@graphql-yoga/plugin-response-cache': patch
'@graphql-yoga/apollo-managed-federation': minor
'@envelop/newrelic': minor
'@envelop/auth0': minor
'@envelop/resource-limitations': minor
'@envelop/statsd': minor
'@envelop/graphql-jit': minor
'@envelop/response-cache': minor
'@envelop/response-cache-cloudflare-kv': minor
'@envelop/apollo-federation': major
'@envelop/core': minor
'@envelop/types': minor
---

Use [`@graphql-hive/logger`](https://github.com/graphql-hive/logger) and add correlated, per-request logging (closes #4048)

Every request now gets its own logger, available as `context.log` (and `serverContext.log` in plugin hooks), tagged with a `requestId`. Everything logged while handling a request can be correlated by that id.

The request id is taken from the host integration if it already assigned one (e.g. Fastify's `request.id`), otherwise from the incoming `x-request-id` header, otherwise generated. It is also sent back in the `x-request-id` response header. Configure it with the new `requestId` option:

```ts
createYoga({
  requestId: {
    // don't trust the incoming header, recommended when clients can reach the server directly
    trustHeader: false,
    headerName: 'x-correlation-id',
    generateRequestId: () => myId()
  }
})
```

Pass `requestId: false` to disable it.

At the `info` level, a single "Request processed" line is logged per request with the method, path, operation name and type, response status, error count and duration. At the `debug` level, more details about request processing are logged.

Masked errors are now logged with the request's logger, so they can be traced back to the request that caused them. Custom `maskError` functions receive the request's context as an optional fourth argument.

The `@envelop/newrelic`, `@envelop/auth0`, `@envelop/resource-limitations`, `@envelop/statsd`, `@envelop/graphql-jit`, `@envelop/response-cache` and `@envelop/response-cache-cloudflare-kv` plugins accept a new `log` option for their own messages, instead of always writing to the console.

`@envelop/response-cache`'s `shouldCacheResult` now also receives the GraphQL `context`.

### Breaking Changes

- The `@graphql-yoga/logger` package has been removed. `graphql-yoga` re-exports `Logger`, `MemoryLogWriter` and `LogLevel` from `@graphql-hive/logger` instead.
- `createLogger` and the `YogaLogger` type are no longer exported. Use `new Logger(options)` instead.
- The `logging` option now takes `boolean | Logger | LogLevel`, where `Logger` is the one from `@graphql-hive/logger`.
- `yoga.logger` has been renamed to `yoga.log`.
- The `logger` option of `useGraphiQL` and `useHealthCheck` has been removed. They now log through the request's logger.
- `@graphql-yoga/nestjs` now logs through Nest's `Logger` by default instead of not logging at all. Pass `logging: false` to keep the previous behaviour. `logging: true` on Fastify no longer logs through Fastify's logger, pass it explicitly instead (see below).
- `@envelop/apollo-federation`, `@envelop/auth0`, `@envelop/graphql-jit`, `@envelop/newrelic`, `@envelop/resource-limitations`, `@envelop/response-cache`, `@envelop/response-cache-cloudflare-kv` and `@envelop/statsd` now have a peer dependency on `@graphql-hive/logger` that you must install.
- `@envelop/apollo-federation`'s `logger` option now expects a `Logger` from `@graphql-hive/logger` and defaults to `new Logger()` instead of `console`.

### Migration

Create loggers with `Logger`:

```diff
- import { createLogger } from 'graphql-yoga';
+ import { Logger } from 'graphql-yoga';

  createYoga({
-   logging: createLogger('debug'),
+   logging: new Logger({ level: 'debug' }),
  });
```

Use `log` instead of `logger` on the Yoga instance:

```diff
  const plugin = {
    onYogaInit({ yoga }) {
-     yoga.logger.info('ready');
+     yoga.log.info('ready');
    },
  };
```

Prefer the request-scoped logger inside resolvers and plugin hooks so the logs carry the request id:

```ts
const resolvers = {
  Query: {
    hello: (_, __, context) => {
      context.log.debug('resolving hello')
      return 'world'
    }
  }
}
```

If you use any of the `@envelop/*` plugins listed above, install the logger:

```sh
npm i @graphql-hive/logger
```

If you depended on `@graphql-yoga/logger` directly, switch to `@graphql-hive/logger`:

```diff
- import { Logger } from '@graphql-yoga/logger';
+ import { Logger } from '@graphql-hive/logger';
```

To keep logging through Fastify's logger in `@graphql-yoga/nestjs`:

```ts
import { Logger } from 'graphql-yoga'
import { PinoLogWriter } from '@graphql-hive/logger/writers/pino'

// in your yoga driver options
logging: new Logger({ writers: [new PinoLogWriter(app.log)] })
```
