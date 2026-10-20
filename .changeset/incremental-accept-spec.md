---
'graphql-yoga': minor
'@graphql-yoga/plugin-defer-stream': patch
---

Yoga maps the GraphQL HTTP `Accept` header onto `@graphql-tools/executor`'s `incrementalSpec` using the shared `INCREMENTAL_DELIVERY_SPECS` table from `@graphql-tools/utils` ([graphql-tools#8552](https://github.com/ardatan/graphql-tools/pull/8552)). `multipart/mixed;incrementalSpec=v0.2` runs the v0.2 payload format (`pending` / `id` / `subPath` / `completed`) and echoes `incrementalSpec=v0.2` on `Content-Type`. `multipart/mixed;deferSpec=20220824` or bare `multipart/mixed` stays on v0.1 (`path` / `label`). An unsupported incremental spec yields 406.

A later incremental spec is a new utils table row plus an executor publisher. Yoga's Accept negotiator does not hardcode spec strings; unknown values for a registered parameter stay 406.
