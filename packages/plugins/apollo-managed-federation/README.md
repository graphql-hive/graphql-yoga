## `@graphql-yoga/apollo-managed-federation`

This plugin integrates Apollo Managed Federation into Yoga.

## Installation

First install required dependencies:

```
yarn add graphql-yoga @graphql-yoga/apollo-managed-federation
```

You will also need and API key and the graph ref you want to deploy.

[Please follow this instructions if you don't know where to find this values.](https://www.apollographql.com/docs/federation/v1/managed-federation/setup/#4-connect-the-gateway-to-studio)

## Usage Example

```ts
import { createServer } from 'node:http'
import { createYoga } from 'graphql-yoga'
import { useManagedFederation } from '@graphql-yoga/apollo-managed-federation'

const yoga = createYoga({
  plugins: [useManagedFederation()]
})

const server = createServer(yoga)

server.listen(4000, () => {
  console.log('Server is running on http://localhost:4000')
})

process.on('SIGINT', () => {
  server.close()
})
```

You can then start the gateway, don't forget to provide your API key and graph ref. You can also
provide this values programmatically in plugin options.

```bash
APOLLO_KEY='<YOUR_GRAPH_API_KEY>' APOLLO_GRAPH_REF='<YOUR_GRAPH_ID>@<VARIANT>' node index.mjs
```
