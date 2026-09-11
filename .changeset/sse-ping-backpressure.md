---
'graphql-yoga': patch
---

Keep SSE keep-alive pings running when the stream reports backpressure (`desiredSize === 0`) instead of treating a full queue as a closed connection.
