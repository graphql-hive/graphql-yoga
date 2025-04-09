---
'graphql-yoga': patch
---

Handle unexpected errors correctly.

Yoga checks originalError to see if it is a wrapped error of an unexpected error, because execution engine can wrap it multiple times.