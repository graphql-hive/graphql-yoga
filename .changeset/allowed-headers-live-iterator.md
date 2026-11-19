---
'graphql-yoga': patch
---

`allowedHeaders` now removes every unlisted header when the request is a native `Request`. Previously, deleting a header while iterating a native `Headers` skipped the entry after each deleted one, so about every second unlisted header in a row stayed on the request seen by resolvers and on the response.
