## `@envelop/dataloader`

This plugin helps you to create a new [DataLoader](https://github.com/graphql/dataloader) instance
every time your context is being built. The created instance is injected into the `context` with the
name you wish to use.

## Getting Started

```
yarn add dataloader @envelop/dataloader
```

## Usage Example

```ts
import DataLoader from 'dataloader'
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { useDataLoader } from '@envelop/dataloader'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    // ... other plugins ...
    useDataLoader('users', context => new DataLoader(keys => myBatchGetUsers(keys)))
  ]
})
```

Then, when you need to use it in your resolvers, just take it from the context:

```ts
export const resolvers = {
  Query: {
    user: (root, args, context, info) => {
      return context.users.load(args.id)
    }
  }
}
```

## Notes

There are several ways to create and use DataLoader, please refer to:
https://github.com/graphql/dataloader#caching-per-request for more details.
