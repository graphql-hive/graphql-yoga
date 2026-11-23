---
'@envelop/generic-auth': patch
---

Enforce authorization directives consistently across interfaces and their implementing types

`@authenticated`, `@requiresScopes` and `@policy` directives are now enforced on every selection of a field, regardless of whether it is selected on an interface or on an implementing object type:

- Directives declared on an interface (including transitively implemented interfaces) also apply to the implementing object types.
- Fields selected on an interface are authorized against the actual type of each resolved object. Objects whose type allows the field resolve normally, while objects whose type requires authorization are denied when they are resolved. With `rejectUnauthenticated` (the default), such a denial rejects the result (or the individual subscription event) with `data: null`; since the actual type is only known during execution, resolvers that already ran (including mutation side effects) are not undone. With `rejectUnauthenticated: false`, the denied field resolves to `null` with an error, following regular GraphQL null propagation.
- To check the actual type, resolvers of object type fields that implement interface fields are wrapped when the schema is set. The checks are tracked per execution, so executions sharing a context or a parsed document never use each other's checks. Fields without their own resolver get one too, so executions that bypass envelop and rely on a custom `fieldResolver` use the default field resolver for them.
- When multiple sources declare the auth directive with different arguments, a custom `validateUser` function is invoked for each distinct declaration and access is denied if any of them fails.
- An explicitly declared empty `scopes` or `policies` list is treated as unsatisfiable instead of as "no requirement".
