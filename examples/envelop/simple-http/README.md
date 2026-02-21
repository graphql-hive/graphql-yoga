## Envelop basic example (`http` module)

This example demonstrate how to implement the basic GraphQL flow with Envelop and Node's `http`
module.

## Running this example

1. Install all dependencies from the root of the repo (using `pnpm`)
2. `cd` into that folder, and run `pnpm run start`.
3. Since this is a very basic and raw example, your should use `curl` (or any other HTTP client) to
   run the GraphQL request.

```
curl -X POST 'http://localhost:3000/' -H 'Content-Type: application/json' --data-raw '{ "query": "query test { hello }" }'
```
