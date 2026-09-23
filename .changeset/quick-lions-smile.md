---
'graphql-yoga': minor
---

Add support for the HTTP `QUERY` method as described in [graphql/graphql-over-http#411](https://github.com/graphql/graphql-over-http/pull/411).

`QUERY` requests carry the GraphQL params in the request body, exactly like `POST` (`application/json`, `application/graphql+json`, `application/graphql`, and `application/x-www-form-urlencoded` are all supported), but are treated as safe/read-only like `GET`: sending a mutation over `QUERY` is rejected with a `405 Method Not Allowed` response, the same way it already is for `GET`.

Support is enabled by default and can be turned off with the new `queryMethod` option:

```ts
createYoga({
  queryMethod: false,
})
```
