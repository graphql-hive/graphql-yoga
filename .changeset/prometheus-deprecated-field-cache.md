---
'@envelop/prometheus': patch
---

`graphql_envelop_deprecated_field` no longer walks the same document again on every request. The deprecated fields found in a document are now kept per document until the schema changes, so a document returned by the parser cache is only visited once. Counter values are unchanged, and custom metric callbacks still receive separate deprecation info for each request.
