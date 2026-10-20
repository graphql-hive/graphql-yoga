---
'graphql-yoga': minor
'@graphql-yoga/plugin-defer-stream': patch
---

Yoga maps the GraphQL HTTP `Accept` header onto `@graphql-tools/executor`'s `incrementalSpec` by looking up `INCREMENTAL_DELIVERY_SPECS` from `@graphql-tools/utils` ([graphql-tools#8552](https://github.com/ardatan/graphql-tools/pull/8552)). `multipart/mixed;incrementalSpec=v0.2` runs the v0.2 payload format (`pending` / `id` / `subPath` / `completed`) and echoes `incrementalSpec=v0.2` on `Content-Type`. `multipart/mixed;deferSpec=20220824` or bare `multipart/mixed` stays on v0.1 (`path` / `label`). An unsupported incremental spec yields 406.

A later incremental spec does not need another Yoga Accept/Content-Type patch. graphql-tools adds a table row and an executor publisher; Yoga, Hive Gateway, and HTTP executors pick up the new identifier by bumping `@graphql-tools/utils` / `@graphql-tools/executor`. Yoga's negotiator looks up the table instead of hardcoding spec strings. Unknown values for a registered parameter stay 406.
