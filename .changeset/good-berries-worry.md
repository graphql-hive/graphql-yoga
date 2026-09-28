---
'@envelop/opentelemetry': patch
---

When a resolver finishes, the resolver span must be ended even if there is an error. Leaving it open results  in broken or missing trace data.
