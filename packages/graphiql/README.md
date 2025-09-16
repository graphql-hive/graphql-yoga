# Yoga GraphiQL

This the GraphiQL used by GraphQL Yoga. This package is currently not published to npm and only
contains the React component `GraphQLYoga`.

## Development

You can run a local instance on `http://localhost:4001` with the following command".

```ts
pnpm --filter @graphql-yoga/graphiql start
```

The development server will automatically proxy `http://localhost:4000/graphql`, so make sure you
have a Yoga instance running on that port.
