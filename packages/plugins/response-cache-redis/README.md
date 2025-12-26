## `@envelop/response-cache-redis`

- Supports redis cache for `@envelop/response-cache` plugin
- Suitable for serverless deployments where the LRU In-Memory Cache is not possible

[Check out the GraphQL Response Cache Guide for more information](https://envelop.dev/docs/guides/adding-a-graphql-response-cache)

## Getting Started

```bash
yarn add @envelop/response-cache
yarn add @envelop/response-cache-redis
```

## Usage Example

In order to use the Redis cache, you need to:

- Create a Redis database
- Collect the connection settings (or its connection string), e.g., `host`, `port`, `username`,
  `password`, `tls`, etc.
- Create and configure a [Redis client](https://github.com/luin/ioredis) with your
  [connection settings](https://github.com/luin/ioredis/blob/master/API.md#Redis) and any
  [additional options](https://github.com/luin/ioredis/blob/master/API.md#new_Redis_new)
- Create an instance of the Redis Cache and set to the `useResponseCache` plugin options

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import Redis from 'ioredis'
import { envelop, useEngine } from '@envelop/core'
import { useResponseCache } from '@envelop/response-cache'
import { createRedisCache } from '@envelop/response-cache-redis'

/**
 * For additional Redis options to create the ioredis client
 * @see: https://github.com/luin/ioredis/blob/master/API.md#new_Redis_new
 *
 **/
const redis = new Redis({
  host: 'my-redis-db.example.com',
  port: '30652',
  password: '1234567890'
})

// or, you can also specify connection options as a redis:// URL or rediss:// URL when using TLS encryption
const redis = new Redis('rediss://:1234567890@my-redis-db.example.com:30652')

const cache = createRedisCache({ redis })

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    // ... other plugins ...
    useResponseCache({ cache })
  ]
})
```

### Invalidate Cache based on custom logic

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { useResponseCache } from '@envelop/response-cache'
import { createRedisCache } from '@envelop/response-cache-redis'
import { emitter } from './eventEmitter'

// we create our cache instance, which allows calling all methods on it
const redis = new Redis('rediss://:1234567890@my-redis-db.example.com:30652')

const cache = createRedisCache({ redis })

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    // ... other plugins ...
    useResponseCache({
      ttl: 2000,
      // we pass the cache instance to the request.
      cache
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
