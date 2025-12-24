## `@envelop/response-cache-cloudflare-kv`

- Supports [Cloudflare KV](https://developers.cloudflare.com/kv/) cache for
  `@envelop/response-cache` plugin
- Suitable for graphql servers running on [Cloudflare Workers](https://workers.cloudflare.com/)

[Check out the GraphQL Response Cache Guide for more information](https://envelop.dev/docs/guides/adding-a-graphql-response-cache)

## Getting Started

```bash
yarn add @envelop/response-cache
yarn add @envelop/response-cache-cloudflare-kv
```

## Usage Example

In order to use the Cloudflare KV cache, you need to:

- Create a Cloudflare KV namespace
- Add that namespace to your `wrangler.toml` in order to access it from your worker. Read the
  [KV docs](https://developers.cloudflare.com/kv/get-started/) to get started.
- Pass the KV namespace to the `createKvCache` function and set to the `useResponseCache` plugin
  options. See the example below.

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
