---
'graphql-yoga': patch
---

Mutations sent over a WebSocket no longer fail with "Can only perform a mutation operation from a POST request." when the WebSocket server passes the upgrade request to `getEnveloped` or `getResultForParams`. The check now applies only to requests that Yoga's HTTP handler parsed.
