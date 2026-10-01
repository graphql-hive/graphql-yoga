---
'@envelop/response-cache': patch
---

Walk each array in a result only once when removing the plugin's metadata fields. Arrays were also walked a second time as objects, which doubled the work at every level of nesting, so deeply nested results (for example a large JSON tree) took exponentially longer to process than needed. This ran on every response the plugin handled, including ones with a TTL of 0 that are never stored.
