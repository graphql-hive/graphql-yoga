## `@envelop/graphql-modules`

This plugins integrates [`graphql-modules`](https://github.com/Urigo/graphql-modules) execution
lifecycle into the GraphQL execution flow.

If you are using `graphql-modules` dependency injection - this setup is needed in order to make sure
`Injector` is created and destroyed at the right time.

## Getting Started

```
yarn add @envelop/graphql-modules
```

## Usage Example

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { createApplication } from 'graphql-modules'
import { envelop, useEngine } from '@envelop/core'
import { useGraphQLModules } from '@envelop/graphql-modules'

const myApp = createApplication({
  modules: [
    /* ... */
  ]
})

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    // ... other plugins ...
    useGraphQLModules(myApp)
  ]
})
```

Then, you can use GraphQL-Modules `injector` in your resolvers:

```ts
const resolvers = {
  Query: {
    foo: (root, args, context, info) => {
      const myProviderInstance = context.injector.get(/* ... */)
    }
  }
}
```
