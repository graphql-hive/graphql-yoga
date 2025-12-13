---
'@graphql-yoga/render-apollo-sandbox': patch
---

- Add `target` option that allows you to choose which HTML element you want to render Apollo Sandbox
- Set it to `#embedded-sandbox` by default
- Use `GraphiQLRenderer` type from `graphql-yoga` package to prevent typing regressions
- Fix `renderGraphiQL` option type
- Set `initialEndpoint` based on `graphiqlOpts.endpoint` if provided
- Set `includeCookies` based on `graphiqlOpts.credentials` if provided
- Fix margin and size issues in the rendered HTML