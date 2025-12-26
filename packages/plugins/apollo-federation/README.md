## `@envelop/apollo-federation`

This plugin integrates Apollo Federation Gateway into Envelop.

## Getting Started

```
yarn add @envelop/apollo-federation
```

## Usage Example

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { ApolloGateway } from '@apollo/gateway'
import { useApolloFederation } from '@envelop/apollo-federation'
import { envelop, useEngine } from '@envelop/core'

// Initialize the gateway
const gateway = new ApolloGateway({
  serviceList: [
    { name: 'accounts', url: 'http://localhost:4001' },
    { name: 'products', url: 'http://localhost:4002' }
    // ...additional subgraphs...
  ]
})

// Make sure all services are loaded
await gateway.load()

// Then pass it to the plugin configuration
const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    // ... other plugins ...
    useApolloFederation({ gateway })
  ]
})
```
