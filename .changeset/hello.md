---
'@graphql-yoga/plugin-defer-stream': patch
---

When adding the defer and stream directives to the schema, we need to make sure to also move the extensions from the old schema to the new one, otherwise we might lose important information like plugin metadata.