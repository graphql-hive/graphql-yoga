---
'graphql-yoga': minor
---

Use selection-set-based serialization for GraphQL execution results.

Instead of calling `JSON.stringify` on the entire execution result, the serializer now traverses
the operation's selection set to build the JSON response. This avoids including any extra fields
that the client did not request, validates enum values and `__typename` against the schema, and
respects `@skip` / `@include` directives during serialization.

The optimization is automatically applied to non-incremental results. Results that carry a
custom `.stringify` function (e.g. from `@envelop/graphql-jit`) are still handled by that
function, so existing behaviour is preserved.
