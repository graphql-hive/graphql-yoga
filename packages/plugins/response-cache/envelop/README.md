## `@envelop/response-cache`

- Skip the execution phase and reduce server load by caching execution results in-memory.
- Customize cache entry time to live based on fields and types within the execution result.
- Automatically invalidate the cache based on mutation selection sets.
- Customize invalidation through the cache api (e.g. listen to a database write log).
- Implement your own global cache (e.g. using another key/value store) by implementing the `Cache`
  interface.

[Check out the GraphQL Response Cache Guide for more information](https://envelop.dev/docs/guides/adding-a-graphql-response-cache)

> Watch
> [Episode #34 of `graphql.wtf`](https://graphql.wtf/episodes/34-response-cache-plugin-with-envelop)
> for a quick introduction to using Response Cache plugin with Envelop:

<iframe
  width="100%"
  height="400"
  src="https://www.youtube.com/embed/1EBphPltkA4"
  title="YouTube video player"
  frameBorder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowFullScreen
></iframe>

## Getting Started

```bash
yarn add @envelop/response-cache
```

## Usage Example

When configuring the `useResponseCache`, you can choose the type of cache:

- In-Memory LRU Cache (default)
- Redis Cache (see: `@envelop/response-cache-redis`)

### Note on Plugin ordering

This plugin rely on a custom executor to work. This means that this plugin should in most cases
placed last in the plugin list. Otherwise, some other plugin might override the custom executor.

For example, this would not work:

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { useResponseCache } from '@envelop/response-cache'

// Don't
const getEnveloped = envelop({
  plugins: [
    useResponseCache(),
    // Here, useEngine will override the `execute` function, leading to a non working cache.
    useEngine({ parse, validate, specifiedRules, execute, subscribe })
  ]
})

// Do
const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    // Here, the plugin can control the `execute` function
    useResponseCache()
  ]
})
```

### In-Memory Cache

The in-memory LRU cache is used by default.

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { useResponseCache } from '@envelop/response-cache'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    // ... other plugins ...
    useResponseCache({
      // use global cache for all operations
      session: () => null
    })
  ]
})
```

Or, you may create the in-memory LRU cache explicitly.

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { createInMemoryCache, useResponseCache } from '@envelop/response-cache'

const cache = createInMemoryCache()

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    // ... other plugins ...
    useResponseCache({
      cache,
      session: () => null // use global cache for all operations
    })
  ]
})
```

> Note: The in-memory LRU cache is not suitable for serverless deployments. Instead, consider the
> Redis cache provided by `@envelop/response-cache-redis`.

### Cache based on session/user

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { useResponseCache } from '@envelop/response-cache'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    // ... other plugins ...
    useResponseCache({
      ttl: 2000,
      // context is the GraphQL context used for execution
      session: context => String(context.user?.id)
    })
  ]
})
```

### Redis Cache

```bash
yarn add @envelop/response-cache-redis
```

In order to use the Redis cache, you need to:

- Create a Redis database
- Collect the connection settings (or its connection string), e.g., `host`, `port`, `username`,
  `password`, `tls`, etc.
- Create and configure a [Redis client](https://github.com/luin/ioredis) with your
  [connection settings](https://github.com/luin/ioredis/blob/master/API.md#Redis) and any
  [additional options](https://github.com/luin/ioredis/blob/master/API.md#new_Redis_new)
- Create an instance of the Redis Cache and set to the `useResponseCache` plugin options

```ts
import { execute, parse, subscribe, validate } from 'graphql'
import Redis from 'ioredis'
import { envelop } from '@envelop/core'
import { useResponseCache } from '@envelop/response-cache'
import { createRedisCache } from '@envelop/response-cache-redis'

const redis = new Redis({
  host: 'my-redis-db.example.com',
  port: '30652',
  password: '1234567890'
})

const redis = new Redis('rediss://:1234567890@my-redis-db.example.com:30652')

const cache = createRedisCache({ redis })

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    // ... other plugins ...
    useResponseCache({
      cache,
      session: () => null // use global cache for all operations
    })
  ]
})
```

> Note: In the Recipes below, be sure to provide your Redis `cache` instance with
> `useResponseCache({ cache })`.

### Cloudflare KV Cache

```bash
yarn add @envelop/response-cache-cloudflare-kv
```

In order to use the Cloudflare KV cache, you need to:

- Create a Cloudflare KV namespace
- Add that namespace to your `wrangler.toml` in order to access it from your worker. Read the
  [KV docs](https://developers.cloudflare.com/kv/get-started/) to get started.
- Pass the KV namespace to the `createKvCache` function and set to the `useResponseCache` plugin
  options. See the example below.

The example below demonstrates how to use this with graphql-yoga within a Cloudflare Worker script.

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

## Recipes

### Cache with maximum TTL

```ts
import { execute, parse, subscribe, validate } from 'graphql'
import { envelop } from '@envelop/core'
import { useResponseCache } from '@envelop/response-cache'

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    // ... other plugins ...
    useResponseCache({
      ttl: 2000, // cached execution results become stale after 2 seconds
      session: () => null // use global cache for all operations
    })
  ]
})
```

> Note: Setting `ttl: 0` will disable TTL for all types. You can use that if you wish to disable
> caching for all type, and then enable caching for specific types using `ttlPerType`.

### Cache with custom TTL per object type

```ts
import { execute, parse, subscribe, validate } from 'graphql'
import { envelop } from '@envelop/core'
import { useResponseCache } from '@envelop/response-cache'

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    // ... other plugins ...
    useResponseCache({
      ttl: 2000,
      ttlPerType: {
        // cached execution results that contain a `Stock` object become stale after 500ms
        Stock: 500
      }
    })
  ]
})
```

It is also possible to define the TTL by using the `@cacheControl` directive in your schema.

```ts
import { execute, parse, subscribe, validate, buildSchema } from 'graphql'
import { envelop } from '@envelop/core'
import { useResponseCache, cacheControlDirective } from '@envelop/response-cache'

const schema = buildSchema(/* GraphQL */ `
  ${cacheControlDirective}

  type Stock @cacheControl(maxAge: 500) {
    # ... stock fields ...
  }

  # ... rest of the schema ...
`)

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    useSchema(schema)
    // ... other plugins ...
    useResponseCache({ ttl: 2000 })
  ]
})
```

### Cache with custom TTL per schema coordinate

```ts
import { execute, parse, subscribe, validate } from 'graphql'
import { envelop } from '@envelop/core'
import { useResponseCache } from '@envelop/response-cache'

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    // ... other plugins ...
    useResponseCache({
      ttl: 2000,
      ttlPerSchemaCoordinate: {
        // cached execution results that select the `Query.user` field become stale after 100ms
        'Query.rocketCoordinates': 100
      }
    })
  ]
})
```

It is also possible to define the TTL by using the `@cacheControl` directive in your schema.

```ts
import { buildSchema, execute, parse, subscribe, validate } from 'graphql'
import { envelop } from '@envelop/core'
import { cacheControlDirective, useResponseCache } from '@envelop/response-cache'

const schema = buildSchema(/* GraphQL */ `
  ${cacheControlDirective}

  type Query {
    rocketCoordinates: Coordinates @cacheControl(maxAge: 100)
  }

  # ... rest of the schema ...
`)

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    useSchema(schema)
    // ... other plugins ...
    useResponseCache({ ttl: 2000 })
  ]
})
```

### Disable cache based on session/user

```ts
import { execute, parse, subscribe, validate } from 'graphql'
import { envelop } from '@envelop/core'
import { useResponseCache } from '@envelop/response-cache'

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    // ... other plugins ...
    useResponseCache({
      ttl: 2000,
      // context is the GraphQL context used for execution
      enabled: context => context.user?.role !== 'admin',
      session: () => null
    })
  ]
})
```

### Enforce if a type or a field should only be cached based on session/user

Some types or fields in the schemas should never be globally cached. Its data is always linked to a
session or user. `PRIVATE` scope allows to enforce this fact and ensure that responses with a
`PRIVATE` scope will never be cached without a session. The default scope for all types and fields
is `PUBLIC`.

```ts
import { execute, parse, subscribe, validate } from 'graphql'
import { envelop } from '@envelop/core'
import { useResponseCache } from '@envelop/response-cache'

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    // ... other plugins ...
    useResponseCache({
      ttl: 2000,
      session: (request) => getSessionId(request)
      scopePerSchemaCoordinate: {
        // Set scope for an entire type
        PrivateProfile: 'PRIVATE',
        // Set scope for a single field
        'Profile.privateData': 'PRIVATE',
      }
    })
  ]
})
```

It is also possible to define scopes using the `@cacheControl` directive in your schema.

```ts
import { execute, parse, subscribe, validate, buildSchema } from 'graphql'
import { envelop, useSchema } from '@envelop/core'
import { useResponseCache, cacheControlDirective } from '@envelop/response-cache'

const schema = buildSchema(/* GraphQL */`
  ${cacheControlDirective}
  type PrivateProfile @cacheControl(scope: PRIVATE) {
    # ...
  }

  type Profile {
    privateData: String @cacheControl(scope: PRIVATE)
  }
`)

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    // ... other plugins ...
    useResponseCache({
      ttl: 2000,
      session: (request) => getSessionId(request)
      scopePerSchemaCoordinate: {
        // Set scope for an entire type
        PrivateProfile: 'PRIVATE',
        // Set scope for a single field
        'Profile.privateData': 'PRIVATE',
      }
    })
  ]
})
```

### Customize if result should be cached

You can define a custom function used to check if a query operation execution result should be
cached.

```ts
type ShouldCacheResultFunction = (params: { result: ExecutionResult }) => boolean
```

This is useful for advanced use-cases. E.g. if you want to cache results with certain error types.

By default, the `defaultShouldCacheResult` function is used which never caches any query operation
execution results that includes any errors (unexpected, EnvelopError, or GraphQLError).

```ts
import { execute, parse, subscribe, validate } from 'graphql'
import { envelop } from '@envelop/core'
import { ShouldCacheResultFunction, useResponseCache } from '@envelop/response-cache'

export const defaultShouldCacheResult: ShouldCacheResultFunction = (params): boolean => {
  // cache any query operation execution result
  // even if it includes errors
  return true
}

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    // ... other plugins ...
    useResponseCache({
      shouldCacheResult: myCustomShouldCacheResult,
      session: () => null
    })
  ]
})
```

### Cache Introspection query operations

By default introspection query operations are not cached. In case you want to cache them you can do
so with the `ttlPerSchemaCoordinate` parameter.

**Infinite caching**

```ts
import { execute, parse, subscribe, validate } from 'graphql'
import { envelop } from '@envelop/core'
import { useResponseCache } from '@envelop/response-cache'

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    // ... other plugins ...
    useResponseCache({
      ttlPerSchemaCoordinate: {
        'Query.__schema': undefined // cache infinitely
      },
      session: () => null
    })
  ]
})
```

**TTL caching**

```ts
import { execute, parse, subscribe, validate } from 'graphql'
import { envelop } from '@envelop/core'
import { useResponseCache } from '@envelop/response-cache'

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    // ... other plugins ...
    useResponseCache({
      ttlPerSchemaCoordinate: {
        'Query.__schema': 10_000 // cache for 10 seconds
      },
      session: () => null
    })
  ]
})
```

### Cache with maximum TTL

```ts
import { execute, parse, subscribe, validate } from 'graphql'
import { envelop } from '@envelop/core'
import { useResponseCache } from '@envelop/response-cache'

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    // ... other plugins ...
    useResponseCache({
      ttl: 2000, // cached execution results become stale after 2 seconds
      session: () => null
    })
  ]
})
```

### Customize the fields that are used for building the cache ID

```ts
import { execute, parse, subscribe, validate } from 'graphql'
import { envelop } from '@envelop/core'
import { useResponseCache } from '@envelop/response-cache'

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    // ... other plugins ...
    useResponseCache({
      ttl: 2000,
      // use the `_id` instead of `id` field.
      idFields: ['_id'],
      session: () => null
    })
  ]
})
```

### Disable automatic cache invalidation via mutations

```ts
import { execute, parse, subscribe, validate } from 'graphql'
import { envelop } from '@envelop/core'
import { useResponseCache } from '@envelop/response-cache'

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    // ... other plugins ...
    useResponseCache({
      ttl: 2000,
      // some might prefer invalidating based on a database write log
      invalidateViaMutation: false,
      session: () => null
    })
  ]
})
```

### Invalidate Cache based on custom logic

```ts
import { execute, parse, subscribe, validate } from 'graphql'
import { envelop } from '@envelop/core'
import { createInMemoryCache, useResponseCache } from '@envelop/response-cache'
import { emitter } from './eventEmitter'

// we create our cache instance, which allows calling all methods on it
const cache = createInMemoryCache()

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    // ... other plugins ...
    useResponseCache({
      ttl: 2000,
      // we pass the cache instance to the request.
      cache,
      session: () => null
    })
  ]
})

emitter.on('invalidate', resource => {
  cache.invalidate([
    {
      typename: resource.type,
      id: resource.id
    }
  ])
})
```

### Customize how cache ids are built

```ts
import { execute, parse, subscribe, validate } from 'graphql'
import { envelop } from '@envelop/core'
import { createInMemoryCache, useResponseCache } from '@envelop/response-cache'
import { emitter } from './eventEmitter'

// we create our cache instance, which allows calling all methods on it
const cache = createInMemoryCache({
  // in relay we have global unique ids, no need to use `typename:id`
  makeId: (typename, id) => id ?? typename
})

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    // ... other plugins ...
    useResponseCache({
      ttl: 2000,
      // we pass the cache instance to the request.
      cache,
      session: () => null
    })
  ]
})
```

### Manipulate the calculated TTL

If you have a some kind of custom logic, that should be used to calculate the TTL for a specific
reason. The following example tracks the `Cache-Control` header from a remote server and uses it to
calculate the TTL.

```ts
const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    useSchema(
      makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            dataFromRemote: String
          }
        `,
        resolvers: {
          Query: {
            dataFromRemote: async (_, __, context) => {
              const res = await fetch('https://api.example.com/data')
              const cacheControlHeader = res.headers.get('Cache-Control')
              if (cacheControlHeader) {
                const maxAgeInSeconds = cacheControlHeader.match(/max-age=(\d+)/)
                if (maxAgeInSeconds) {
                  const ttl = parseInt(maxAgeInSeconds[1]) * 1000
                  if (context.ttl == null || ttl < context.ttl) {
                    context.ttl = ttl
                  }
                }
              }
              return res.text()
            }
          }
        }
      })
    ),
    useResponseCache({
      session: () => null,
      onTtl({ ttl, context }) {
        if (context.ttl != null && context.ttl < ttl) {
          return context.ttl
        }
        return ttl
      }
    })
  ]
})
```

### Expose cache metadata via extensions

For debugging or monitoring it might be useful to know whether a response got served from the cache
or not.

```ts
import { execute, parse, subscribe, validate } from 'graphql'
import { envelop } from '@envelop/core'

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    // ... other plugins ...
    useResponseCache({
      ttl: 2000,
      includeExtensionMetadata: true,
      session: () => null
    })
  ]
})
```

This option will attach the following fields to the execution result if set to true (or
`process.env["NODE_ENV"]` is `"development"`).

- `extension.responseCache.hit` - Whether the result was served form the cache or not
- `extension.responseCache.invalidatedEntities` - Entities that got invalidated by a mutation
  operation

#### Examples:

**Cache miss (response is generated by executing the query):**

```graphql
query UserById {
  user(id: "1") {
    id
    name
  }
}
```

```json
{
  "result": {
    "user": {
      "id": "1",
      "name": "Laurin"
    }
  },
  "extensions": {
    "responseCache": {
      "hit": false
    }
  }
}
```

**Cache hit (response served from response cache):**

```graphql
query UserById {
  user(id: "1") {
    id
    name
  }
}
```

```json
{
  "result": {
    "user": {
      "id": "1",
      "name": "Laurin"
    }
  },
  "extensions": {
    "responseCache": {
      "hit": true
    }
  }
}
```

**Invalidation via Mutation:**

```graphql
mutation SetNameMutation {
  userSetName(name: "NotLaurin") {
    user {
      id
      name
    }
  }
}
```

```json
{
  "result": {
    "userSetName": {
      "user": {
        "id": "1",
        "name": "Laurin"
      }
    }
  },
  "extensions": {
    "invalidatedEntities": [{ "id": "1", "typename": "User" }]
  }
}
```
