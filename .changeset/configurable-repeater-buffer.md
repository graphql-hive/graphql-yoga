---
'@graphql-yoga/subscription': minor
---

feat: add configurable repeater buffer to createPubSub

This allows users to configure how values are buffered when pushed faster than consumed,
preventing RepeaterOverflowError when more than 1024 pending pushes accumulate.

Available buffers from @repeaterjs/repeater:
- `FixedBuffer(capacity)` - allows N values to be pushed without waiting, throws when full
- `SlidingBuffer(capacity)` - discards oldest values when capacity is exceeded
- `DroppingBuffer(capacity)` - discards newest values when capacity is exceeded

Example:
```ts
import { createPubSub, SlidingBuffer } from '@graphql-yoga/subscription';

const pubSub = createPubSub({
  repeaterBuffer: new SlidingBuffer(256)
});
```

Closes #3692
