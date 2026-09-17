---
'graphql-yoga': patch
---

Strengthen prototype pollution tests for multipart requests by asserting directly on
`Object.prototype`/`{}` rather than only inferring safety from a follow-up request, and add coverage
for previously-untested bypass paths (`hasOwnProperty`/`toString`/`valueOf` traversal, and
`__proto__`/`constructor.prototype`/`prototype` appearing mid-path).
