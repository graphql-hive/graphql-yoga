---
'@graphql-yoga/plugin-graphql-sse': patch
---

Fixed `useGraphQLSSE()` leaking a raw stack trace (`500 text/plain`) for queries with a syntax error, and misreporting validation and variable-coercion errors as `400 "Unable to detect operation AST"` instead of their real messages. These pre-execution results now carry the `data: null` key graphql-sse's own result detection requires, so they are delivered as normal (masked, where applicable) `next` events with their actual error messages. (closes #4657)
