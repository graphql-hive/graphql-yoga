# Generic Auth example

Showcase of doing authentication for Query, Mutation and Subscription operations.

```bash
yarn --filter example-generic-auth dev
```

Provide the authentication token `aaa` or `bbb` via the `x-authorization` header or the
`x-authorization` query parameter.

**Example: Query with header authorization**

```bash
curl -g \
  -X POST \
  -H "content-type: application/json" \
  -H "x-authorization: aaa" \
  -d '{"query":"query Hi { requiresAuth }"}' \
  "http://localhost:4000/graphql"
```

**Example: Query with query parameter authorization**

```bash
curl -g \
  -X POST \
  -H "content-type: application/json" \
  -d '{"query":"query Hi { requiresAuth }"}' \
  "http://localhost:4000/graphql?x-authorization=bbb"
```

**Example: Subscription with header authorization**

```bash
curl -g \
  -X GET \
  -H "accept: text/event-stream" \
  -H "x-authorization: bbb" \
  "http://localhost:4000/graphql?query=subscription%20Hi%20%7B%20requiresAuth%20%7D"
```

**Example: Subscription with query parameter authorization**

```bash
curl -g \
  -X GET \
  -H "accept: text/event-stream" \
  "http://localhost:4000/graphql?query=subscription%20Hi%20%7B%20requiresAuth%20%7D&x-authorization=aaa"
```
