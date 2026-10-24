# @envelop/response-cache-cloudflare-kv

## 7.0.0

### Major Changes

- [#4574](https://github.com/graphql-hive/graphql-yoga/pull/4574)
  [`79b0e8b`](https://github.com/graphql-hive/graphql-yoga/commit/79b0e8b0fc344b5e205e5d99aed33fdf0a98bd6b)
  Thanks [@egoodwinx](https://github.com/egoodwinx)! - ### Breaking Changes
  - **Node**: minimum supported version is now Node 22. Node 18 and 20 are no longer supported.
    Future releases will only support Node >=22.
  - **GraphQL**: minimum supported version is now GraphQL 16. GraphQL 14 and 15 are no longer
    supported.
  - **Request body parsing**: Yoga now limits request bodies to 25,000,000 bytes by default.
    Enforcing this limit streams the body through a byte counter, making POST body parsing
    asynchronous even for an in-memory body. As a result, `yoga.fetch()` can return a Promise where
    it previously returned a synchronous Response, even when all resolvers and plugins are
    synchronous.

  ### Migration
  - If you're on Node 18/20, upgrade to Node 22 or later before upgrading this package.
  - If you're on graphql 14/15, upgrade to graphql 16 or 17 first.
  - Await `yoga.fetch()` and response body parsing instead of relying on synchronous results. Set
    `maxRequestBodySize: false` in `createYoga` to disable the body-size limit and preserve
    synchronous parsing for in-memory bodies, but only if you enforce an appropriate request-body
    limit elsewhere.

### Minor Changes

- [#4575](https://github.com/graphql-hive/graphql-yoga/pull/4575)
  [`862447a`](https://github.com/graphql-hive/graphql-yoga/commit/862447ad622be3cf945fe943b506add460eaf674)
  Thanks [@egoodwinx](https://github.com/egoodwinx)! - Use
  [`@graphql-hive/logger`](https://github.com/graphql-hive/logger) and add correlated, per-request
  logging (closes #4048)

  Every request now gets its own logger, available as `context.log` (and `serverContext.log` in
  plugin hooks), tagged with a `requestId`. Everything logged while handling a request can be
  correlated by that id.

  The request id is taken from the host integration if it already assigned one (e.g. Fastify's
  `request.id`), otherwise from the incoming `x-request-id` header, otherwise generated. It is also
  sent back in the `x-request-id` response header. Configure it with the new `requestId` option:

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

  At the `info` level, a single "Request processed" line is logged per request with the method,
  path, operation name and type, response status, error count and duration. At the `debug` level,
  more details about request processing are logged.

  Masked errors are now logged with the request's logger, so they can be traced back to the request
  that caused them. Custom `maskError` functions receive the request's context as an optional fourth
  argument.

  The `@envelop/newrelic`, `@envelop/auth0`, `@envelop/resource-limitations`, `@envelop/statsd`,
  `@envelop/graphql-jit`, `@envelop/response-cache` and `@envelop/response-cache-cloudflare-kv`
  plugins accept a new `log` option for their own messages, instead of always writing to the
  console.

  `@envelop/response-cache`'s `shouldCacheResult` now also receives the GraphQL `context`.

  ### Breaking Changes
  - The `@graphql-yoga/logger` package has been removed. `graphql-yoga` re-exports `Logger`,
    `MemoryLogWriter` and `LogLevel` from `@graphql-hive/logger` instead.
  - `createLogger` and the `YogaLogger` type are no longer exported. Use `new Logger(options)`
    instead.
  - The `logging` option now takes `boolean | Logger | LogLevel`, where `Logger` is the one from
    `@graphql-hive/logger`.
  - `yoga.logger` has been renamed to `yoga.log`.
  - The `logger` option of `useGraphiQL` and `useHealthCheck` has been removed. They now log through
    the request's logger.
  - `@graphql-yoga/nestjs` now logs through Nest's `Logger` by default instead of not logging at
    all. Pass `logging: false` to keep the previous behaviour. `logging: true` on Fastify no longer
    logs through Fastify's logger, pass it explicitly instead (see below).
  - `@envelop/apollo-federation`, `@envelop/auth0`, `@envelop/graphql-jit`, `@envelop/newrelic`,
    `@envelop/resource-limitations`, `@envelop/response-cache`,
    `@envelop/response-cache-cloudflare-kv` and `@envelop/statsd` now have a peer dependency on
    `@graphql-hive/logger` that you must install.
  - `@envelop/apollo-federation`'s `logger` option now expects a `Logger` from
    `@graphql-hive/logger` and defaults to `new Logger()` instead of `console`.

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

  Prefer the request-scoped logger inside resolvers and plugin hooks so the logs carry the request
  id:

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

### Patch Changes

- Updated dependencies
  [[`862447a`](https://github.com/graphql-hive/graphql-yoga/commit/862447ad622be3cf945fe943b506add460eaf674),
  [`79b0e8b`](https://github.com/graphql-hive/graphql-yoga/commit/79b0e8b0fc344b5e205e5d99aed33fdf0a98bd6b),
  [`be89d05`](https://github.com/graphql-hive/graphql-yoga/commit/be89d0595fbdc2f8db838befd5d08287fcaad13f)]:
  - @envelop/response-cache@10.0.0

## 6.3.4

### Patch Changes

- Updated dependencies
  [[`9fde867`](https://github.com/graphql-hive/graphql-yoga/commit/9fde867200666a7dbe62397ef42341088bbe3601)]:
  - @envelop/response-cache@9.3.4

## 6.3.3

### Patch Changes

- Updated dependencies
  [[`d8b8860`](https://github.com/graphql-hive/graphql-yoga/commit/d8b8860c4c0deea72bb8aec7948caef695fa7d2a)]:
  - @envelop/response-cache@9.3.3

## 6.3.2

### Patch Changes

- Updated dependencies
  [[`c6febdc`](https://github.com/graphql-hive/graphql-yoga/commit/c6febdc34e7f0d791c91f2e745ff0d388bf25b0c)]:
  - @envelop/response-cache@9.3.2

## 6.3.1

### Patch Changes

- [#4577](https://github.com/graphql-hive/graphql-yoga/pull/4577)
  [`7bff35c`](https://github.com/graphql-hive/graphql-yoga/commit/7bff35cf0274d59ad5eaeeee3bfd0390fe593871)
  Thanks [@egoodwinx](https://github.com/egoodwinx)! - Add homepage and bugs.url to package.json
  files

- Updated dependencies
  [[`7bff35c`](https://github.com/graphql-hive/graphql-yoga/commit/7bff35cf0274d59ad5eaeeee3bfd0390fe593871)]:
  - @envelop/response-cache@9.3.1

## 6.3.0

### Patch Changes

- Updated dependencies
  [[`ab4aeaa`](https://github.com/graphql-hive/graphql-yoga/commit/ab4aeaa85768f548328e8537dabdee25b88cf03c)]:
  - @envelop/response-cache@9.3.0

## 6.2.0

### Minor Changes

- [#4545](https://github.com/graphql-hive/graphql-yoga/pull/4545)
  [`94ebe5b`](https://github.com/graphql-hive/graphql-yoga/commit/94ebe5b875d05c65506c5f0f9dcf89a84a9b6d76)
  Thanks [@egoodwinx](https://github.com/egoodwinx)! - Update to support graphql-js 17

  Bump package versions, fix expected typing, and update compatability with subscribe.

### Patch Changes

- Updated dependencies
  [[`94ebe5b`](https://github.com/graphql-hive/graphql-yoga/commit/94ebe5b875d05c65506c5f0f9dcf89a84a9b6d76)]:
  - @envelop/response-cache@9.2.0

## 6.1.1

### Patch Changes

- Updated dependencies []:
  - @envelop/response-cache@9.1.1

## 6.1.0

### Patch Changes

- Updated dependencies
  [[`dc2327d`](https://github.com/graphql-hive/envelop/commit/dc2327df6b1d46d53d000eadcfac3850c5a41daf)]:
  - @envelop/response-cache@9.1.0

## 6.0.0

### Patch Changes

- Updated dependencies []:
  - @envelop/response-cache@9.0.0

## 5.0.0

### Patch Changes

- Updated dependencies
  [[`35539a7`](https://github.com/graphql-hive/envelop/commit/35539a780ef5f062006bb6bfb25d5ee77f5bf299)]:
  - @envelop/response-cache@8.1.0

## 4.0.0

### Patch Changes

- Updated dependencies []:
  - @envelop/response-cache@8.0.0

## 3.1.3

### Patch Changes

- Updated dependencies []:
  - @envelop/response-cache@7.1.3

## 3.1.2

### Patch Changes

- Updated dependencies
  [[`26137e7`](https://github.com/n1ru4l/envelop/commit/26137e7c3d0ff349af90724867c715f3b3809a7d),
  [`26137e7`](https://github.com/n1ru4l/envelop/commit/26137e7c3d0ff349af90724867c715f3b3809a7d)]:
  - @envelop/response-cache@7.1.2

## 3.1.1

### Patch Changes

- Updated dependencies []:
  - @envelop/response-cache@7.1.1

## 3.1.0

### Patch Changes

- Updated dependencies []:
  - @envelop/response-cache@7.1.0

## 3.0.0

### Patch Changes

- Updated dependencies
  [[`9bd1b20`](https://github.com/n1ru4l/envelop/commit/9bd1b207861540f9bee085026b9fab725a88e84e)]:
  - @envelop/response-cache@7.0.0

## 2.0.0

### Patch Changes

- Updated dependencies
  [[`7882ffb`](https://github.com/n1ru4l/envelop/commit/7882ffb5fd60ecb7dd5c1a291d6f7d619bdd2a23)]:
  - @envelop/response-cache@6.3.0

## 1.0.0

### Minor Changes

- [#2238](https://github.com/n1ru4l/envelop/pull/2238)
  [`430ee7d`](https://github.com/n1ru4l/envelop/commit/430ee7d78dea04d0a44312bdfd16062a675d9772)
  Thanks [@ardatan](https://github.com/ardatan)! - BREAKING: Now the cache implementation does not
  require the `ExecutionContext` or `KVNamespace` instance but only the name of the namespace

  ```ts
  import { createSchema, createYoga, YogaInitialContext } from 'graphql-yoga'
  import { useResponseCache } from '@envelop/response-cache'
  import { createKvCache } from '@envelop/response-cache-cloudflare-kv'
  import { resolvers } from './graphql-schema/resolvers.generated'
  import { typeDefs } from './graphql-schema/typeDefs.generated'

  export type Env = {
    GRAPHQL_RESPONSE_CACHE: KVNamespace
  }

  const graphqlServer = createYoga<Env & ExecutionContext>({
    schema: createSchema({ typeDefs, resolvers }),
    plugins: [
      useResponseCache({
        cache: createKvCache({
          KVName: 'GRAPHQL_RESPONSE_CACHE',
          keyPrefix: 'graphql' // optional
        }),
        session: () => null,
        includeExtensionMetadata: true,
        ttl: 1000 * 10 // 10 seconds
      })
    ]
  })

  export default {
    fetch: graphqlServer
  }
  ```

### Patch Changes

- Updated dependencies
  [[`430ee7d`](https://github.com/n1ru4l/envelop/commit/430ee7d78dea04d0a44312bdfd16062a675d9772)]:
  - @envelop/response-cache@6.2.0

## 0.3.0

### Minor Changes

- [#2105](https://github.com/n1ru4l/envelop/pull/2105)
  [`a2c7657`](https://github.com/n1ru4l/envelop/commit/a2c7657a22b8292a30bbb570f963776a08892891)
  Thanks [@AdiRishi](https://github.com/AdiRishi)! - Change @cloudflare/workers-types to an optional
  peer dependency of the package

### Patch Changes

- Updated dependencies
  [[`ee1b3c0`](https://github.com/n1ru4l/envelop/commit/ee1b3c05e01a7e5e7564cd8136f3bc2e558089b9),
  [`4a1e50b`](https://github.com/n1ru4l/envelop/commit/4a1e50bfbda0b9ee399cdf55c65a682e4f753aa9)]:
  - @envelop/response-cache@6.1.2

## 0.2.0

### Minor Changes

- [#2057](https://github.com/n1ru4l/envelop/pull/2057)
  [`78c2f26`](https://github.com/n1ru4l/envelop/commit/78c2f26eb4c485f6c8d009bfb8bb366b6f0c5d77)
  Thanks [@AdiRishi](https://github.com/AdiRishi)! - Initial release

### Patch Changes

- Updated dependencies
  [[`cafc43f`](https://github.com/n1ru4l/envelop/commit/cafc43f444f17a9d6fc2f283e3ba31a14c568b51),
  [`09a4bc1`](https://github.com/n1ru4l/envelop/commit/09a4bc146753faa84c7eaa3ba934fb3b66ea0640)]:
  - @envelop/response-cache@6.1.1
