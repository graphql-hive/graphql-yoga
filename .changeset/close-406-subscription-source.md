---
'graphql-yoga': patch
---

Close the source of a subscription (or other async iterable result) when the response is `406 Not Acceptable`. Previously the iterator was dropped without calling `return()`, so a source that subscribes eagerly, such as `events.on()`, kept its listener attached.
