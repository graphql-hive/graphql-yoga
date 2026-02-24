## Envelop example of GraphQL-Helix with `@defer` and `@stream`

This example demonstrate how to implement the basic GraphQL Envelop flow with Envelop and
[`graphql-helix`](https://github.com/contrawork/graphql-helix).

GraphQL-Helix provides a GraphQL execution flow, that abstract the HTTP execution, and allows you to
easily support multiple transports, based on your needs.

Additionally, it has built in support for the
[`@defer` and `@stream` directives](https://github.com/graphql/graphql-spec/blob/main/rfcs/DeferStream.md),
allowing
[incremental delivery over HTTP](https://github.com/graphql/graphql-over-http/blob/main/rfcs/IncrementalDelivery.md).

Subscriptions over
[Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) are also
supported, which simplify overhead required for setting up subscriptions over a more complex
protocol like graphql-transport-ws.

This examples uses the experimental `graphql.js` version `15.4.0-experimental-stream-defer.1` for
showcasing stream and defer usage.

## Running this example

1. `cd` into ththisat folder
1. Install all dependencies (using `pnpm`)
1. Run `pnpm run start`.
1. Open http://localhost:3000/graphql in your browser, and try one of the suggested operations.
