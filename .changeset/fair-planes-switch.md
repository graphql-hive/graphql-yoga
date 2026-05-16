---
'@graphql-yoga/plugin-response-cache': patch
---

Include the `Last-Modified` header in early `304 Not Modified` responses returned by the response-cache plugin's `onRequest` short-circuit path.

Previously, this path returned only `ETag`. Now it returns both `ETag` and `Last-Modified` from cached response metadata so conditional revalidation responses are consistent with the original cached `200` response headers.

This improves interoperability with HTTP intermediaries and edge caches that rely on both validators (`If-None-Match` and `If-Modified-Since`) during revalidation, helping avoid unstable cache states when only one validator is present in a `304` response.
