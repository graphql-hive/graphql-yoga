# @graphql-yoga/render-apollo-sandbox

## 0.3.0

### Patch Changes

- [#4312](https://github.com/graphql-hive/graphql-yoga/pull/4312)
  [`3eabd17`](https://github.com/graphql-hive/graphql-yoga/commit/3eabd17faae2d85dae09608370707ba2833052bd)
  Thanks [@ardatan](https://github.com/ardatan)! - - Add `target` option that allows you to choose
  which HTML element you want to render Apollo Sandbox
  - Set it to `#embedded-sandbox` by default
  - Use `GraphiQLRenderer` type from `graphql-yoga` package to prevent typing regressions
  - Fix `renderGraphiQL` option type
  - Set `initialEndpoint` based on `graphiqlOpts.endpoint` if provided
  - Set `includeCookies` based on `graphiqlOpts.credentials` if provided
  - Fix margin and size issues in the rendered HTML
- Updated dependencies
  [[`3eabd17`](https://github.com/graphql-hive/graphql-yoga/commit/3eabd17faae2d85dae09608370707ba2833052bd)]:
  - graphql-yoga@5.18.0

## 0.2.1

### Patch Changes

- Updated dependencies
  [[`c27f550`](https://github.com/graphql-hive/graphql-yoga/commit/c27f5506f579318a333c86aaa5aa861f21b16784)]:
  - graphql-yoga@5.17.1

## 0.2.0

### Patch Changes

- Updated dependencies
  [[`66c370c`](https://github.com/graphql-hive/graphql-yoga/commit/66c370cb185f632ec9d28cf642d3049a981effeb),
  [`66c370c`](https://github.com/graphql-hive/graphql-yoga/commit/66c370cb185f632ec9d28cf642d3049a981effeb)]:
  - graphql-yoga@5.17.0

## 0.1.2

### Patch Changes

- Updated dependencies
  [[`ba38629`](https://github.com/graphql-hive/graphql-yoga/commit/ba38629974f7ad353a28efd7ab83b7ffe938881c)]:
  - graphql-yoga@5.16.2

## 0.1.1

### Patch Changes

- Updated dependencies
  [[`6f83cea`](https://github.com/graphql-hive/graphql-yoga/commit/6f83cea1aa1e2166664304f6853e7d5f88f0739a),
  [`e1f52b6`](https://github.com/graphql-hive/graphql-yoga/commit/e1f52b656c30e94d13d050a9211740c5b1d49913),
  [`6f83cea`](https://github.com/graphql-hive/graphql-yoga/commit/6f83cea1aa1e2166664304f6853e7d5f88f0739a)]:
  - graphql-yoga@5.16.1

## 0.1.0

### Patch Changes

- [#3654](https://github.com/graphql-hive/graphql-yoga/pull/3654)
  [`1d09e6f`](https://github.com/graphql-hive/graphql-yoga/commit/1d09e6fa77f75ee2c2d550213da56c906693dac7)
  Thanks [@ardatan](https://github.com/ardatan)! - New renderer for Apollo Sandbox instead of
  GraphiQL

- Updated dependencies
  [[`a4e1c5f`](https://github.com/graphql-hive/graphql-yoga/commit/a4e1c5f8bfbaada3ffea4a7a2b090ce7e015e715),
  [`0a7a635`](https://github.com/graphql-hive/graphql-yoga/commit/0a7a635f60886e6ecaa9a5e4245c15a00f9d9737)]:
  - graphql-yoga@5.16.0
