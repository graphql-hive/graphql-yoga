---
'graphql-yoga': major
'@graphql-yoga/plugin-jwt': minor
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

Every incoming request now gets its own child `Logger` (available as `context.logger`), tagged with a `requestId` attribute taken from the incoming `x-request-id` header or generated otherwise, so all `debug`/`info`/`error` log lines produced while handling that request can be correlated together.

New `debug`-level log lines were added for:

- the request path, `operationName` and variables count when processing GraphQL parameters
- the resolved GraphQL operation type after parsing, and parser errors (previously indistinguishable from other unexpected errors)
- the response status code once a result has been processed into an HTTP `Response`
- a successfully fetched signing key in `@graphql-yoga/plugin-jwt`
- a successfully loaded supergraph schema in `@graphql-yoga/apollo-managed-federation` (`info` level, mirroring the existing failure log)

`MemoryLogWriter` is now re-exported from `graphql-yoga` for tests that need to observe logs written by these per-request child loggers (spying on logger instance methods directly does not work for child loggers, since `Logger.child()` returns an independent instance that only shares writers/level with its parent).

The generic `@envelop/*` plugins that logged via `console.warn`/`console.error` internally (`newrelic`, `auth0`, `resource-limitations`, `statsd`, `graphql-jit`, `response-cache`, `response-cache-cloudflare-kv`) now accept an optional `logger` option (backed by `@graphql-hive/logger`) for their own diagnostic messages, defaulting to `new Logger()` so console-based output is unchanged if you don't provide one.

### Breaking Changes

- The `@graphql-yoga/logger` package has been removed. `graphql-yoga` now depends on [`@graphql-hive/logger`](https://github.com/graphql-hive/logger) directly and re-exports its `Logger`, `MemoryLogWriter`, and `LogLevel` from the main entrypoint.
- The `createLogger` helper and the `YogaLogger` type alias are no longer exported. Construct a logger with `new Logger(options)` instead (also re-exported from `graphql-yoga`).
- The `logging` option no longer accepts a `boolean`. Pass a `LogLevel` string (e.g. `'debug'`, `'info'`) to enable logging at that level, `false` to disable it, or a `Logger` instance for full control.

### Migration

```diff
- import { createLogger } from 'graphql-yoga';
+ import { Logger } from 'graphql-yoga';

- const logging = createLogger('debug');
+ const logging = new Logger({ level: 'debug' });

  createYoga({
-   logging: true,
+   logging: 'info', // or just omit `logging`, `info` is the default
    // ...
  });
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
