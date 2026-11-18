---
'graphql-yoga': patch
---

Match health, readiness and GraphQL endpoint suffixes against the URL pathname. Query strings no longer prevent health probes from matching or make unrelated requests match an endpoint merely because a query value ends with its path. Mounted endpoint suffixes remain supported.
