## TypeGraphQL & Envelop

This example demonstrate how to implement the basic GraphQL flow with Envelop+Helix, and with schema
provided by TypeGraphQL.

## Running this example

1. Install all dependencies from the root of the repo (using `pnpm`)
2. `cd` into that folder, and run `pnpm run start`.
3. Try to open `http://localhost:3000/graphql`

## Use it with `typedi`

If you are using TypeGraphQL with dependency injection, and you wish to inject your execution
`Container`, you can use `useExtendContext` to build and inject it:

```ts
const getEnveloped = envelop({
  plugins: [
    // ...
    useExtendContext(({ context, extendContext }) => {
      // generate the requestId (it also may come from `express-request-id` or other middleware)
      const requestId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) // uuid-like
      const container = Container.of(requestId) // get the scoped container
      const typeGraphQLContext = { ...context, requestId, container } // create fresh context object for TypeDI
      container.set('context', typeGraphQLContext) // place context or other data in container

      // Make these available also for Envelop context
      extendContext({
        requestId,
        container
      })
    })
  ]
})
```

> [You can read more about this setup here](https://typegraphql.com/docs/dependency-injection.html)
