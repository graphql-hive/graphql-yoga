---
'graphql-yoga': patch
---

Fix error isolation in batched GraphQL operations

When processing batched GraphQL requests, an error in one operation would previously cause the entire batch to fail. This change wraps each batched operation in error handling so that individual operation errors are caught and returned as GraphQL errors for that specific operation, while other operations in the batch continue to execute successfully.
