## `@envelop/preload-assets`

Inject a function for registering assets that should be preloaded on the client. The registered
assets will be added under the `extensions.preloadAssets` key on the execution result.

On your client network layer you can register a handler for preloading the given resources as soon
as the operation result is arriving on the client!

## Getting Started

```
yarn add @envelop/preload-assets
```

```ts
import { execute, makeExecutableSchema, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { usePreloadAssets } from '@envelop/preload-asset'

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      imageUrl: String!
    }
  `,
  resolvers: {
    Query: {
      imageUrl: (_: unknown, __: unknown, context: any) => {
        const imageUrl = 'https://localhost/some-asset.png'
        context.registerPreloadAsset(imageUrl)
        return Promise.resolve(imageUrl)
      }
    }
  }
})

const getEnveloped = envelop({
  plugins: [useEngine({ parse, validate, specifiedRules, execute, subscribe }), usePreloadAssets()]
})
```

**Example response**

```json
{
  "data": {
    "imageUrl": "https://localhost/some-asset.png"
  },
  "extensions": {
    "preloadAssets": ["https://localhost/some-asset.png"]
  }
}
```

**Example client prefetch logic**

```ts
const preloadAsset = url => {
  var request = new XMLHttpRequest()
  request.open('GET', url)
  request.responseType = 'blob'
  request.onload = () => {
    if (request.status !== 200) {
      console.error(new Error(`Image preload failed; error code '${request.statusText}'.`))
    }
  }
  request.onerror = () => {
    console.error(new Error(`There was a network error while preloading '${url}'.`))
  }
  request.send()
}

// call this function with the execution result within your network layer.
const onExecutionResult = result => {
  if (Array.isArray(result?.extensions?.preloadAssets)) {
    result.extension.preloadAssets.forEach(url => {
      preloadAsset(url)
    })
  }
}
```
