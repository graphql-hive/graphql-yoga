---
'@graphql-yoga/plugin-graphql-sse': patch
---

Syntax errors no longer make the `/graphql/stream` endpoint answer `500` with a plain text stack trace, and validation and variable coercion errors are no longer reported as `Unable to detect operation AST`. They are now returned as regular GraphQL errors (`{ data: null, errors }`) with their real messages.
