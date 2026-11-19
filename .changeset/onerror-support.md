---
'graphql-yoga': minor
---

Add support for the GraphQL-over-HTTP `onError` request parameter ([graphql/graphql-spec#1163](https://github.com/graphql/graphql-spec/pull/1163)), letting a client choose how execution errors on non-null fields are handled.

Send `onError` alongside `query`, the same way you'd send `variables` or `operationName` — as a JSON body field, a GET query parameter, or a form-urlencoded field:

```json
{
  "query": "{ dangerousField }",
  "onError": "HALT"
}
```

Three values are defined by the spec:

- `PROPAGATE` — the default when `onError` is omitted, and today's existing behavior. Errors are reported in `errors`, and `data` nulls out only the failing field and its non-null ancestors.
- `HALT` — on the first execution error, the whole response collapses to `{ data: null, errors: [firstError] }`. For a subscription, only the erroring event collapses; the stream stays open for subsequent events.
- `NULL` — accepted on the wire per spec, but rejected here with a 400 and `extensions.code: 'ON_ERROR_UNSUPPORTED'`, since no execution engine Yoga calls (graphql-js, graphql-jit, …) can produce a `NULL`-shaped result.

An unrecognized `onError` value is a GraphQL-over-HTTP request error: 400, with `extensions.http.spec: true`.

`HALT` cannot be combined with `@defer`/`@stream`: a document using either directive is refused with the same `ON_ERROR_UNSUPPORTED` 400 before execution starts.
