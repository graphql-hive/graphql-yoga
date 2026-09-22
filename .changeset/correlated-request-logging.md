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
---

Update to use the hive logger. Uses the Yoga Logger as a wrapper for the hive logger. (closes #4048)

Add correlated, per-request debug logging across the HTTP and GraphQL execution lifecycle.

Every incoming request now gets its own child `Logger` (available as `context.log`), tagged with a `requestId` attribute taken from the incoming `x-request-id` header or generated otherwise, so all `debug`/`info`/`error` log lines produced while handling that request can be correlated together. The id is also set on the outgoing response's `x-request-id` header.

The logger is put in the server context by the new `useConfigInServerContext` plugin (also ported from Hive Gateway), which makes the server's config context - `{ log }` - available to every plugin hook, including the ones short-circuiting a request (GraphiQL, health and readiness checks).

New `debug`-level log lines were added for:

- the request path, `operationName` and variables count when processing GraphQL parameters
- the resolved GraphQL operation type after parsing, and parser errors (previously indistinguishable from other unexpected errors)
- the response status code once a result has been processed into an HTTP `Response`
- a successfully fetched signing key in `@graphql-yoga/plugin-jwt`
- a successfully loaded supergraph schema in `@graphql-yoga/apollo-managed-federation` (`info` level, mirroring the existing failure log)

`MemoryLogWriter` is now re-exported from `graphql-yoga` for tests that need to observe logs written by these per-request child loggers (spying on logger instance methods directly does not work for child loggers, since `Logger.child()` returns an independent instance that only shares writers/level with its parent).

The generic `@envelop/*` plugins that logged via `console.warn`/`console.error` internally (`newrelic`, `auth0`, `resource-limitations`, `statsd`, `graphql-jit`, `response-cache`, `response-cache-cloudflare-kv`) now accept an optional `logger` option (backed by `@graphql-hive/logger`) for their own diagnostic messages, defaulting to `new Logger()` so console-based output is unchanged if you don't provide one.

### Breaking Changes

- The logger in the contexts is now called `log` instead of `logger`, matching Hive Gateway: `context.logger` is now `context.log`, and the Yoga instance's `yoga.logger` is now `yoga.log`. 
- The `logger` option of the built-in plugin configs is now called `log` too (`GraphiQLPluginConfig`, `HealthCheckPluginOptions`).
- `@graphql-yoga/nestjs` now logs through Nest's own `Logger` by default (like `@graphql-hive/nestjs` does), instead of not logging at all. Pass `logging: false` to keep the previous behaviour. Passing `logging: true` now logs at the `info` level through Yoga's default (console) logger instead of the HTTP framework's logger - to keep logging through Fastify's Pino instance, pass it explicitly:

  ```ts
  logging: new Logger({ writers: [new PinoLogWriter(app.log)] })
  ```

- The `@graphql-yoga/logger` package has been removed. `graphql-yoga` now depends on [`@graphql-hive/logger`](https://github.com/graphql-hive/logger) directly and re-exports its `Logger`, `MemoryLogWriter`, and `LogLevel` from the main entrypoint.
- The `createLogger` helper and the `YogaLogger` type alias are no longer exported. Construct a logger with `new Logger(options)` instead (also re-exported from `graphql-yoga`).
- The `logging` option now takes `boolean | Logger | LogLevel`, exactly like Hive Gateway's, and is interpreted by the newly exported `createLoggerFromLogging` helper: `true` (the default) logs at the `info` level, `false` disables logging, a `LogLevel` string (e.g. `'debug'`) logs at that level, and a `Logger` instance gives full control.

### Migration

```diff
- import { createLogger } from 'graphql-yoga';
+ import { Logger } from 'graphql-yoga';

- const logging = createLogger('debug');
+ const logging = new Logger({ level: 'debug' });

  createYoga({
    logging: true, // still `info`, unchanged
    // ...
  });
```

The per-request logger has been renamed in the contexts:

```diff
  const yoga = createYoga({
    schema: createSchema({
      typeDefs,
      resolvers: {
        Query: {
          hello: (_, __, context) => {
-           context.logger.debug('resolving hello');
+           context.log.debug('resolving hello');
            return 'world';
          },
        },
      },
    }),
  });
```

```diff
  const plugin = {
    onYogaInit({ yoga }) {
-     logger = yoga.logger;
+     log = yoga.log;
    },
  };
```

If you were depending on the standalone `@graphql-yoga/logger` package directly (e.g. in a plugin that doesn't otherwise depend on `graphql-yoga`), install `@graphql-hive/logger` instead and update your imports:

```diff
- pnpm add @graphql-yoga/logger
+ pnpm add @graphql-hive/logger
```

```diff
- import { Logger, MemoryLogWriter } from '@graphql-yoga/logger';
+ import { Logger, MemoryLogWriter } from '@graphql-hive/logger';
```

(If you already depend on `graphql-yoga` itself, you can keep importing `Logger`/`MemoryLogWriter` from there instead, since it re-exports both.)
