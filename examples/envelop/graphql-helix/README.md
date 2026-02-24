## Envelop example with GraphQL-Helix

This example demonstrate how to implement the basic GraphQL Envelop flow with Envelop and
[`graphql-helix`](https://github.com/contrawork/graphql-helix).

GraphQL-Helix provides a GraphQL execution flow, that abstract the HTTP execution, and allow you to
easily support multiple transports, based on your needs.

## Running this example

1. Install all dependencies from the root of the repo (using `pnpm`)
2. `cd` into that folder, and run `pnpm run start`.
3. Open http://localhost:3000/graphql in your browser, and try to run: `query { hello }`.
