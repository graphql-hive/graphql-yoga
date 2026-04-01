---
"graphql-yoga": patch
---

Remove global `ReadableStream[Symbol.asyncIterator]` augmentation that conflicted with TypeScript 6.0's native `lib.dom.d.ts` declaration, causing `TS2717` errors for consumers with `skipLibCheck: false`.
