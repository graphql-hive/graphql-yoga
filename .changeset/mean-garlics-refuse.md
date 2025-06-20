---
'graphql-yoga': minor
---

Added new `withState` plugin utility for easy data sharing between hooks.

## New plugin utility to ease data sharing between hooks

Sometimes, plugins can grow in complexity and need to share data between its hooks.

A way to solve this can be to mutate the graphql context, but this context is not always available
in all hooks in Yoga or Hive Gateway plugins. Moreover, mutating the context gives access to your
internal data to all other plugins and graphql resolvers, without mentioning performance impact on
field access on this object.

The recommended approach to this problem was to use a `WeakMap` with a stable key (often the
`context` or `request` object). While it works, it's not very convenient for plugin developers, and
is prone to error with the choice of key.

The new `withState` utility solves this DX issue by providing an easy and straightforward API for
data sharing between hooks.

```ts
import { withState } from '@envelop/core'

type State = { foo: string }

const myPlugin = () =>
  withState<Plugin, State>(() => ({
    onParse({ state }) {
      state.forOperation.foo = 'foo'
    },
    onValidate({ state }) {
      const { foo } = state.forOperation
      console.log('foo', foo)
    }
  }))
```

The `state` payload field will be available in all relevant hooks, making it easy to access shared
data. It also forces the developer to choose the scope for the data:

- `forOperation` for a data scoped to GraphQL operation (Envelop, Yoga and Hive Gateway)
- `forRequest` for a data scoped to HTTP request (Yoga and Hive Gateway)
- `forSubgraphExecution` for a data scoped to the subgraph execution (Hive Gateway)

Not all scopes are available in all hooks, the type reflects which scopes are available

Under the hood, those states are kept in memory using `WeakMap`, which avoid any memory leaks.

It is also possible to manually retrieve the state with the `getState` function:

```ts
const myPlugin = () =>
  withState(getState => ({
    onParse({ context }) {
      // You can provide a payload, which will dictate which scope you have access to.
      // The scope can contain `context`, `request` and `executionRequest` fields.
      const state = getState({ context })
      // Use the state elsewhere.
    }
  }))
```
