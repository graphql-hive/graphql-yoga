---
'@envelop/opentelemetry': patch
---

When a resolver finishes, the resolver span ends even if there is an error. Letting it open results
in broken or missing metric data.  
