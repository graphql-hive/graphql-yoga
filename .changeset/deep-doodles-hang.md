---
'graphql-yoga': patch
---

Handle unexpected errors correctly

- If `extensions.unexpected` is set, consider it as an unexpected error
- If it has a non GraphQL Error in `originalError`, consider it as an unexpected error