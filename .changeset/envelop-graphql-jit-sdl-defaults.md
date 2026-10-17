---
'@envelop/graphql-jit': patch
---

Allow `graphql-jit@^0.9.1` so SDL default values for arguments are applied on graphql 17. `graphql-jit@0.8.x` reads only `default.value`, but graphql 17 stores an SDL default in `default.literal`, so a query omitting an argument such as `page: Int! = 0` failed with `Argument "page" of required type "Int!" was not provided.`
