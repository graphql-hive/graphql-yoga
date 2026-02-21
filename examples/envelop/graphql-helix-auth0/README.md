## Envelop example with GraphQL-Helix and Auth0

This example is based on the `graphql-helix` example and show-cases, how authentication with Auth0
can be added.

For a full walk-through, it is recommended to check out the accompanying guide
[Adding Authentication with Auth0](https://www.envelop.dev/docs/guides/adding-authentication-with-auth0).

## Running this example

1. Install all dependencies from the root of the repo (using `pnpm`)
2. Edit `index.ts` file inserting the necessary configuration options for your AUth0 API and
   Application.
3. `cd` into that folder, and run `pnpm run start`.
4. Open http://localhost:3000/graphql in your browser, and try to run: `query { hello }`.
