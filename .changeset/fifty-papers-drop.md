---
'graphql-yoga': patch
---

Fixes the bug where the error masking incorrectly sets `http.unexpected` instead of just `unexpected`.

```diff
{
  "extensions": {
-    "http": {
      "unexpected": true
-    }
  }
}
```