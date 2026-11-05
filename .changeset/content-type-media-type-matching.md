---
'graphql-yoga': patch
---

Match the request `Content-Type` media type case-insensitively and allow optional whitespace before
its parameters, as required by RFC 9110. A request sent with `Application/JSON` or
`application/json ; charset=utf-8` was rejected with `415 Unsupported Media Type`.
