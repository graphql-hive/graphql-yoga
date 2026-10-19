---
'@envelop/generic-auth': minor
---

Fix partial authorization responses incorrectly forcing HTTP 401 when using `mode: 'protect-granular'` with `rejectUnauthenticated: false`

Default authorization errors no longer include `extensions.http` in this mode. Unauthorized fields are still returned as `null` with an `UNAUTHORIZED_FIELD_OR_TYPE` error, while permitted fields continue to execute. The HTTP server determines the response status normally, allowing partial GraphQL responses to return HTTP 200 instead of 401.

For example, configure the plugin to resolve an already verified JWT payload and allow partial responses:

```ts
useGenericAuth({
  mode: 'protect-granular',
  resolveUserFn: context => context.jwt?.payload,
  rejectUnauthenticated: false
})
```

Given this schema:

```graphql
directive @requiresScopes(scopes: [[String!]!]!) on OBJECT | FIELD_DEFINITION

type Query {
  user: User @requiresScopes(scopes: [["read:profile"]])
}

type User {
  name: String
  email: String @requiresScopes(scopes: [["read:email"]])
}
```

A user whose JWT payload contains `scope: 'read:profile'`, but not `read:email`, can request:

```graphql
{
  user {
    name
    email
  }
}
```

The response contains the permitted data and the field-level authorization error, without an HTTP status override:

```json
{
  "data": {
    "user": {
      "name": "Jane",
      "email": null
    }
  },
  "errors": [
    {
      "message": "Unauthorized field or type",
      "locations": [{ "line": 4, "column": 5 }],
      "path": ["user", "email"],
      "extensions": {
        "code": "UNAUTHORIZED_FIELD_OR_TYPE"
      }
    }
  ]
}
```

Whole-operation rejection remains unchanged: setting `rejectUnauthenticated: true`, or omitting it, still rejects unauthorized operations with HTTP 401. Explicit HTTP statuses returned by a custom `validateUser` function are also preserved, even when `rejectUnauthenticated: false`.
