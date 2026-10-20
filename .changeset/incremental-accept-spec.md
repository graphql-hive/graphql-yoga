---
'graphql-yoga': minor
'@graphql-yoga/plugin-defer-stream': patch
---

Yoga maps the GraphQL HTTP `Accept` header onto `@graphql-tools/executor`'s `incrementalSpec`. `multipart/mixed;incrementalSpec=v0.2` runs the v0.2 payload format (`pending` / `id` / `subPath` / `completed`) and echoes `incrementalSpec=v0.2` on `Content-Type`. `multipart/mixed;deferSpec=20220824` or bare `multipart/mixed` stays on v0.1 (`path` / `label`). An unsupported incremental spec yields 406.
