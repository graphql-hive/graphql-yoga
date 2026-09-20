---
'graphql-yoga': patch
---

Skip the request body size `TransformStream` when `Content-Length` is known.

`useLimitRequestBodySize` validated `Content-Length` and then still piped every request body
through a `TransformStream`, rebuilding the `Request` on each request. The wrapper is now applied
only when the header can't bound the body: when it is missing (chunked transfer-encoding, a streamed
body), or when `Transfer-Encoding` or `Content-Encoding` is present. Bodies over the limit are
still rejected: by the `Content-Length` check when the header is present, and by the streaming byte
counter otherwise.

This relies on the HTTP parser framing the body to the declared length, which compliant parsers do
(checked against Node, HTTP/2, Deno, Bun and uWebSockets.js). A `Request` built by hand with a `Content-Length` smaller
than its body is no longer caught while streaming.
