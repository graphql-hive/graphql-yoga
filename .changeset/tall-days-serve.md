---
'graphql-yoga': patch
---

Replace resulting `NonErrorThrown` errors with their `thrownValue`

graphql will sometimes wrap an error with a `NonErrorThrown` that will contain the original/causing error in the `thrownValue` property. This can confuse graphql-yoga thinking the error is an internal error while it may just be a wrapped graphql error.
