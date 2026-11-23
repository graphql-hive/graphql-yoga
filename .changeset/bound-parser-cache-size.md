---
'graphql-yoga': patch
---

The default parser and validation caches are now also bounded by the total length of cached document strings (1 MiB), not only by entry count and TTL. A parsed document can take a few hundred times more memory than its text, so previously caching many large documents (including ones that fail validation) could exhaust the process memory. Documents and parse errors whose source is larger than this limit are no longer cached, and the least recently used entries are evicted to stay within it. Custom `documentCache` and `errorCache` implementations are not affected.
