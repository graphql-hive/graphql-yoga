# @envelop/instrumentation

## 2.0.0

### Major Changes

- [#4574](https://github.com/graphql-hive/graphql-yoga/pull/4574)
  [`79b0e8b`](https://github.com/graphql-hive/graphql-yoga/commit/79b0e8b0fc344b5e205e5d99aed33fdf0a98bd6b)
  Thanks [@egoodwinx](https://github.com/egoodwinx)! - ### Breaking Changes
  - **Node**: minimum supported version is now Node 22. Node 18 and 20 are no longer supported.
    Future releases will only support Node >=22.
  - **GraphQL**: minimum supported version is now GraphQL 16. GraphQL 14 and 15 are no longer
    supported.
  - **Request body parsing**: Yoga now limits request bodies to 25,000,000 bytes by default.
    Enforcing this limit streams the body through a byte counter, making POST body parsing
    asynchronous even for an in-memory body. As a result, `yoga.fetch()` can return a Promise where
    it previously returned a synchronous Response, even when all resolvers and plugins are
    synchronous.

  ### Migration
  - If you're on Node 18/20, upgrade to Node 22 or later before upgrading this package.
  - If you're on graphql 14/15, upgrade to graphql 16 or 17 first.
  - Await `yoga.fetch()` and response body parsing instead of relying on synchronous results. Set
    `maxRequestBodySize: false` in `createYoga` to disable the body-size limit and preserve
    synchronous parsing for in-memory bodies, but only if you enforce an appropriate request-body
    limit elsewhere.

## 1.0.1

### Patch Changes

- [#4577](https://github.com/graphql-hive/graphql-yoga/pull/4577)
  [`7bff35c`](https://github.com/graphql-hive/graphql-yoga/commit/7bff35cf0274d59ad5eaeeee3bfd0390fe593871)
  Thanks [@egoodwinx](https://github.com/egoodwinx)! - Add homepage and bugs.url to package.json
  files
