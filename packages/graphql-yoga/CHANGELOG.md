# graphql-yoga

## 5.17.1

### Patch Changes

- [#4302](https://github.com/graphql-hive/graphql-yoga/pull/4302)
  [`c27f550`](https://github.com/graphql-hive/graphql-yoga/commit/c27f5506f579318a333c86aaa5aa861f21b16784)
  Thanks [@beaumontjonathan](https://github.com/beaumontjonathan)! - Bump
  @whatwg-node/promise-helpers to fix missing export unfakePromise

## 5.17.0

### Minor Changes

- [#4288](https://github.com/graphql-hive/graphql-yoga/pull/4288)
  [`66c370c`](https://github.com/graphql-hive/graphql-yoga/commit/66c370cb185f632ec9d28cf642d3049a981effeb)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Add experimental support for
  [`coordinate` error attribute proposal](https://github.com/graphql/graphql-spec/pull/1200).

  The `coordinate` attribute indicates the coordinate in the schema of the resolver which
  experienced the errors. It allows for an easier error source identification than with the `path`
  which can be difficult to walk, or even lead to unsolvable ambiguities when using Union or
  Interface types.

  ## Usage

  Since this is experimental, it has to be explicitly enabled by adding the appropriate plugin to
  the Yoga instance:

  ```ts
  import { createYoga, useErrorCoordinate } from 'graphql-yoga'
  import { schema } from './schema'

  export const yoga = createYoga({
    schema,
    plugins: [useErrorCoordinate()]
  })
  ```

  Once enabled, located errors will gain the `coordinate` attribute:

  ```ts
  const myPlugin = {
    onExecutionResult({ result }) {
      if (result.errors) {
        for (const error of result.errors) {
          console.log('Error at', error.coordinate, ':', error.message)
        }
      }
    }
  }
  ```

  ## Security concerns

  Adding a schema coordinate to errors exposes information about the schema, which can be an attack
  vector if you rely on the fact your schema is private and secret.

  This is why the `coordinate` attribute is not serialized by default, and will not be exposed to
  clients.

  If you want to send this information to client, override either each `toJSON` error's method, or
  add a dedicated extension.

  ```ts
  import { GraphQLError } from 'graphql'
  import { createYoga, maskError, useErrorCoordinate } from 'graphql-yoga'
  import { schema } from './schema'

  export const yoga = createYoga({
    schema,
    plugins: [useErrorCoordinate()],
    maskedErrors: {
      isDev: process.env['NODE_ENV'] === 'development', // when `isDev` is true, errors are not masked
      maskError: (error, message, isDev) => {
        if (error instanceof GraphQLError) {
          error.toJSON = () => {
            // Get default graphql serialized error representation
            const json = GraphQLError.prototype.toJSON.apply(error)
            // Manually add the coordinate attribute. You can also use extensions instead.
            json.coordinate = error.coordinate
            return json
          }
        }

        // Keep the default error masking implementation
        return maskError(error, message, isDev)
      }
    }
  })
  ```

### Patch Changes

- [#4288](https://github.com/graphql-hive/graphql-yoga/pull/4288)
  [`66c370c`](https://github.com/graphql-hive/graphql-yoga/commit/66c370cb185f632ec9d28cf642d3049a981effeb)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor@^1.5.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.5.0)
    (from `^1.4.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.11.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.11.0)
    (from `^10.6.2`, in `dependencies`)

## 5.16.2

### Patch Changes

- [#4270](https://github.com/graphql-hive/graphql-yoga/pull/4270)
  [`ba38629`](https://github.com/graphql-hive/graphql-yoga/commit/ba38629974f7ad353a28efd7ab83b7ffe938881c)
  Thanks [@ardatan](https://github.com/ardatan)! - Fixes the bug where the error masking incorrectly
  sets `http.unexpected` instead of just `unexpected`.

  ```diff
  {
    "extensions": {
  -    "http": {
        "unexpected": true
  -    }
    }
  }
  ```

## 5.16.1

### Patch Changes

- [#4263](https://github.com/graphql-hive/graphql-yoga/pull/4263)
  [`6f83cea`](https://github.com/graphql-hive/graphql-yoga/commit/6f83cea1aa1e2166664304f6853e7d5f88f0739a)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/server@^0.10.14` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.10.14)
    (from `^0.10.5`, in `dependencies`)

- [#4264](https://github.com/graphql-hive/graphql-yoga/pull/4264)
  [`e1f52b6`](https://github.com/graphql-hive/graphql-yoga/commit/e1f52b656c30e94d13d050a9211740c5b1d49913)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Removed dependency [`dset@^3.1.4` ↗︎](https://www.npmjs.com/package/dset/v/3.1.4) (from
    `dependencies`)

- [#4263](https://github.com/graphql-hive/graphql-yoga/pull/4263)
  [`6f83cea`](https://github.com/graphql-hive/graphql-yoga/commit/6f83cea1aa1e2166664304f6853e7d5f88f0739a)
  Thanks [@ardatan](https://github.com/ardatan)! - Update GraphiQL dependencies

## 5.16.0

### Minor Changes

- [#3188](https://github.com/graphql-hive/graphql-yoga/pull/3188)
  [`a4e1c5f`](https://github.com/graphql-hive/graphql-yoga/commit/a4e1c5f8bfbaada3ffea4a7a2b090ce7e015e715)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Add `allowedHeaders` option to allow
  filtering Response and Request headers

### Patch Changes

- [#4191](https://github.com/graphql-hive/graphql-yoga/pull/4191)
  [`0a7a635`](https://github.com/graphql-hive/graphql-yoga/commit/0a7a635f60886e6ecaa9a5e4245c15a00f9d9737)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix workers' loading in online GraphiQL mode, so
  that Monaco features like autocomplete can work properly

## 5.15.2

### Patch Changes

- [`e7b8906`](https://github.com/graphql-hive/graphql-yoga/commit/e7b8906d2259c643b61a4fc1d8345df533a64eb9)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump URL Loader in GraphiQL to the latest to
  remove extra DOWNSTREAM_SERVICE_ERROR code in the errors

## 5.15.1

### Patch Changes

- [#4116](https://github.com/graphql-hive/graphql-yoga/pull/4116)
  [`ecd605b`](https://github.com/graphql-hive/graphql-yoga/commit/ecd605bc3d8ae3989dd09be31b89c1f5ae94c8be)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Does not GraphQL error extensions when it's
  wrapping an internal server error

## 5.15.0

### Minor Changes

- [#4114](https://github.com/graphql-hive/graphql-yoga/pull/4114)
  [`ccb5c53`](https://github.com/graphql-hive/graphql-yoga/commit/ccb5c536a81165a8581e63341c5a80109fe15cf5)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Configurable GraphiQL logo and favicon

### Patch Changes

- [#4114](https://github.com/graphql-hive/graphql-yoga/pull/4114)
  [`ccb5c53`](https://github.com/graphql-hive/graphql-yoga/commit/ccb5c536a81165a8581e63341c5a80109fe15cf5)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Export GraphiQLPluginConfig and
  GraphiQLOptionsOrFactory

## 5.14.0

### Minor Changes

- [#4088](https://github.com/graphql-hive/graphql-yoga/pull/4088)
  [`98c82a5`](https://github.com/graphql-hive/graphql-yoga/commit/98c82a5d70040f488d72cfda52b8afa81b5da2a1)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Added new `withState` plugin utility
  for easy data sharing between hooks.

  ## New plugin utility to ease data sharing between hooks

  Sometimes, plugins can grow in complexity and need to share data between its hooks.

  A way to solve this can be to mutate the graphql context, but this context is not always available
  in all hooks in Yoga or Hive Gateway plugins. Moreover, mutating the context gives access to your
  internal data to all other plugins and graphql resolvers, without mentioning performance impact on
  field access on this object.

  The recommended approach to this problem was to use a `WeakMap` with a stable key (often the
  `context` or `request` object). While it works, it's not very convenient for plugin developers,
  and is prone to error with the choice of key.

  The new `withState` utility solves this DX issue by providing an easy and straightforward API for
  data sharing between hooks.

  ```ts
  import { withState } from 'graphql-yoga'

  type State = { foo: string }

  const myPlugin = () =>
    withState<Plugin, State>(() => ({
      onParse({ state }) {
        state.forOperation.foo = 'foo'
      },
      onValidate({ state }) {
        const { foo } = state.forOperation
        console.log('foo', foo)
      }
    }))
  ```

  The `state` payload field will be available in all relevant hooks, making it easy to access shared
  data. It also forces the developer to choose the scope for the data:
  - `forOperation` for a data scoped to GraphQL operation (Envelop, Yoga and Hive Gateway)
  - `forRequest` for a data scoped to HTTP request (Yoga and Hive Gateway)
  - `forSubgraphExecution` for a data scoped to the subgraph execution (Hive Gateway)

  Not all scopes are available in all hooks, the type reflects which scopes are available

  Under the hood, those states are kept in memory using `WeakMap`, which avoid any memory leaks.

  It is also possible to manually retrieve the state with the `getState` function:

  ```ts
  const myPlugin = () =>
    withState(getState => ({
      onParse({ context }) {
        // You can provide a payload, which will dictate which scope you have access to.
        // The scope can contain `context`, `request` and `executionRequest` fields.
        const state = getState({ context })
        // Use the state elsewhere.
      }
    }))
  ```

### Patch Changes

- [#4093](https://github.com/graphql-hive/graphql-yoga/pull/4093)
  [`5f75a42`](https://github.com/graphql-hive/graphql-yoga/commit/5f75a42c8a739fad10f951e2d4953495e93b743e)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Inherit GraphQL error extensions when it's
  wrapping an internal server error

- [#4088](https://github.com/graphql-hive/graphql-yoga/pull/4088)
  [`98c82a5`](https://github.com/graphql-hive/graphql-yoga/commit/98c82a5d70040f488d72cfda52b8afa81b5da2a1)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:
  - Updated dependency
    [`@envelop/core@^5.3.0` ↗︎](https://www.npmjs.com/package/@envelop/core/v/5.3.0) (from
    `^5.2.3`, in `dependencies`)

## 5.13.5

### Patch Changes

- [#3998](https://github.com/graphql-hive/graphql-yoga/pull/3998)
  [`8b41a52`](https://github.com/graphql-hive/graphql-yoga/commit/8b41a522917826b7ea24eca97e421b5aaeda6337)
  Thanks [@renovate](https://github.com/apps/renovate)! - Remove extra error handling plugin

## 5.13.4

### Patch Changes

- [#3995](https://github.com/graphql-hive/graphql-yoga/pull/3995)
  [`000c33d`](https://github.com/graphql-hive/graphql-yoga/commit/000c33dc043454f4b73d15f03c3e688cfb9d0901)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Update whatwg-node packages

  In light of https://github.com/ardatan/whatwg-node/pull/2305. Please upgrade as soon as possible!

- Updated dependencies
  [[`000c33d`](https://github.com/graphql-hive/graphql-yoga/commit/000c33dc043454f4b73d15f03c3e688cfb9d0901)]:
  - @graphql-yoga/subscription@5.0.5

## 5.13.3

### Patch Changes

- [#3968](https://github.com/graphql-hive/graphql-yoga/pull/3968)
  [`1773c8c`](https://github.com/graphql-hive/graphql-yoga/commit/1773c8c193e7cf7dc34710da8422fb951c4f4a41)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle unexpected errors correctly.

  Yoga checks originalError to see if it is a wrapped error of an unexpected error, because
  execution engine can wrap it multiple times.

- [#3930](https://github.com/graphql-hive/graphql-yoga/pull/3930)
  [`3a7ef74`](https://github.com/graphql-hive/graphql-yoga/commit/3a7ef74eae1f1926213f671b20521bed14496873)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump `@whatwg-node/server`

- Updated dependencies
  [[`3a7ef74`](https://github.com/graphql-hive/graphql-yoga/commit/3a7ef74eae1f1926213f671b20521bed14496873)]:
  - @graphql-yoga/subscription@5.0.4

## 5.13.2

### Patch Changes

- [#3876](https://github.com/dotansimha/graphql-yoga/pull/3876)
  [`abe91bd`](https://github.com/dotansimha/graphql-yoga/commit/abe91bd9039376f50b81babae61bcfb8f7e01a36)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Re-export the utility type
  `AsyncIterableIteratorOrValue` from `@envelop/core`.

- [#3874](https://github.com/dotansimha/graphql-yoga/pull/3874)
  [`9311842`](https://github.com/dotansimha/graphql-yoga/commit/9311842f82e098404c31921244a74695cd1f2392)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Gives access to the request in the
  `operation` instrument payload, since the request is not in the context yet.

## 5.13.1

### Patch Changes

- [#3865](https://github.com/dotansimha/graphql-yoga/pull/3865)
  [`dee7995`](https://github.com/dotansimha/graphql-yoga/commit/dee79952919d001bdd4f5b3d802be1bc62051565)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@envelop/core@^5.2.3` ↗︎](https://www.npmjs.com/package/@envelop/core/v/5.2.3) (from
    `^5.2.1`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/server@^0.10.1` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.10.1)
    (from `^0.10.0`, in `dependencies`)
  - Added dependency
    [`@envelop/instrumentation@^1.0.0` ↗︎](https://www.npmjs.com/package/@envelop/instrumentation/v/1.0.0)
    (to `dependencies`)
  - Removed dependency
    [`@envelop/instruments@^1.0.0` ↗︎](https://www.npmjs.com/package/@envelop/instruments/v/1.0.0)
    (from `dependencies`)

## 5.13.0

### Minor Changes

- [#3793](https://github.com/dotansimha/graphql-yoga/pull/3793)
  [`63b78d5`](https://github.com/dotansimha/graphql-yoga/commit/63b78d5a7f6f7fd1d5939e92ede2574fda9d08dd)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Add new Instrumentation API

  Introduction of a new API allowing to instrument the graphql pipeline.

  This new API differs from already existing Hooks by not having access to input/output of phases.
  The goal of `Instrumentation` is to run allow running code before, after or around the **whole
  process of a phase**, including plugins hooks executions.

  The main use case of this new API is observability (monitoring, tracing, etc...).

  ### Basic usage

  ```ts
  import { createYoga } from 'graphql-yoga'
  import Sentry from '@sentry/node'
  import schema from './schema'

  const server = createYoga({
    schema,
    plugins: [
      {
        instrumentation: {
          request: ({ request }, wrapped) =>
            Sentry.startSpan({ name: 'Graphql Operation' }, async () => {
              try {
                await wrapped()
              } catch (err) {
                Sentry.captureException(err)
              }
            })
        }
      }
    ]
  })
  ```

  ### Multiple instrumentation plugins

  It is possible to have multiple instrumentation plugins (Prometheus and Sentry for example), they
  will be automatically composed by envelop in the same order than the plugin array (first is
  outermost, last is inner most).

  ```ts
  import { createYoga } from 'graphql-yoga'
  import schema from './schema'

  const server = createYoga({
    schema,
    plugins: [useSentry(), useOpentelemetry()]
  })
  ```

  ### Custom instrumentation ordering

  If the default composition ordering doesn't suite your need, you can manually compose
  instrumentation. This allows to have a different execution order of hooks and instrumentation.

  ```ts
  import { composeInstrumentation, createYoga } from 'graphql-yoga'
  import schema from './schema'

  const { instrumentation: sentryInstrumentation, ...sentryPlugin } = useSentry()
  const { instrumentation: otelInstrumentation, ...otelPlugin } = useOpentelemetry()
  const instrumentation = composeInstrumentation([otelInstrumentation, sentryInstrumentation])

  const server = createYoga({
    schema,
    plugins: [{ instrumentation }, useSentry(), useOpentelemetry()]
  })
  ```

### Patch Changes

- [#3793](https://github.com/dotansimha/graphql-yoga/pull/3793)
  [`63b78d5`](https://github.com/dotansimha/graphql-yoga/commit/63b78d5a7f6f7fd1d5939e92ede2574fda9d08dd)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:
  - Updated dependency
    [`@envelop/core@^5.2.1` ↗︎](https://www.npmjs.com/package/@envelop/core/v/5.2.1) (from
    `^5.0.2`, in `dependencies`)
  - Added dependency
    [`@envelop/instrumentation@^1.0.0` ↗︎](https://www.npmjs.com/package/@envelop/instrumentation/v/1.0.0)
    (to `dependencies`)
  - Added dependency
    [`@whatwg-node/promise-helpers@^1.2.4` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.2.4)
    (to `dependencies`)

- [#3855](https://github.com/dotansimha/graphql-yoga/pull/3855)
  [`6ed67e8`](https://github.com/dotansimha/graphql-yoga/commit/6ed67e8cd7e5fe6f982096a3056d3336f4a29752)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/server@^0.10.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.10.0)
    (from `^0.9.71`, in `dependencies`)

## 5.12.2

### Patch Changes

- [#3837](https://github.com/dotansimha/graphql-yoga/pull/3837)
  [`a6b3de9`](https://github.com/dotansimha/graphql-yoga/commit/a6b3de917ca50806d691330a58ee17e31c87cd2c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/server@^0.9.71` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.9.71)
    (from `^0.9.69`, in `dependencies`)

## 5.12.1

### Patch Changes

- [#3808](https://github.com/dotansimha/graphql-yoga/pull/3808)
  [`fbf328c`](https://github.com/dotansimha/graphql-yoga/commit/fbf328c2af38f4d449221bf262561fd76c64db55)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.10.5` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.10.5)
    (from `^0.10.1`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/server@^0.9.69` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.9.69)
    (from `^0.9.64`, in `dependencies`)

## 5.12.0

### Minor Changes

- [#3672](https://github.com/dotansimha/graphql-yoga/pull/3672)
  [`5150146`](https://github.com/dotansimha/graphql-yoga/commit/5150146a2d0b8f444a3527950d7163126a0fe24b)
  Thanks [@ardatan](https://github.com/ardatan)! - `extensions.code` usage for specific errors

### Patch Changes

- [#3764](https://github.com/dotansimha/graphql-yoga/pull/3764)
  [`96498ee`](https://github.com/dotansimha/graphql-yoga/commit/96498ee25fd310d781ce006b1fe7064c66e64fc3)
  Thanks [@slagiewka](https://github.com/slagiewka)! - Pass through `disposeOnProcessTerminate` to
  `createServerAdapter`

- [#3672](https://github.com/dotansimha/graphql-yoga/pull/3672)
  [`5150146`](https://github.com/dotansimha/graphql-yoga/commit/5150146a2d0b8f444a3527950d7163126a0fe24b)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor@^1.4.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.4.0)
    (from `^1.3.7`, in `dependencies`)

## 5.11.0

### Minor Changes

- [#3727](https://github.com/dotansimha/graphql-yoga/pull/3727)
  [`5fd15b8`](https://github.com/dotansimha/graphql-yoga/commit/5fd15b851a0141839346ce918207a607c00ac205)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Allow to configure the endpoint used by
  GraphiQL to send requests.

- [#3736](https://github.com/dotansimha/graphql-yoga/pull/3736)
  [`d13b8a4`](https://github.com/dotansimha/graphql-yoga/commit/d13b8a4a25f665e8484d64214b566e207de73514)
  Thanks [@ardatan](https://github.com/ardatan)! - Now it is possible to replace or wrap the logic
  how `GraphQLParams` handled;

  By default Yoga calls Envelop to handle the parameters, but now you can replace it with your own
  logic.

  Example: Wrap the GraphQL handling pipeline in an `AsyncLocalStorage`

  ```ts
  function myPlugin(): Plugin {
    const context = new AsyncLocalStorage();
    return {
      onParams({ paramsHandler, setParamsHandler }) {
        const store = { foo: 'bar' }
        setParamsHandler(payload => context.run(store, paramsHandler, payload))
     }
  }
  ```

## 5.10.11

### Patch Changes

- [#3712](https://github.com/dotansimha/graphql-yoga/pull/3712)
  [`1c055f5`](https://github.com/dotansimha/graphql-yoga/commit/1c055f597b59a2c6c6ab8ae10b8e9b771c91c2c1)
  Thanks [@ardatan](https://github.com/ardatan)! - Show deprecated input fields, arguments and all
  other input values in GraphiQL

## 5.10.10

### Patch Changes

- Updated dependencies
  [[`d4cbae1`](https://github.com/dotansimha/graphql-yoga/commit/d4cbae12348a39a2f64d7048dc582ebbaac93a5b),
  [`d4cbae1`](https://github.com/dotansimha/graphql-yoga/commit/d4cbae12348a39a2f64d7048dc582ebbaac93a5b)]:
  - @graphql-yoga/logger@2.0.1
  - @graphql-yoga/subscription@5.0.3

## 5.10.9

### Patch Changes

- [#3620](https://github.com/dotansimha/graphql-yoga/pull/3620)
  [`d24c5d5`](https://github.com/dotansimha/graphql-yoga/commit/d24c5d58e05b6f3b59b7745a55ba9c8dc6fb3aa3)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Bump dset dependency handling the
  CVE-2024-21529

  https://security.snyk.io/vuln/SNYK-JS-DSET-7116691

- [#3620](https://github.com/dotansimha/graphql-yoga/pull/3620)
  [`d24c5d5`](https://github.com/dotansimha/graphql-yoga/commit/d24c5d58e05b6f3b59b7745a55ba9c8dc6fb3aa3)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency [`dset@^3.1.4` ↗︎](https://www.npmjs.com/package/dset/v/3.1.4) (from
    `^3.1.1`, in `dependencies`)

## 5.10.8

### Patch Changes

- [#3588](https://github.com/dotansimha/graphql-yoga/pull/3588)
  [`ed344ea`](https://github.com/dotansimha/graphql-yoga/commit/ed344ea7fed85163eba0c636b5b7f64c482ce150)
  Thanks [@ardatan](https://github.com/ardatan)! - Mark `createLRUCache` utility as deprecated, and
  export it as `_createLRUCache` marking it as an internal utility

## 5.10.7

### Patch Changes

- [#3547](https://github.com/dotansimha/graphql-yoga/pull/3547)
  [`8fee214`](https://github.com/dotansimha/graphql-yoga/commit/8fee214eac4be3e9e18935502d32de69f0a1484e)
  Thanks [@Urigo](https://github.com/Urigo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor@^1.3.7` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.3.7)
    (from `^1.3.5`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^10.0.11` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.11)
    (from `^10.0.10`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.6.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.2)
    (from `^10.6.1`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/server@^0.9.63` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.9.63)
    (from `^0.9.60`, in `dependencies`)

- [#3567](https://github.com/dotansimha/graphql-yoga/pull/3567)
  [`1df4912`](https://github.com/dotansimha/graphql-yoga/commit/1df4912693fad5efaf2fe99bf0433c9abc829004)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/server@^0.9.64` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.9.64)
    (from `^0.9.63`, in `dependencies`)

## 5.10.6

### Patch Changes

- [#3551](https://github.com/dotansimha/graphql-yoga/pull/3551)
  [`121ccba`](https://github.com/dotansimha/graphql-yoga/commit/121ccbafcafb7e90d4ec6c210b62a439a040d41a)
  Thanks [@bridges-wood](https://github.com/bridges-wood)! - Fix stylesheet reference in graphiql

## 5.10.5

### Patch Changes

- [#3546](https://github.com/dotansimha/graphql-yoga/pull/3546)
  [`eca7cd1`](https://github.com/dotansimha/graphql-yoga/commit/eca7cd1163c58a5505ea371f745cb196f8bb20df)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Add documentation for Plugin hooks

- [#3549](https://github.com/dotansimha/graphql-yoga/pull/3549)
  [`05fe345`](https://github.com/dotansimha/graphql-yoga/commit/05fe34588fbeb28de847db9d7d58c5a6ae90e36b)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor@^1.3.7` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.3.7)
    (from `^1.3.5`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^10.0.11` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.11)
    (from `^10.0.10`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.6.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.2)
    (from `^10.6.1`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/server@^0.9.63` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.9.63)
    (from `^0.9.60`, in `dependencies`)
- Updated dependencies []:
  - @graphql-yoga/subscription@5.0.2

## 5.10.4

### Patch Changes

- [#3520](https://github.com/dotansimha/graphql-yoga/pull/3520)
  [`944ecd5`](https://github.com/dotansimha/graphql-yoga/commit/944ecd55abb1b77e88950eb3396919939915feb7)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@envelop/core@^5.0.2` ↗︎](https://www.npmjs.com/package/@envelop/core/v/5.0.2) (from
    `^5.0.1`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/executor@^1.3.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.3.5)
    (from `^1.3.3`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^10.0.10` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.10)
    (from `^10.0.4`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.6.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.6.1)
    (from `^10.3.2`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/server@^0.9.60` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.9.60)
    (from `^0.9.55`, in `dependencies`)
  - Updated dependency [`tslib@^2.8.1` ↗︎](https://www.npmjs.com/package/tslib/v/2.8.1) (from
    `^2.5.2`, in `dependencies`)

## 5.10.3

### Patch Changes

- [#3501](https://github.com/dotansimha/graphql-yoga/pull/3501)
  [`c93366d`](https://github.com/dotansimha/graphql-yoga/commit/c93366df8b4a2edd209d1eb94d989eaba3b7031b)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor@^1.3.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.3.3)
    (from `^1.3.0`, in `dependencies`)

- [#3501](https://github.com/dotansimha/graphql-yoga/pull/3501)
  [`c93366d`](https://github.com/dotansimha/graphql-yoga/commit/c93366df8b4a2edd209d1eb94d989eaba3b7031b)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Update transport executors containing
  improvements and fixes

## 5.10.2

### Patch Changes

- [#3491](https://github.com/dotansimha/graphql-yoga/pull/3491)
  [`7a413bc`](https://github.com/dotansimha/graphql-yoga/commit/7a413bc4fac839fbdc4fbb3cd5241c7828b2f6da)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/server@^0.9.55` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.9.55)
    (from `^0.9.54`, in `dependencies`)

- [#3491](https://github.com/dotansimha/graphql-yoga/pull/3491)
  [`7a413bc`](https://github.com/dotansimha/graphql-yoga/commit/7a413bc4fac839fbdc4fbb3cd5241c7828b2f6da)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix issue where context values being shared between
  batched requests.

  A bug within `@whatwg-node/server` caused properties assigned to a batched requests context to be
  propagated to all other batched requests contexts. It is resolved by updating the dependency of
  `@whatwg-node/server` to `0.9.55`.

## 5.10.1

### Patch Changes

- [#3479](https://github.com/dotansimha/graphql-yoga/pull/3479)
  [`20cd9b6`](https://github.com/dotansimha/graphql-yoga/commit/20cd9b6cd58b507580e3d39621eb3dbc2ca4e781)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.10.1` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.10.1)
    (from `^0.9.22`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/server@^0.9.54` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.9.54)
    (from `^0.9.50`, in `dependencies`)

## 5.10.0

### Minor Changes

- [#3462](https://github.com/dotansimha/graphql-yoga/pull/3462)
  [`f81501c`](https://github.com/dotansimha/graphql-yoga/commit/f81501c70213330323a1d6ee9d45b3206af3675f)
  Thanks [@maeldur](https://github.com/maeldur)! - Correctly handle HTTP GET requests with `?`
  characters in the query search string.

## 5.9.0

### Minor Changes

- [#3464](https://github.com/dotansimha/graphql-yoga/pull/3464)
  [`87ee333`](https://github.com/dotansimha/graphql-yoga/commit/87ee333724c0c6e0b9f72aa50e38a0a8a080593f)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Inject initial context into `onParams` hook.

### Patch Changes

- [#3457](https://github.com/dotansimha/graphql-yoga/pull/3457)
  [`2523d9f`](https://github.com/dotansimha/graphql-yoga/commit/2523d9fa954b82e11412918aab2ae6fe7e7611d6)
  Thanks [@kroupacz](https://github.com/kroupacz)! - ### Fixed
  - propagation of Yoga `version`

## 5.8.0

### Minor Changes

- [`18fe916`](https://github.com/dotansimha/graphql-yoga/commit/18fe916853fc6192b8b2a607f91b67f3a7cae7bc)
  Thanks [@kroupacz](https://github.com/kroupacz)! - Add `version` property to get version of Yoga

### Patch Changes

- [#3445](https://github.com/dotansimha/graphql-yoga/pull/3445)
  [`6bb19ed`](https://github.com/dotansimha/graphql-yoga/commit/6bb19edf5b103d6d9b6088e2e22cfa71a85f26f7)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.9.22` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.9.22)
    (from `^0.9.18`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/server@^0.9.50` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.9.50)
    (from `^0.9.44`, in `dependencies`)

## 5.7.0

### Minor Changes

- [#3331](https://github.com/dotansimha/graphql-yoga/pull/3331)
  [`5dae4ab`](https://github.com/dotansimha/graphql-yoga/commit/5dae4abeb6a4aa82f396a19d31d0155fe10bc752)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Expose server context in
  `onResultProcessHook`. In particular, this gives access to the `waitUntil` method to cleanly
  handle hanging promises.

- [#3331](https://github.com/dotansimha/graphql-yoga/pull/3331)
  [`5dae4ab`](https://github.com/dotansimha/graphql-yoga/commit/5dae4abeb6a4aa82f396a19d31d0155fe10bc752)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - New hook: onExecutionResult which is
  triggered when an execution is done on the pipeline. If it is a batched operation, this is called
  per each operation in the batch

- [#3331](https://github.com/dotansimha/graphql-yoga/pull/3331)
  [`5dae4ab`](https://github.com/dotansimha/graphql-yoga/commit/5dae4abeb6a4aa82f396a19d31d0155fe10bc752)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Expose the already existing `waitUntil`
  method from the server context.

### Patch Changes

- [#3331](https://github.com/dotansimha/graphql-yoga/pull/3331)
  [`5dae4ab`](https://github.com/dotansimha/graphql-yoga/commit/5dae4abeb6a4aa82f396a19d31d0155fe10bc752)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/server@^0.9.44` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.9.44)
    (from `^0.9.41`, in `dependencies`)

## 5.6.3

### Patch Changes

- [#3400](https://github.com/dotansimha/graphql-yoga/pull/3400)
  [`0866c1b`](https://github.com/dotansimha/graphql-yoga/commit/0866c1be8868eb891a0a62e36c9270d87f205330)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Restores compatibility with
  [RFC1341: The Multipart Content-Type](https://www.w3.org/Protocols/rfc1341/7_2_Multipart.html) by
  including preceding `\r\n` for initial boundary delimiter when using the multipart response
  protocol.

  This makes Yoga compatible with libraries that strictly follow the response protocol, such as
  [fetch-multipart-graphql](https://github.com/relay-tools/fetch-multipart-graphql).

## 5.6.2

### Patch Changes

- [#3357](https://github.com/dotansimha/graphql-yoga/pull/3357)
  [`b7bf47b`](https://github.com/dotansimha/graphql-yoga/commit/b7bf47bf72f3c04de6de7866aa68cdd5eac90566)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/server@^0.9.41` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.9.41)
    (from `^0.9.40`, in `dependencies`)

- [#3384](https://github.com/dotansimha/graphql-yoga/pull/3384)
  [`81a736b`](https://github.com/dotansimha/graphql-yoga/commit/81a736be76cb91049fc9ef54f536ce79e0c90e16)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@envelop/core@^5.0.1` ↗︎](https://www.npmjs.com/package/@envelop/core/v/5.0.1) (from
    `^5.0.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/executor@^1.3.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.3.0)
    (from `^1.2.5`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^10.0.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/10.0.4)
    (from `^10.0.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.3.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.3.2)
    (from `^10.1.0`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/fetch@^0.9.18` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.9.18)
    (from `^0.9.17`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/server@^0.9.40` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.9.40)
    (from `^0.9.36`, in `dependencies`)

## 5.6.1

### Patch Changes

- [#3338](https://github.com/dotansimha/graphql-yoga/pull/3338)
  [`4252e3d`](https://github.com/dotansimha/graphql-yoga/commit/4252e3d0e664e3c247c709cd47a0645c68dc527a)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/server@^0.9.36` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.9.36)
    (from `^0.9.33`, in `dependencies`)

## 5.6.0

### Minor Changes

- [#3333](https://github.com/dotansimha/graphql-yoga/pull/3333)
  [`9f3f945`](https://github.com/dotansimha/graphql-yoga/commit/9f3f94522a9e8a7a19657efdd445a360ec244d55)
  Thanks [@ardatan](https://github.com/ardatan)! - By default, Yoga does not allow extra parameters
  in the request body other than `query`, `operationName`, `extensions`, and `variables`, then
  throws 400 HTTP Error. This change adds a new option called `extraParamNames` to allow extra
  parameters in the request body.

  ```ts
  import { createYoga } from 'graphql-yoga'

  const yoga = createYoga({
    /* other options */
    extraParamNames: ['extraParam1', 'extraParam2']
  })

  const res = await yoga.fetch('/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: 'query { __typename }',
      extraParam1: 'value1',
      extraParam2: 'value2'
    })
  })

  console.assert(res.status === 200)
  ```

## 5.5.0

### Minor Changes

- [#3332](https://github.com/dotansimha/graphql-yoga/pull/3332)
  [`0208024`](https://github.com/dotansimha/graphql-yoga/commit/02080249adb8b120d44a89126571145dc3be8e4e)
  Thanks [@ardatan](https://github.com/ardatan)! - Customize the landing page by passing a custom
  renderer that returns `Response` to the `landingPage` option

  ```ts
  import { createYoga } from 'graphql-yoga'

  const yoga = createYoga({
    landingPage: ({ url, fetchAPI }) => {
      return new fetchAPI.Response(
        /* HTML */ `
          <!doctype html>
          <html>
            <head>
              <title>404 Not Found</title>
            </head>
            <body>
              <h1>404 Not Found</h1>
              <p>Sorry, the page (${url.pathname}) you are looking for could not be found.</p>
            </body>
          </html>
        `,
        {
          status: 404,
          headers: {
            'Content-Type': 'text/html'
          }
        }
      )
    }
  })
  ```

## 5.4.0

### Minor Changes

- [#3314](https://github.com/dotansimha/graphql-yoga/pull/3314)
  [`d5dfe99`](https://github.com/dotansimha/graphql-yoga/commit/d5dfe99af030a5afac26968ba8dd81dee6df0dc2)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Allow for full customization of the
  GraphiQL page.

  Props from the `YogaGraphiQL` are now forwarded to the underlying GraphiQL components.

  The `graphiql` option field type of the Yoga server as also been updated to document which options
  are configurable from the server side. Only serializable options are available.

- [#3255](https://github.com/dotansimha/graphql-yoga/pull/3255)
  [`7335a82`](https://github.com/dotansimha/graphql-yoga/commit/7335a82a4b0696c464311a5027a43b16c7f68156)
  Thanks [@nissy-dev](https://github.com/nissy-dev)! - support shouldPersistHeaders option in
  GraphiQL plugin

### Patch Changes

- [#3325](https://github.com/dotansimha/graphql-yoga/pull/3325)
  [`4cd43b9`](https://github.com/dotansimha/graphql-yoga/commit/4cd43b9ff56ad9358dc897f4bb87a6a94f953047)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Fix TypeScript compatibility with `type: "module"`.

- [#3300](https://github.com/dotansimha/graphql-yoga/pull/3300)
  [`fdd902c`](https://github.com/dotansimha/graphql-yoga/commit/fdd902c2a713c6bd951e1b1e6570164b6ff2d546)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/logger@workspace:^` ↗︎](https://www.npmjs.com/package/@graphql-yoga/logger/v/workspace:^)
    (from `^2.0.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-yoga/subscription@workspace:^` ↗︎](https://www.npmjs.com/package/@graphql-yoga/subscription/v/workspace:^)
    (from `^5.0.0`, in `dependencies`)

- [#3270](https://github.com/dotansimha/graphql-yoga/pull/3270)
  [`f9aa1cd`](https://github.com/dotansimha/graphql-yoga/commit/f9aa1cdc968816a9f83f054dbd24799c85f71a2c)
  Thanks [@andrew0](https://github.com/andrew0)! - Retain server context prototype for batched
  requests

- Updated dependencies
  [[`fdd902c`](https://github.com/dotansimha/graphql-yoga/commit/fdd902c2a713c6bd951e1b1e6570164b6ff2d546)]:
  - @graphql-yoga/subscription@5.0.1

## 5.3.1

### Patch Changes

- [#3237](https://github.com/dotansimha/graphql-yoga/pull/3237)
  [`3324bbab`](https://github.com/dotansimha/graphql-yoga/commit/3324bbabf1f32e8b4ee95ea8700acfb06f87f8ca)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/server@^0.9.33` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.9.33)
    (from `^0.9.32`, in `dependencies`)

- [#3237](https://github.com/dotansimha/graphql-yoga/pull/3237)
  [`3324bbab`](https://github.com/dotansimha/graphql-yoga/commit/3324bbabf1f32e8b4ee95ea8700acfb06f87f8ca)
  Thanks [@ardatan](https://github.com/ardatan)! - In such environments like CloudFlare Workers, the
  `request` object in the context always has the initial request object, so it was impossible to
  access the actual `Request` object from the execution context. Now Yoga ensures that the `request`
  in the context is the same with the actual `Request`.

## 5.3.0

### Minor Changes

- [#3197](https://github.com/dotansimha/graphql-yoga/pull/3197)
  [`f775b341`](https://github.com/dotansimha/graphql-yoga/commit/f775b341729145cee68747ab966aa9f4a9ea0389)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Experimental support for aborting GraphQL execution
  when the HTTP request is canceled.

  The execution of subsequent GraphQL resolvers is now aborted if the incoming HTTP request is
  canceled from the client side. This reduces the load of your API in case incoming requests with
  deep GraphQL operation selection sets are canceled.

  ```ts
  import { createYoga, useExecutionCancellation } from 'graphql-yoga'

  const yoga = createYoga({
    plugins: [useExecutionCancellation()]
  })
  ```

  [Learn more in our docs](https://graphql-yoga.com/docs/features/execution-cancellation)

  **Action Required** In order to benefit from this new feature, you need to update your integration
  setup for Fastify, Koa and Hapi.

  ```diff
  - const response = await yoga.handleNodeRequest(req, { ... })
  + const response = await yoga.handleNodeRequestAndResponse(req, res, { ... })
  ```

  Please refer to the corresponding integration guides for examples.
  - [Fastify](https://graphql-yoga.com/docs/integrations/integration-with-fastify#example)
  - [Koa](https://graphql-yoga.com/docs/integrations/integration-with-koa#example)
  - [Hapi](https://graphql-yoga.com/docs/integrations/integration-with-hapi#example)

### Patch Changes

- [#3197](https://github.com/dotansimha/graphql-yoga/pull/3197)
  [`f775b341`](https://github.com/dotansimha/graphql-yoga/commit/f775b341729145cee68747ab966aa9f4a9ea0389)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor@^1.2.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.2.5)
    (from `^1.2.2`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/fetch@^0.9.17` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.9.17)
    (from `^0.9.7`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/server@^0.9.32` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.9.32)
    (from `^0.9.1`, in `dependencies`)

- [#3214](https://github.com/dotansimha/graphql-yoga/pull/3214)
  [`f89a1aa2`](https://github.com/dotansimha/graphql-yoga/commit/f89a1aa2a0bd6efc145627a674370b1b22e231fa)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Always include empty data payload for final
  `complete` event of SSE stream responses to ensure
  [`EventSource`](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) compatibility. See
  the
  [GraphQL over SSE protocol](https://github.com/enisdenjo/graphql-sse/blob/master/PROTOCOL.md#complete-event)
  for more information.

## 5.2.0

### Minor Changes

- [#3196](https://github.com/dotansimha/graphql-yoga/pull/3196)
  [`71db7548`](https://github.com/dotansimha/graphql-yoga/commit/71db754876612bb9a1df496f478eaf1b94f342cf)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Allow setting async iterable within `onParams` hook
  `setResult` function

### Patch Changes

- [#3196](https://github.com/dotansimha/graphql-yoga/pull/3196)
  [`71db7548`](https://github.com/dotansimha/graphql-yoga/commit/71db754876612bb9a1df496f478eaf1b94f342cf)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor@^1.2.2` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/1.2.2)
    (from `^1.0.0`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/utils@^10.1.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/10.1.0)
    (from `^10.0.0`, in `dependencies`)

## 5.1.1

### Patch Changes

- [`3ef877a7`](https://github.com/dotansimha/graphql-yoga/commit/3ef877a75c5b19e082121ece08981183422618f0)
  Thanks [@ardatan](https://github.com/ardatan)! - Support errors with extensions set undefined

## 5.1.0

### Minor Changes

- [#2992](https://github.com/dotansimha/graphql-yoga/pull/2992)
  [`b1f0e3a2`](https://github.com/dotansimha/graphql-yoga/commit/b1f0e3a2986956c6791a251df908e3f8b50ec966)
  Thanks [@magrinj](https://github.com/magrinj)! - Export YogaSchemaDefinition and mergeSchemas

## 5.0.2

### Patch Changes

- [#3133](https://github.com/dotansimha/graphql-yoga/pull/3133)
  [`77d107fe`](https://github.com/dotansimha/graphql-yoga/commit/77d107fe1a01044f4ba017ca960bb1bd58407ed7)
  Thanks [@ardatan](https://github.com/ardatan)! - Update HTTP Executor and add `method` and
  `useGETForQueries` to GraphiQL options

## 5.0.1

### Patch Changes

- [`3fea19f2`](https://github.com/dotansimha/graphql-yoga/commit/3fea19f2a01c85b7d837163d763fae107e8f5a53)
  Thanks [@antonio-iodice](https://github.com/antonio-iodice)! - Do not return 404 when using query
  params or trailing slashes

## 5.0.0

### Major Changes

- [#3063](https://github.com/dotansimha/graphql-yoga/pull/3063)
  [`01430e03`](https://github.com/dotansimha/graphql-yoga/commit/01430e03288f072a9cb09b0b898316b1f5b58a5f)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - **Breaking Change:** Drop support of
  Node.js 16

- [#3070](https://github.com/dotansimha/graphql-yoga/pull/3070)
  [`5b615478`](https://github.com/dotansimha/graphql-yoga/commit/5b6154783957874281bdf180575cdf57fadb75bf)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@envelop/core@^5.0.0` ↗︎](https://www.npmjs.com/package/@envelop/core/v/5.0.0) (from
    `^4.0.0`, in `dependencies`)

### Patch Changes

- [#3051](https://github.com/dotansimha/graphql-yoga/pull/3051)
  [`350bb851`](https://github.com/dotansimha/graphql-yoga/commit/350bb85195c01cc5b5721f7a90f6cfbe1af36aff)
  Thanks [@ardatan](https://github.com/ardatan)! - Use the same context object in the entire
  pipeline

- Updated dependencies
  [[`01430e03`](https://github.com/dotansimha/graphql-yoga/commit/01430e03288f072a9cb09b0b898316b1f5b58a5f)]:
  - @graphql-yoga/subscription@5.0.0
  - @graphql-yoga/logger@2.0.0

## 4.0.5

### Patch Changes

- [#3004](https://github.com/dotansimha/graphql-yoga/pull/3004)
  [`bf602edf`](https://github.com/dotansimha/graphql-yoga/commit/bf602edf790590de1db26b5f3fc39f895104055c)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Fix dynamic schema function type and
  documentation

## 4.0.4

### Patch Changes

- [#2958](https://github.com/dotansimha/graphql-yoga/pull/2958)
  [`5f182006`](https://github.com/dotansimha/graphql-yoga/commit/5f1820066e8a340ad214b55232fcf439793f91bf)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Start SSE stream with a ping

## 4.0.3

### Patch Changes

- [`5efb8250`](https://github.com/dotansimha/graphql-yoga/commit/5efb82502da245f2fe730cc18f4af283d31a835c)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.9.7` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.9.7)
    (from `^0.9.0`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/server@^0.9.1` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.9.1)
    (from `^0.8.1`, in `dependencies`)

## 4.0.2

### Patch Changes

- [#2872](https://github.com/dotansimha/graphql-yoga/pull/2872)
  [`ce6d2465`](https://github.com/dotansimha/graphql-yoga/commit/ce6d24655eb3c59d9a506baf09dbe185da9a8b2b)
  Thanks [@nescalante](https://github.com/nescalante)! - Avoid overriding http status on extensions
  when using a plugin that modifies error prop

## 4.0.1

### Patch Changes

- [#2866](https://github.com/dotansimha/graphql-yoga/pull/2866)
  [`bb739b05`](https://github.com/dotansimha/graphql-yoga/commit/bb739b0555e67a9ee40da9343cec323463a0f568)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`lru-cache@^10.0.0` ↗︎](https://www.npmjs.com/package/lru-cache/v/10.0.0)
    (from `^9.0.0`, in `dependencies`)

- [#2869](https://github.com/dotansimha/graphql-yoga/pull/2869)
  [`8f7d7abc`](https://github.com/dotansimha/graphql-yoga/commit/8f7d7abc7f71de33e428ea74f2903290f2b4ed70)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Properly serialise GraphQLError on graphql-js
  v15

## 4.0.0

### Major Changes

- [#2767](https://github.com/dotansimha/graphql-yoga/pull/2767)
  [`4228c1d5`](https://github.com/dotansimha/graphql-yoga/commit/4228c1d54ed785fac1fb9669d861ed46659872ca)
  Thanks [@renovate](https://github.com/apps/renovate)! - Drop support for Node.js 14. Require
  Node.js `>=16`.

- [#2776](https://github.com/dotansimha/graphql-yoga/pull/2776)
  [`34ecb4bb`](https://github.com/dotansimha/graphql-yoga/commit/34ecb4bbad3823f1bfde8aa7e1e92139481f9daf)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Drop unused graphiql options
  `defaultVariableEditorOpen` and `headerEditorEnabled`

- [#2810](https://github.com/dotansimha/graphql-yoga/pull/2810)
  [`ec318fe6`](https://github.com/dotansimha/graphql-yoga/commit/ec318fe6d3945190abbe8b643223268ff9a5e0e9)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Remove support for executing Subscription
  operations over the incremental delivery response protocol (`multipart/mixed`)

- [#2775](https://github.com/dotansimha/graphql-yoga/pull/2775)
  [`dd699c4b`](https://github.com/dotansimha/graphql-yoga/commit/dd699c4bcef24b373ee49237c187df3f093e1dfc)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Subscriptions use GraphQL over SSE "distinct
  connections mode"

- [#2767](https://github.com/dotansimha/graphql-yoga/pull/2767)
  [`4228c1d5`](https://github.com/dotansimha/graphql-yoga/commit/4228c1d54ed785fac1fb9669d861ed46659872ca)
  Thanks [@renovate](https://github.com/apps/renovate)! - Events without an event payload will now
  always have `null` as the event payload instead of `undefined`.

- [#2777](https://github.com/dotansimha/graphql-yoga/pull/2777)
  [`0522c740`](https://github.com/dotansimha/graphql-yoga/commit/0522c7408c69a1b72af5c220411cf19d7fa859e9)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Parse and validation cache are now under a
  single option `parserAndValidationCache`

### Patch Changes

- [#2720](https://github.com/dotansimha/graphql-yoga/pull/2720)
  [`cc370691`](https://github.com/dotansimha/graphql-yoga/commit/cc370691cc525fe5b15cb846c60621d99d313310)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Skip validation caching when there is no `schema`
  specified. This previously caused a cryptic error message when reaching execution/validation
  without a schema. Now the missing schema error will actually originate from within the `validate`
  function instead.

- [#2726](https://github.com/dotansimha/graphql-yoga/pull/2726)
  [`b309ca0d`](https://github.com/dotansimha/graphql-yoga/commit/b309ca0db1c45264878c3cec0137c3fdbd22fc97)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect `toJSON` in the thrown errors.

- Updated dependencies
  [[`4228c1d5`](https://github.com/dotansimha/graphql-yoga/commit/4228c1d54ed785fac1fb9669d861ed46659872ca),
  [`4228c1d5`](https://github.com/dotansimha/graphql-yoga/commit/4228c1d54ed785fac1fb9669d861ed46659872ca)]:
  - @graphql-yoga/subscription@4.0.0
  - @graphql-yoga/logger@1.0.0

## 3.9.1

### Patch Changes

- [#2682](https://github.com/dotansimha/graphql-yoga/pull/2682)
  [`e1a60e21`](https://github.com/dotansimha/graphql-yoga/commit/e1a60e21f10813aa6d0f4673e4eb13979720c2c8)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor@^0.0.17` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/0.0.17)
    (from `^0.0.16`, in `dependencies`)

- [#2686](https://github.com/dotansimha/graphql-yoga/pull/2686)
  [`c50ea51c`](https://github.com/dotansimha/graphql-yoga/commit/c50ea51c992a6a480799655225727081585f0010)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor@^0.0.18` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/0.0.18)
    (from `^0.0.17`, in `dependencies`)
  - Updated dependency
    [`@graphql-tools/schema@^9.0.18` ↗︎](https://www.npmjs.com/package/@graphql-tools/schema/v/9.0.18)
    (from `^9.0.0`, in `dependencies`)

- [#2686](https://github.com/dotansimha/graphql-yoga/pull/2686)
  [`c50ea51c`](https://github.com/dotansimha/graphql-yoga/commit/c50ea51c992a6a480799655225727081585f0010)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Prevent errors thrown from subscription source
  crashing the Node.js process and instead log the error to the console, then terminate the client
  subscription.

## 3.9.0

### Minor Changes

- [#2675](https://github.com/dotansimha/graphql-yoga/pull/2675)
  [`aff69200`](https://github.com/dotansimha/graphql-yoga/commit/aff69200d512c530751c617ee685f9b3f82303f8)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Only well-formatted GraphQL-over-HTTP
  requests use 200 when accepting application/json

## 3.8.1

### Patch Changes

- [#2652](https://github.com/dotansimha/graphql-yoga/pull/2652)
  [`ebb65b14`](https://github.com/dotansimha/graphql-yoga/commit/ebb65b14b29bbb4c50c6bb242262444315e99a73)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor@^0.0.16` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/0.0.16)
    (from `^0.0.15`, in `dependencies`)

- [#2676](https://github.com/dotansimha/graphql-yoga/pull/2676)
  [`528941cb`](https://github.com/dotansimha/graphql-yoga/commit/528941cb4d1670833ee0307de0c715e6b9681d7a)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Prefer `content-type: multipart/mixed` over
  `content-type: text/event-stream` when the client sends
  `accept: text/event-stream, multipart/mixed`.

## 3.8.0

### Minor Changes

- [#2445](https://github.com/dotansimha/graphql-yoga/pull/2445)
  [`09d23a4b`](https://github.com/dotansimha/graphql-yoga/commit/09d23a4b3b22f520c41f3cebbe3b11ffbda39557)
  Thanks [@ardatan](https://github.com/ardatan)! - GraphQL SSE Distinct Connections mode support
  with `legacySse = false` flag

### Patch Changes

- [#2602](https://github.com/dotansimha/graphql-yoga/pull/2602)
  [`99b72696`](https://github.com/dotansimha/graphql-yoga/commit/99b726961b45b9c22d6383e2fe7212d21d324553)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - dependencies updates:
  - Updated dependency [`lru-cache@^7.14.1` ↗︎](https://www.npmjs.com/package/lru-cache/v/7.14.1)
    (from `^8.0.0`, in `dependencies`)

- [#2602](https://github.com/dotansimha/graphql-yoga/pull/2602)
  [`99b72696`](https://github.com/dotansimha/graphql-yoga/commit/99b726961b45b9c22d6383e2fe7212d21d324553)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - revert `lru-cache` version to `7.x.x`, as `8.x.x`
  broke Node.js 14 support.

## 3.7.3

### Patch Changes

- [#2559](https://github.com/dotansimha/graphql-yoga/pull/2559)
  [`46e75917`](https://github.com/dotansimha/graphql-yoga/commit/46e75917f784abcb4ea9968bf3d73660df157b21)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`lru-cache@^8.0.0` ↗︎](https://www.npmjs.com/package/lru-cache/v/8.0.0)
    (from `^7.14.1`, in `dependencies`)

## 3.7.2

### Patch Changes

- [#2528](https://github.com/dotansimha/graphql-yoga/pull/2528)
  [`7ad50529`](https://github.com/dotansimha/graphql-yoga/commit/7ad505294ecccf21a0449b739c359396bc97121f)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/logger@^0.0.1` ↗︎](https://www.npmjs.com/package/@graphql-yoga/logger/v/0.0.1)
    (from `0.0.1`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/server@^0.7.3` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.7.3)
    (from `^0.7.1`, in `dependencies`)

## 3.7.1

### Patch Changes

- [#2481](https://github.com/dotansimha/graphql-yoga/pull/2481)
  [`9fdd94b5`](https://github.com/dotansimha/graphql-yoga/commit/9fdd94b5697b55693a2a7bd48a2da4c3ba8ac3f8)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/server@^0.7.1` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.7.1)
    (from `^0.6.7`, in `dependencies`)

- [#2496](https://github.com/dotansimha/graphql-yoga/pull/2496)
  [`47b1c4a4`](https://github.com/dotansimha/graphql-yoga/commit/47b1c4a4fa72043b02307822395c016bd523f949)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor@^0.0.15` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/0.0.15)
    (from `^0.0.14`, in `dependencies`)

- [#2527](https://github.com/dotansimha/graphql-yoga/pull/2527)
  [`02ac055c`](https://github.com/dotansimha/graphql-yoga/commit/02ac055cad3f7cb0fb08bb003a8a1971e4f48a23)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@graphql-yoga/logger@0.0.0` ↗︎](https://www.npmjs.com/package/@graphql-yoga/logger/v/0.0.0)
    (to `dependencies`)

- [#2527](https://github.com/dotansimha/graphql-yoga/pull/2527)
  [`02ac055c`](https://github.com/dotansimha/graphql-yoga/commit/02ac055cad3f7cb0fb08bb003a8a1971e4f48a23)
  Thanks [@ardatan](https://github.com/ardatan)! - Release logger seperately

- Updated dependencies
  [[`02ac055c`](https://github.com/dotansimha/graphql-yoga/commit/02ac055cad3f7cb0fb08bb003a8a1971e4f48a23)]:
  - @graphql-yoga/logger@0.0.1

## 3.7.0

### Minor Changes

- [#2459](https://github.com/dotansimha/graphql-yoga/pull/2459)
  [`9e743db5`](https://github.com/dotansimha/graphql-yoga/commit/9e743db5f43a8e6e5944667ddec349005dbb2cd9)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect `http` in the extensions just like error
  extensions

### Patch Changes

- [#2470](https://github.com/dotansimha/graphql-yoga/pull/2470)
  [`23d1b26c`](https://github.com/dotansimha/graphql-yoga/commit/23d1b26cde5d86e21deb74846348e077b4fdf620)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - dependencies updates:
  - Updated dependency
    [`@envelop/validation-cache@^5.1.2` ↗︎](https://www.npmjs.com/package/@envelop/validation-cache/v/5.1.2)
    (from `^5.0.5`, in `dependencies`)

- [#2470](https://github.com/dotansimha/graphql-yoga/pull/2470)
  [`23d1b26c`](https://github.com/dotansimha/graphql-yoga/commit/23d1b26cde5d86e21deb74846348e077b4fdf620)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - bump range of `@envelop/validation-cache` for
  fixing javascript runtime compatibility (usage of node-only global `require`).

## 3.6.1

### Patch Changes

- [`3c8c8434`](https://github.com/dotansimha/graphql-yoga/commit/3c8c843409fa1c06873d8599ebd7b02f6819dad4)
  Thanks [@ardatan](https://github.com/ardatan)! - Replace LRU caching with lazy URL construction,
  avoid unnecessary `parse` and `validate` invocation and CORS

## 3.6.0

### Minor Changes

- [#2393](https://github.com/dotansimha/graphql-yoga/pull/2393)
  [`790330be`](https://github.com/dotansimha/graphql-yoga/commit/790330beac3e6f2e85e128f9df9ba0bb1c53d5f5)
  Thanks [@ardatan](https://github.com/ardatan)! - Decrease request latency by improving the
  validation and parser cache algorithm.

### Patch Changes

- [#2388](https://github.com/dotansimha/graphql-yoga/pull/2388)
  [`6bc1410f`](https://github.com/dotansimha/graphql-yoga/commit/6bc1410f0d23dd88dfc708dad8dceecfaa5fab78)
  Thanks [@ardatan](https://github.com/ardatan)! - Improve URL parsing performance

- [#2375](https://github.com/dotansimha/graphql-yoga/pull/2375)
  [`ddb2607d`](https://github.com/dotansimha/graphql-yoga/commit/ddb2607d5495245b360e29e38b826609ff93f2ce)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor@0.0.13` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/0.0.13)
    (from `0.0.12`, in `dependencies`)

- [#2388](https://github.com/dotansimha/graphql-yoga/pull/2388)
  [`6bc1410f`](https://github.com/dotansimha/graphql-yoga/commit/6bc1410f0d23dd88dfc708dad8dceecfaa5fab78)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency [`lru-cache@^7.14.1` ↗︎](https://www.npmjs.com/package/lru-cache/v/7.14.1) (to
    `dependencies`)

- [#2392](https://github.com/dotansimha/graphql-yoga/pull/2392)
  [`1caac99b`](https://github.com/dotansimha/graphql-yoga/commit/1caac99b39a09594d54402665a852e2933f0b7da)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@0.6.8` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.6.8) (from
    `0.6.5`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/server@0.6.3` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.6.3)
    (from `0.5.11`, in `dependencies`)

- [#2393](https://github.com/dotansimha/graphql-yoga/pull/2393)
  [`790330be`](https://github.com/dotansimha/graphql-yoga/commit/790330beac3e6f2e85e128f9df9ba0bb1c53d5f5)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/utils@^9.2.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/9.2.1)
    (from `^9.0.1`, in `dependencies`)
  - Removed dependency
    [`@envelop/parser-cache@^5.0.4` ↗︎](https://www.npmjs.com/package/@envelop/parser-cache/v/5.0.4)
    (from `dependencies`)

- [#2394](https://github.com/dotansimha/graphql-yoga/pull/2394)
  [`7587d5c5`](https://github.com/dotansimha/graphql-yoga/commit/7587d5c575bffb746d611cbbce36d2ee5cbe4f69)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor@^0.0.14` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/0.0.14)
    (from `^0.0.13`, in `dependencies`)

- [#2405](https://github.com/dotansimha/graphql-yoga/pull/2405)
  [`cc0d3899`](https://github.com/dotansimha/graphql-yoga/commit/cc0d389912538f2dd290976a738f1b09f1d87b8d)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.7.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.7.0)
    (from `^0.6.9`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/server@^0.6.5` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.6.5)
    (from `^0.6.4`, in `dependencies`)

- [#2411](https://github.com/dotansimha/graphql-yoga/pull/2411)
  [`a747d249`](https://github.com/dotansimha/graphql-yoga/commit/a747d24976de5ed6bd05013ba451bffea05f4e8c)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.8.1` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.8.1)
    (from `^0.7.0`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/server@^0.6.7` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.6.7)
    (from `^0.6.5`, in `dependencies`)

- [#2417](https://github.com/dotansimha/graphql-yoga/pull/2417)
  [`2933fc89`](https://github.com/dotansimha/graphql-yoga/commit/2933fc895702a26d13a466035e0d613629f569ec)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.7.1` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.7.1)
    (from `^0.7.0`, in `dependencies`)

- [#2421](https://github.com/dotansimha/graphql-yoga/pull/2421)
  [`543e490b`](https://github.com/dotansimha/graphql-yoga/commit/543e490b12e4b86934133e8c6cd08450247451c1)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@^0.8.1` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.8.1)
    (from `^0.7.1`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/server@^0.6.7` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.6.7)
    (from `^0.6.5`, in `dependencies`)

## 3.5.1

### Patch Changes

- [#2137](https://github.com/dotansimha/graphql-yoga/pull/2137)
  [`3a8446df`](https://github.com/dotansimha/graphql-yoga/commit/3a8446dfb50c6d234e030cd1e4260c5de9daefc4)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Close multipart responses correctly

## 3.5.0

### Minor Changes

- [#2364](https://github.com/dotansimha/graphql-yoga/pull/2364)
  [`03597a5a`](https://github.com/dotansimha/graphql-yoga/commit/03597a5accfab9aa10380188e1fd0b7c0727a59c)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - export the yoga default format error function.

  ```ts
  import { createYoga, maskError } from 'graphql-yoga'

  const yoga = createYoga({
    maskedErrors: {
      maskError(error, message, isDev) {
        if (error?.extensions?.code === 'DOWNSTREAM_SERVICE_ERROR') {
          return error
        }

        return maskError(error, message, isDev)
      }
    }
  })
  ```

## 3.4.1

### Patch Changes

- [#2254](https://github.com/dotansimha/graphql-yoga/pull/2254)
  [`00843174`](https://github.com/dotansimha/graphql-yoga/commit/008431747787dd6c6b26f4cb44c7c6f3053f162e)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@0.6.5` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.6.5) (from
    `0.6.2`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/server@0.5.11` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.5.11)
    (from `0.5.8`, in `dependencies`)

- [#2254](https://github.com/dotansimha/graphql-yoga/pull/2254)
  [`00843174`](https://github.com/dotansimha/graphql-yoga/commit/008431747787dd6c6b26f4cb44c7c6f3053f162e)
  Thanks [@ardatan](https://github.com/ardatan)! - Use the new fetch implementation

## 3.4.0

### Patch Changes

- [#2331](https://github.com/dotansimha/graphql-yoga/pull/2331)
  [`76c1ecb9`](https://github.com/dotansimha/graphql-yoga/commit/76c1ecb985887ee45f0f934216b7a629e3c2db6d)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Properly serialise response extension arrays,
  nullish values and dates

- [#2276](https://github.com/dotansimha/graphql-yoga/pull/2276)
  [`8cd8b5a5`](https://github.com/dotansimha/graphql-yoga/commit/8cd8b5a5ab1dd28e2a2ddd7424c98c0493c535ad)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/server@0.5.5` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.5.5)
    (from `0.5.4`, in `dependencies`)

- [#2313](https://github.com/dotansimha/graphql-yoga/pull/2313)
  [`6e8bddba`](https://github.com/dotansimha/graphql-yoga/commit/6e8bddba7eb21b596cea0a2d4c313bb84a5c3aa1)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@0.6.2` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.6.2) (from
    `0.6.1`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/server@0.5.6` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.5.6)
    (from `0.5.5`, in `dependencies`)

- [#2316](https://github.com/dotansimha/graphql-yoga/pull/2316)
  [`6ee252db`](https://github.com/dotansimha/graphql-yoga/commit/6ee252dbed6f38840284bbe47c72c453ac8e648b)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor@0.0.12` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/0.0.12)
    (from `0.0.11`, in `dependencies`)

- [#2335](https://github.com/dotansimha/graphql-yoga/pull/2335)
  [`8f139e15`](https://github.com/dotansimha/graphql-yoga/commit/8f139e155b5cd59ca97912cccdc45b8b7d2909e6)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/server@0.5.7` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.5.7)
    (from `0.5.6`, in `dependencies`)

- [#2340](https://github.com/dotansimha/graphql-yoga/pull/2340)
  [`9beef914`](https://github.com/dotansimha/graphql-yoga/commit/9beef91485e076f19928e73fdc65aa2979f88eef)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/server@0.5.8` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.5.8)
    (from `0.5.7`, in `dependencies`)

- [#2240](https://github.com/dotansimha/graphql-yoga/pull/2240)
  [`c46d75e8`](https://github.com/dotansimha/graphql-yoga/commit/c46d75e82456d7aecd8e562cf85bd314d19d2a97)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Check HTTP request method after user-land
  plugins

- [#2278](https://github.com/dotansimha/graphql-yoga/pull/2278)
  [`f9ab8a70`](https://github.com/dotansimha/graphql-yoga/commit/f9ab8a70a5498ea8bb924a01b9873f439bd1a0c8)
  Thanks [@ardatan](https://github.com/ardatan)! - Use normalized URL instead of string

- Updated dependencies
  [[`fe4a2aca`](https://github.com/dotansimha/graphql-yoga/commit/fe4a2aca4eece85d234be9ce3f82dcae274148a8)]:
  - @graphql-yoga/subscription@3.1.0

## 3.3.1

### Patch Changes

- [#2275](https://github.com/dotansimha/graphql-yoga/pull/2275)
  [`d4dab446`](https://github.com/dotansimha/graphql-yoga/commit/d4dab446046695932a92ea4ccabb537a57bf3d00)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not pass an explicit endpoint for GraphiQL

## 3.3.0

### Minor Changes

- [#2266](https://github.com/dotansimha/graphql-yoga/pull/2266)
  [`3e5f688f`](https://github.com/dotansimha/graphql-yoga/commit/3e5f688f2cbe02dd2fb4be69831d268aee52c5b5)
  Thanks [@ardatan](https://github.com/ardatan)! - Accept URL patterns like `/:path` and `*` in
  `graphqlEndpoint`

### Patch Changes

- [#2266](https://github.com/dotansimha/graphql-yoga/pull/2266)
  [`3e5f688f`](https://github.com/dotansimha/graphql-yoga/commit/3e5f688f2cbe02dd2fb4be69831d268aee52c5b5)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@0.6.1` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.6.1) (from
    `0.5.4`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/server@0.5.3` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.5.3)
    (from `0.5.1`, in `dependencies`)

- [#2269](https://github.com/dotansimha/graphql-yoga/pull/2269)
  [`8b288a23`](https://github.com/dotansimha/graphql-yoga/commit/8b288a23c882ec643406c7e3cf7a19980abdd381)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/server@0.5.4` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.5.4)
    (from `0.5.3`, in `dependencies`)

## 3.2.1

### Patch Changes

- [#2257](https://github.com/dotansimha/graphql-yoga/pull/2257)
  [`5528d312`](https://github.com/dotansimha/graphql-yoga/commit/5528d312d46281651b330c12f1b9f7a7d64ef3da)
  Thanks [@ardatan](https://github.com/ardatan)! - Handle errors thrown in onRequest correctly

## 3.2.0

### Minor Changes

- [#2150](https://github.com/dotansimha/graphql-yoga/pull/2150)
  [`290c7f7f`](https://github.com/dotansimha/graphql-yoga/commit/290c7f7fde5e604b2a8ac90f93b15e143ea09a92)
  Thanks [@ardatan](https://github.com/ardatan)! - Ping the client every 12 seconds to keep the
  connection alive

### Patch Changes

- [#2213](https://github.com/dotansimha/graphql-yoga/pull/2213)
  [`a86aaa0f`](https://github.com/dotansimha/graphql-yoga/commit/a86aaa0f673037e9207ca12e48f54e7e43963a47)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@graphql-tools/executor@0.0.11` ↗︎](https://www.npmjs.com/package/@graphql-tools/executor/v/0.0.11)
    (from `0.0.9`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/fetch@0.5.4` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.5.4) (from
    `0.5.3`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/server@0.5.1` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.5.1)
    (from `0.4.17`, in `dependencies`)

- [#2250](https://github.com/dotansimha/graphql-yoga/pull/2250)
  [`82f58934`](https://github.com/dotansimha/graphql-yoga/commit/82f5893446e3c55519194a1ca1d784120cbe7098)
  Thanks [@ardatan](https://github.com/ardatan)! - More accurate HTTP status code when unsupported
  media type is sent as a request body.

  Before it was returning `400: Bad Request` with `Request is not valid` text body in the response
  but now it returns `415: Unsupported Media Type` with an empty body.

  Also see this unit test;
  https://github.com/dotansimha/graphql-yoga/pull/2250/files#diff-78bcfa5f6d33aceeabdacd26e353641fea6fd125838ed0e1565762221568c777R380

## 3.1.2

### Patch Changes

- [#2231](https://github.com/dotansimha/graphql-yoga/pull/2231)
  [`c5b1cc46`](https://github.com/dotansimha/graphql-yoga/commit/c5b1cc46f67c4516fcaeb6247f56da4ca7dd7511)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - dependencies updates:
  - Updated dependency
    [`@envelop/parser-cache@^5.0.4` ↗︎](https://www.npmjs.com/package/@envelop/parser-cache/v/5.0.4)
    (from `5.0.4`, in `dependencies`)
  - Updated dependency
    [`@envelop/validation-cache@^5.0.5` ↗︎](https://www.npmjs.com/package/@envelop/validation-cache/v/5.0.5)
    (from `5.0.4`, in `dependencies`)

- [#2238](https://github.com/dotansimha/graphql-yoga/pull/2238)
  [`c152105e`](https://github.com/dotansimha/graphql-yoga/commit/c152105eeed34be2f6380406739a57310729f353)
  Thanks [@ardatan](https://github.com/ardatan)! - Do not call CORS headers factory twice

- [#2206](https://github.com/dotansimha/graphql-yoga/pull/2206)
  [`26d780cd`](https://github.com/dotansimha/graphql-yoga/commit/26d780cd683b15d38880387081455311b57da4ec)
  Thanks [@ardatan](https://github.com/ardatan)! - Correct Mask Error Factory signature

- [#2239](https://github.com/dotansimha/graphql-yoga/pull/2239)
  [`d2958781`](https://github.com/dotansimha/graphql-yoga/commit/d2958781d4f3959f89056092f6f12a2953f5497b)
  Thanks [@davidruisinger](https://github.com/davidruisinger)! - Add content-length: 0 header if 204
  is returned by OPTIONS request

## 3.1.1

### Patch Changes

- [#2179](https://github.com/dotansimha/graphql-yoga/pull/2179)
  [`534780c9`](https://github.com/dotansimha/graphql-yoga/commit/534780c99ed61dd761826d44d99a83748630cb61)
  Thanks [@ardatan](https://github.com/ardatan)! - Add missing .js extension to type imports

## 3.1.0

### Minor Changes

- [#2145](https://github.com/dotansimha/graphql-yoga/pull/2145)
  [`ea81e1dd`](https://github.com/dotansimha/graphql-yoga/commit/ea81e1dda6c074e384221f19bd8a925693fa3427)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Skip nullish query parameters in assertion.

### Patch Changes

- [#2165](https://github.com/dotansimha/graphql-yoga/pull/2165)
  [`86fe453c`](https://github.com/dotansimha/graphql-yoga/commit/86fe453c0ae1183af62359df0d61bba421d9f627)
  Thanks [@ardatan](https://github.com/ardatan)! - Export `useErrorHandler` to revert the unexpected
  breaking change

- [#2145](https://github.com/dotansimha/graphql-yoga/pull/2145)
  [`ea81e1dd`](https://github.com/dotansimha/graphql-yoga/commit/ea81e1dda6c074e384221f19bd8a925693fa3427)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Avoid unnecessary iteration within internals

## 3.0.3

### Patch Changes

- [#2156](https://github.com/dotansimha/graphql-yoga/pull/2156)
  [`491ef5da`](https://github.com/dotansimha/graphql-yoga/commit/491ef5da7c6bcc3038fdb0909fd333a2b5217046)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@envelop/core@3.0.4` ↗︎](https://www.npmjs.com/package/@envelop/core/v/3.0.4) (from `3.0.3`,
    in `dependencies`)
  - Updated dependency
    [`@envelop/parser-cache@5.0.4` ↗︎](https://www.npmjs.com/package/@envelop/parser-cache/v/5.0.4)
    (from `5.0.3`, in `dependencies`)
  - Updated dependency
    [`@envelop/validation-cache@5.0.4` ↗︎](https://www.npmjs.com/package/@envelop/validation-cache/v/5.0.4)
    (from `5.0.3`, in `dependencies`)

## 3.0.2

### Patch Changes

- [#2154](https://github.com/dotansimha/graphql-yoga/pull/2154)
  [`0007c58d`](https://github.com/dotansimha/graphql-yoga/commit/0007c58d3ebc13cac694e561409fb2578ca5b882)
  Thanks [@ardatan](https://github.com/ardatan)! - Only Yoga's errors are now 200 when content-type
  is application/json

- [#2147](https://github.com/dotansimha/graphql-yoga/pull/2147)
  [`39a8fe89`](https://github.com/dotansimha/graphql-yoga/commit/39a8fe8977ec3c85d5ce5c643002aa79e6283f79)
  Thanks [@ardatan](https://github.com/ardatan)! - Bump @whatwg-node/server to fix the conflict
  issue between webworker & dom TS typing libs

## 3.0.1

### Patch Changes

- [#2125](https://github.com/dotansimha/graphql-yoga/pull/2125)
  [`d63fe841`](https://github.com/dotansimha/graphql-yoga/commit/d63fe84157662896c372feb013b73c6f290a2d3b)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - application/json is the default when accept
  is missing until watershed

## 3.0.0

### Major Changes

- [`2e0c4824`](https://github.com/dotansimha/graphql-yoga/commit/2e0c482418af2281c9cf0c34dd16f207d850cdb7)
  Thanks [@b4s36t4](https://github.com/b4s36t4)! - _Drop Node 12 Support_

  GraphQL Yoga no longer supports Node 12 which is no longer an LTS version. GraphQL Yoga now needs
  Node 14 at least.

- [#2012](https://github.com/dotansimha/graphql-yoga/pull/2012)
  [`720898db`](https://github.com/dotansimha/graphql-yoga/commit/720898dbf923a7aa52ff63e50e25527be1e8921b)
  Thanks [@saihaj](https://github.com/saihaj)! - Remove `.inject` method to mock testing. Users
  should replace to use `fetch` method for testing.

  Checkout our docs on testing https://www.the-guild.dev/graphql/yoga-server/v3/features/testing.

  ```diff
  import { createYoga } from 'graphql-yoga'
  import { schema } from './schema'

  const yoga = createYoga({ schema })

  - const { response, executionResult } = await yoga.inject({
  -   document: "query { ping }",
  - })

  + const response = await yoga.fetch('http://yoga/graphql', {
  +   method: 'POST',
  +   headers: {
  +     'Content-Type': 'application/json',
  +   },
  +   body: JSON.stringify({
  +     query: 'query { ping }',
  +   }),
  + })
  + const executionResult = await response.json()

  console.assert(response.status === 200, 'Response status should be 200')
  console.assert(executionResult.data.ping === 'pong',`Expected 'pong'`)
  ```

- [#1753](https://github.com/dotansimha/graphql-yoga/pull/1753)
  [`eeaced00`](https://github.com/dotansimha/graphql-yoga/commit/eeaced008fdd1b209d6db81f3351803f2a0a1089)
  Thanks [@ardatan](https://github.com/ardatan)! - `schema` no longer accepts an object of
  `typeDefs` and `resolvers` but instead you can use `createSchema` to create a GraphQL schema.

- [#1516](https://github.com/dotansimha/graphql-yoga/pull/1516)
  [`209b1620`](https://github.com/dotansimha/graphql-yoga/commit/209b1620055cf64647943b1c334852a314aff3a4)
  Thanks [@ardatan](https://github.com/ardatan)! - Now it is possible to decide the returned
  `Content-Type` by specifying the `Accept` header. So if `Accept` header has `text/event-stream`
  without `application/json`, Yoga respects that returns `text/event-stream` instead of
  `application/json`.

- [#1808](https://github.com/dotansimha/graphql-yoga/pull/1808)
  [`02d2aecd`](https://github.com/dotansimha/graphql-yoga/commit/02d2aecdee55e4c54454c48c2ca0fd7425796ae0)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Drop `readinessCheckEndpoint` in favor of the
  `useReadinessCheck` plugin

  [See docs for more information](https://www.the-guild.dev/graphql/yoga-server/v3/features/health-check#readiness)

- [#1473](https://github.com/dotansimha/graphql-yoga/pull/1473)
  [`c4b3a9c8`](https://github.com/dotansimha/graphql-yoga/commit/c4b3a9c8031f7b61420bb9cdc4bc6e7fc22615a5)
  Thanks [@ardatan](https://github.com/ardatan)! - Replace `GraphQLYogaError` in favor of
  `GraphQLError`.

  [Check the documentation to see how to use `GraphQLError`](https://www.graphql-yoga.com/v3/guides/error-masking)

- [#1660](https://github.com/dotansimha/graphql-yoga/pull/1660)
  [`71554172`](https://github.com/dotansimha/graphql-yoga/commit/715541729f76be82d9f959a96e7af6126836df87)
  Thanks [@saihaj](https://github.com/saihaj)! - Update to the latest version of the envelop
  `useMaskedError` plugin.
  - Removed `handleValidationErrors` and `handleParseErrors`
  - Renamed `formatError` to `maskError`

  [Checkout Envelop docs for more details](https://www.the-guild.dev/graphql/envelop/v3/guides/migrating-from-v2-to-v3#8-update-options-for-usemaskederrors-plugin)

- [#2091](https://github.com/dotansimha/graphql-yoga/pull/2091)
  [`1d508495`](https://github.com/dotansimha/graphql-yoga/commit/1d50849526f5a8b23beac3c542826a70ac286ae7)
  Thanks [@ardatan](https://github.com/ardatan)! - Export only specific utilities from
  `@envelop/core`.

### Minor Changes

- [#1966](https://github.com/dotansimha/graphql-yoga/pull/1966)
  [`6e250209`](https://github.com/dotansimha/graphql-yoga/commit/6e25020916670fb50fecb5ff7c25f7216db3d78a)
  Thanks [@saihaj](https://github.com/saihaj)! - Use `@graphql-tools/executor` as a default GraphQL
  Executor in favor of `graphql-js`.

- [#1497](https://github.com/dotansimha/graphql-yoga/pull/1497)
  [`1d7f810a`](https://github.com/dotansimha/graphql-yoga/commit/1d7f810a8ee3fc00f6dbde461010683eb354da2d)
  Thanks [@ardatan](https://github.com/ardatan)! - Support a schema factory function that runs per
  request or a promise to be resolved before the first request.

  ```ts
  createYoga({
    schema(request: Request) {
      return getSchemaForToken(request.headers.get('x-my-token'))
    }
  })
  ```

  ```ts
  async function buildSchemaAsync() {
    const typeDefs = await fs.promises.readFile('./schema.graphql', 'utf8')
    const resolvers = await import('./resolvers.js')
    return makeExecutableSchema({ typeDefs, resolvers })
  }

  createYoga({
    schema: buildSchemaAsync()
  })
  ```

- [#1662](https://github.com/dotansimha/graphql-yoga/pull/1662)
  [`098e139f`](https://github.com/dotansimha/graphql-yoga/commit/098e139f2b08196bfee04a71bcd024501dceacd8)
  Thanks [@ardatan](https://github.com/ardatan)! - - Batching RFC support with `batchingLimit`
  option to enable batching with an exact limit of requests per batch.
  - New `onParams` hook that takes a single `GraphQLParams` object
  - Changes in `onRequestParse` and `onRequestParseDone` hook
  - Now `onRequestParseDone` receives the exact object that is passed by the request parser so it
    can be `GraphQLParams` or an array of `GraphQLParams` so use `onParams` if you need to
    manipulate batched execution params individually.

### Patch Changes

- [#1997](https://github.com/dotansimha/graphql-yoga/pull/1997)
  [`8773a27f`](https://github.com/dotansimha/graphql-yoga/commit/8773a27ffb7f50a4b1f8c044d2a0c428d14e4fee)
  Thanks [@saihaj](https://github.com/saihaj)! - **Defer and Stream Support**

  [See the docs for more information](https://www.the-guild.dev/graphql/yoga-server/v3/features/defer-stream)

- [#2024](https://github.com/dotansimha/graphql-yoga/pull/2024)
  [`9f991a27`](https://github.com/dotansimha/graphql-yoga/commit/9f991a2767d374f1d6ab37445e65f748d5a1fe6d)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Ensure all parsing failures in
  `GraphQLScalarType` are caught and handled with 400 status code.

- [#1920](https://github.com/dotansimha/graphql-yoga/pull/1920)
  [`cebca219`](https://github.com/dotansimha/graphql-yoga/commit/cebca219c4913f45509c3a40f0f5aa6697f5914d)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Handle edge case where `Content-Type` header
  provides a list like;

  ```
  Content-Type: application/json, text/plain, */*
  ```

- [#1609](https://github.com/dotansimha/graphql-yoga/pull/1609)
  [`74e1f830`](https://github.com/dotansimha/graphql-yoga/commit/74e1f830b09bc21a970f7468af1363a22b8b592b)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - `usePreventMutationViaGET` doesn't do
  assertion if it is not `YogaContext`, so it is possible to use Yoga's Envelop instance with other
  server implementations like `graphql-ws`.

- [#1567](https://github.com/dotansimha/graphql-yoga/pull/1567)
  [`e7a47b56`](https://github.com/dotansimha/graphql-yoga/commit/e7a47b56fbdf3abbb8f0d590ade867805a84157e)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Handle invalid POST body gracefully. Reject `null`,
  non-object bodies or invalid JSON bodies.

- [#1911](https://github.com/dotansimha/graphql-yoga/pull/1911)
  [`5f5b1160`](https://github.com/dotansimha/graphql-yoga/commit/5f5b116084cff45ed49f0c74cc449ff20fd775ac)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Handle cases where user supplies a
  malformed/unexpected context. Preventing GraphQL Yoga to crash and existing prematurely.

- [`73e56068`](https://github.com/dotansimha/graphql-yoga/commit/73e56068fd1c1c06a0cf08150d5b79ce7c49992a)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix cancellation logic for defer/stream queries.

- [#1609](https://github.com/dotansimha/graphql-yoga/pull/1609)
  [`74e1f830`](https://github.com/dotansimha/graphql-yoga/commit/74e1f830b09bc21a970f7468af1363a22b8b592b)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Expose readonly `graphqlEndpoint` in
  `YogaServerInstance`

  ```ts
  const yoga = createYoga({
    /*...*/
  })
  console.log(yoga.graphqlEndpoint) // /graphql by default
  ```

- [#1844](https://github.com/dotansimha/graphql-yoga/pull/1844)
  [`b079c93b`](https://github.com/dotansimha/graphql-yoga/commit/b079c93ba47dc94d58f7d2b738a9423c29a149a1)
  Thanks [@ardatan](https://github.com/ardatan)! - All unexpected errors even if they are
  masked/wrapped The HTTP status code will be determined by the specific protocol the client is
  sending.

  > "Unexpected error." means an Error that is not an instance of GraphQLError or an instance of
  > GraphQLError with an `originalError` that is not an instance of GraphQLError recursively.

- [#1988](https://github.com/dotansimha/graphql-yoga/pull/1988)
  [`b19a9104`](https://github.com/dotansimha/graphql-yoga/commit/b19a910447d27e2203bb5e22aaba6ab72d54b560)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect the order of mime types given in the
  accept header by the client.

- [#1616](https://github.com/dotansimha/graphql-yoga/pull/1616)
  [`1d5cde96`](https://github.com/dotansimha/graphql-yoga/commit/1d5cde96ce5b7647de7d329f9f56e398463a9152)
  Thanks [@ardatan](https://github.com/ardatan)! - Allow the content type
  `application/graphql-response+json` as the `Accept` header value.

- [#1775](https://github.com/dotansimha/graphql-yoga/pull/1775)
  [`44878a5b`](https://github.com/dotansimha/graphql-yoga/commit/44878a5b1be937ab0ffefccc327400c80bd62847)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Improve the context type for server and
  request context.

- Updated dependencies
  [[`b2407c6a`](https://github.com/dotansimha/graphql-yoga/commit/b2407c6addab136e3390bd4efa1fbbad7eb8dab8)]:
  - @graphql-yoga/subscription@3.0.0

## 3.0.0-next.12

### Patch Changes

- [`73e56068`](https://github.com/dotansimha/graphql-yoga/commit/73e56068fd1c1c06a0cf08150d5b79ce7c49992a)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix cancellation logic for defer/stream queries

## 3.0.0-next.11

### Major Changes

- [#2012](https://github.com/dotansimha/graphql-yoga/pull/2012)
  [`720898db`](https://github.com/dotansimha/graphql-yoga/commit/720898dbf923a7aa52ff63e50e25527be1e8921b)
  Thanks [@saihaj](https://github.com/saihaj)! - Remove `.inject` method to mock testing. Users
  should replace to use `fetch` method for testing. Checkout our docs on testing
  https://www.the-guild.dev/graphql/yoga-server/v3/features/testing.

  ```diff
  import { createYoga } from 'graphql-yoga'
  import { schema } from './schema'

  const yoga = createYoga({ schema })

  - const { response, executionResult } = await yoga.inject({
  -   document: "query { ping }",
  - })

  + const response = await yoga.fetch('http://localhost:4000/graphql', {
  +   method: 'POST',
  +   headers: {
  +     'Content-Type': 'application/json',
  +   },
  +   body: JSON.stringify({
  +     query: 'query { ping }',
  +   }),
  + })
  + const executionResult = await response.json()

  console.assert(response.status === 200, 'Response status should be 200')
  console.assert(executionResult.data.ping === 'pong',`Expected 'pong'`)
  ```

### Patch Changes

- [#2024](https://github.com/dotansimha/graphql-yoga/pull/2024)
  [`9f991a27`](https://github.com/dotansimha/graphql-yoga/commit/9f991a2767d374f1d6ab37445e65f748d5a1fe6d)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Ensure all parsing failures in
  `GraphQLScalarType` are caught and handled with 400 status code.

- [#2058](https://github.com/dotansimha/graphql-yoga/pull/2058)
  [`ef191eee`](https://github.com/dotansimha/graphql-yoga/commit/ef191eeeba63d96a4a141126c6fc5f4cf992e2d2)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Simplify landing page and fix links

## 3.0.0-next.10

### Patch Changes

- [#1997](https://github.com/dotansimha/graphql-yoga/pull/1997)
  [`8773a27f`](https://github.com/dotansimha/graphql-yoga/commit/8773a27ffb7f50a4b1f8c044d2a0c428d14e4fee)
  Thanks [@saihaj](https://github.com/saihaj)! - introduce a new plugin for defer and stream instead
  of making it default in yoga

- [#1996](https://github.com/dotansimha/graphql-yoga/pull/1996)
  [`cedde92f`](https://github.com/dotansimha/graphql-yoga/commit/cedde92fead65bcc4c08bb31d4c2400f92fd83d2)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Support older version of GraphQLjs

- [#1992](https://github.com/dotansimha/graphql-yoga/pull/1992)
  [`bf69a561`](https://github.com/dotansimha/graphql-yoga/commit/bf69a561b3c18b8b2736c2a72da0a59244f6f62b)
  Thanks [@saihaj](https://github.com/saihaj)! - inline functions to support multiple version of
  graphql-js

## 3.0.0-next.9

### Minor Changes

- [#1936](https://github.com/dotansimha/graphql-yoga/pull/1936)
  [`87a6c333`](https://github.com/dotansimha/graphql-yoga/commit/87a6c3331a81503c07f211296e75ca0c5e060f0a)
  Thanks [@renovate](https://github.com/apps/renovate)! - Engine and graphql-js version agnostic
  Defer/Stream support

### Patch Changes

- [#1988](https://github.com/dotansimha/graphql-yoga/pull/1988)
  [`b19a9104`](https://github.com/dotansimha/graphql-yoga/commit/b19a910447d27e2203bb5e22aaba6ab72d54b560)
  Thanks [@ardatan](https://github.com/ardatan)! - Respect the order of mime types given in the
  accept header by the client

## 3.0.0-next.8

### Minor Changes

- [#1966](https://github.com/dotansimha/graphql-yoga/pull/1966)
  [`6e250209`](https://github.com/dotansimha/graphql-yoga/commit/6e25020916670fb50fecb5ff7c25f7216db3d78a)
  Thanks [@saihaj](https://github.com/saihaj)! - use custom executor

## 3.0.0-next.7

### Patch Changes

- [#1920](https://github.com/dotansimha/graphql-yoga/pull/1920)
  [`cebca219`](https://github.com/dotansimha/graphql-yoga/commit/cebca219c4913f45509c3a40f0f5aa6697f5914d)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Handle edge case where Content-Type header
  provides a list

- [#1911](https://github.com/dotansimha/graphql-yoga/pull/1911)
  [`5f5b1160`](https://github.com/dotansimha/graphql-yoga/commit/5f5b116084cff45ed49f0c74cc449ff20fd775ac)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Handle cases where user supplies a
  malformed/unexpected context

## 3.0.0-next.6

### Patch Changes

- [#1903](https://github.com/dotansimha/graphql-yoga/pull/1903)
  [`dc45a7b5`](https://github.com/dotansimha/graphql-yoga/commit/dc45a7b57d4248501429c1bf66c0cd6ca36926fd)
  Thanks [@saihaj](https://github.com/saihaj)! - remove graphql tools as dep

## 3.0.0-next.5

### Major Changes

- [#1660](https://github.com/dotansimha/graphql-yoga/pull/1660)
  [`71554172`](https://github.com/dotansimha/graphql-yoga/commit/715541729f76be82d9f959a96e7af6126836df87)
  Thanks [@saihaj](https://github.com/saihaj)! - update to Envelop `useMaskedError` plugin
  - Removed handleValidationErrors and handleParseErrors
  - Renamed formatError to maskError

  Checkout envelop docs for more details
  https://www.the-guild.dev/graphql/envelop/v3/guides/migrating-from-v2-to-v3#8-update-options-for-usemaskederrors-plugin

## 3.0.0-next.4

### Major Changes

- [#1808](https://github.com/dotansimha/graphql-yoga/pull/1808)
  [`02d2aecd`](https://github.com/dotansimha/graphql-yoga/commit/02d2aecdee55e4c54454c48c2ca0fd7425796ae0)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Drop `readinessCheckEndpoint` and introduce
  `useReadinessCheck` plugin

### Patch Changes

- [#1844](https://github.com/dotansimha/graphql-yoga/pull/1844)
  [`b079c93b`](https://github.com/dotansimha/graphql-yoga/commit/b079c93ba47dc94d58f7d2b738a9423c29a149a1)
  Thanks [@ardatan](https://github.com/ardatan)! - - All unexpected errors even if they are
  masked/wrapped, HTTP status code will be set to 500.

  > "Unexpected error" means an Error that is not an instance of GraphQLError or an instance of
  > GraphQLError with an `originalError` that is not an instance of GraphQLError recursively.

## 3.0.0-next.3

### Patch Changes

- [`64e06d74`](https://github.com/dotansimha/graphql-yoga/commit/64e06d74132a118f30b42b51c0e71abced0506a4)
  Thanks [@ardatan](https://github.com/ardatan)! - Fix execute/stop button

## 3.0.0-next.2

### Patch Changes

- [#1794](https://github.com/dotansimha/graphql-yoga/pull/1794)
  [`8c674c36`](https://github.com/dotansimha/graphql-yoga/commit/8c674c365e0bac176ca296e8d531fcd28d228d5b)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Updated dependency
    [`@whatwg-node/fetch@0.4.6` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.4.6) (from
    `0.4.5`, in `dependencies`)
  - Updated dependency
    [`@whatwg-node/server@0.4.10` ↗︎](https://www.npmjs.com/package/@whatwg-node/server/v/0.4.10)
    (from `0.4.7`, in `dependencies`)
  - Added dependency
    [`@graphql-tools/utils@8.12.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.12.0)
    (to `dependencies`)

## 3.0.0-next.1

### Patch Changes

- [#1775](https://github.com/dotansimha/graphql-yoga/pull/1775)
  [`44878a5b`](https://github.com/dotansimha/graphql-yoga/commit/44878a5b1be937ab0ffefccc327400c80bd62847)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Context typings improvements

## 3.0.0-next.0

### Major Changes

- [#1660](https://github.com/dotansimha/graphql-yoga/pull/1660)
  [`2e0c4824`](https://github.com/dotansimha/graphql-yoga/commit/2e0c482418af2281c9cf0c34dd16f207d850cdb7)
  Thanks [@saihaj](https://github.com/saihaj)! - _Drop Node 12 Support_

  GraphQL Yoga no longer supports Node 12 which is no longer an LTS version. GraphQL Yoga now needs
  Node 14 at least.

- [#1660](https://github.com/dotansimha/graphql-yoga/pull/1660)
  [`f46addd7`](https://github.com/dotansimha/graphql-yoga/commit/f46addd767f38bc3a48d796b0f2cb02c5f5668ef)
  Thanks [@saihaj](https://github.com/saihaj)! - See the migration guide for more information;

  [Migration from Yoga V2](https://www.graphql-yoga.com/v3/migration/migration-from-yoga-v2)

- [#1753](https://github.com/dotansimha/graphql-yoga/pull/1753)
  [`eeaced00`](https://github.com/dotansimha/graphql-yoga/commit/eeaced008fdd1b209d6db81f3351803f2a0a1089)
  Thanks [@ardatan](https://github.com/ardatan)! - `schema` no longer accepts an object of
  `typeDefs` and `resolvers` but instead you can use `createSchema` to create a GraphQL schema.

- [#1516](https://github.com/dotansimha/graphql-yoga/pull/1516)
  [`209b1620`](https://github.com/dotansimha/graphql-yoga/commit/209b1620055cf64647943b1c334852a314aff3a4)
  Thanks [@ardatan](https://github.com/ardatan)! - Now it is possible to decide the returned
  `Content-Type` by specifying the `Accept` header. So if `Accept` header has `text/event-stream`
  without `application/json`, Yoga respects that returns `text/event-stream` instead of
  `application/json`.

- [#1473](https://github.com/dotansimha/graphql-yoga/pull/1473)
  [`c4b3a9c8`](https://github.com/dotansimha/graphql-yoga/commit/c4b3a9c8031f7b61420bb9cdc4bc6e7fc22615a5)
  Thanks [@ardatan](https://github.com/ardatan)! - **BREAKING**: Remove `GraphQLYogaError` in favor
  of `GraphQLError`
  [Check the documentation to see how to use `GraphQLError`](https://www.graphql-yoga.com/v3/guides/error-masking)

### Minor Changes

- [#1610](https://github.com/dotansimha/graphql-yoga/pull/1610)
  [`f4b23387`](https://github.com/dotansimha/graphql-yoga/commit/f4b233876c2db52886eb5211b029377450fdb7f1)
  Thanks [@ardatan](https://github.com/ardatan)! - Pass the parsed request as-is and validate the
  final GraphQLParams in useCheckGraphQLParams

- [#1497](https://github.com/dotansimha/graphql-yoga/pull/1497)
  [`1d7f810a`](https://github.com/dotansimha/graphql-yoga/commit/1d7f810a8ee3fc00f6dbde461010683eb354da2d)
  Thanks [@ardatan](https://github.com/ardatan)! - Support a schema factory function that runs per
  request or a promise to be resolved before the first request.

  ```ts
  createYoga({
    schema(request: Request) {
      return getSchemaForToken(request.headers.get('x-my-token'))
    }
  })
  ```

  ```ts
  async function buildSchemaAsync() {
    const typeDefs = await fs.promises.readFile('./schema.graphql', 'utf8')
    const resolvers = await import('./resolvers.js')
    return makeExecutableSchema({ typeDefs, resolvers })
  }

  createYoga({
    schema: buildSchemaAsync()
  })
  ```

- [#1662](https://github.com/dotansimha/graphql-yoga/pull/1662)
  [`098e139f`](https://github.com/dotansimha/graphql-yoga/commit/098e139f2b08196bfee04a71bcd024501dceacd8)
  Thanks [@ardatan](https://github.com/ardatan)! - - Batching RFC support with `batchingLimit`
  option to enable batching with an exact limit of requests per batch.
  - New `onParams` hook that takes a single `GraphQLParams` object
  - Changes in `onRequestParse` and `onRequestParseDone` hook
  - - Now `onRequestParseDone` receives the exact object that is passed by the request parser so it
      can be `GraphQLParams` or an array of `GraphQLParams` so use `onParams` if you need to
      manipulate batched execution params individually.

### Patch Changes

- [#1609](https://github.com/dotansimha/graphql-yoga/pull/1609)
  [`74e1f830`](https://github.com/dotansimha/graphql-yoga/commit/74e1f830b09bc21a970f7468af1363a22b8b592b)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - `usePreventMutationViaGET` doesn't do
  assertion if it is not `YogaContext`, so it is possible to use Yoga's Envelop instance with other
  server implementations like `graphql-ws`.

- [#1567](https://github.com/dotansimha/graphql-yoga/pull/1567)
  [`e7a47b56`](https://github.com/dotansimha/graphql-yoga/commit/e7a47b56fbdf3abbb8f0d590ade867805a84157e)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - Handle invalid POST body gracefully; - Reject
  `null` - Reject non-object body - Reject invalid JSON body

- [#1609](https://github.com/dotansimha/graphql-yoga/pull/1609)
  [`74e1f830`](https://github.com/dotansimha/graphql-yoga/commit/74e1f830b09bc21a970f7468af1363a22b8b592b)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Expose readonly `graphqlEndpoint` in
  `YogaServerInstance`

  ```ts
  const yoga = createYoga({
    /*...*/
  })
  console.log(yoga.graphqlEndpoint) // /graphql by default
  ```

- [#1616](https://github.com/dotansimha/graphql-yoga/pull/1616)
  [`1d5cde96`](https://github.com/dotansimha/graphql-yoga/commit/1d5cde96ce5b7647de7d329f9f56e398463a9152)
  Thanks [@ardatan](https://github.com/ardatan)! - Support `application/graphql-response+json` as
  `Accept`ed content type for the response

- Updated dependencies
  [[`b2407c6a`](https://github.com/dotansimha/graphql-yoga/commit/b2407c6addab136e3390bd4efa1fbbad7eb8dab8)]:
  - @graphql-yoga/subscription@3.0.0-next.0

## 2.13.11

### Patch Changes

- Updated dependencies []:
  - @graphql-yoga/node@2.13.11

## 2.13.10

### Patch Changes

- Updated dependencies
  [[`779b55ee`](https://github.com/dotansimha/graphql-yoga/commit/779b55eea843bd282f659e1012f255f62fd888b6)]:
  - @graphql-yoga/node@2.13.10

## 2.13.9

### Patch Changes

- Updated dependencies []:
  - @graphql-yoga/node@2.13.9

## 2.13.8

### Patch Changes

- Updated dependencies []:
  - @graphql-yoga/node@2.13.8

## 2.13.7

### Patch Changes

- Updated dependencies
  [[`e4e8ade`](https://github.com/dotansimha/graphql-yoga/commit/e4e8ade526c2aec7ea28218ca7795e96b867fc6b),
  [`94b41f3`](https://github.com/dotansimha/graphql-yoga/commit/94b41f30f598afb37db2438c736764e2a539cd10)]:
  - @graphql-yoga/node@2.13.7

## 2.13.6

### Patch Changes

- eecf24c: Fix CommonJS TypeScript resolution with `moduleResolution` `node16` or `nodenext`
- Updated dependencies [eecf24c]
  - @graphql-yoga/node@2.13.6

## 2.13.5

### Patch Changes

- Updated dependencies [c00dad3]
  - @graphql-yoga/node@2.13.5

## 2.13.4

### Patch Changes

- @graphql-yoga/node@2.13.4

## 2.13.3

### Patch Changes

- Updated dependencies [639607d]
  - @graphql-yoga/node@2.13.3

## 2.13.2

### Patch Changes

- @graphql-yoga/node@2.13.2

## 2.13.1

### Patch Changes

- @graphql-yoga/node@2.13.1

## 2.13.0

### Patch Changes

- @graphql-yoga/node@2.13.0

## 2.12.0

### Patch Changes

- @graphql-yoga/node@2.12.0

## 2.11.2

### Patch Changes

- Updated dependencies [ca5f940]
  - @graphql-yoga/node@2.11.2

## 2.11.1

### Patch Changes

- Updated dependencies [9248df8]
  - @graphql-yoga/node@2.11.1

## 2.11.0

### Patch Changes

- Updated dependencies [8947657]
  - @graphql-yoga/node@2.11.0

## 2.10.0

### Minor Changes

- 7de07cd: Support TypeScript ECMA script resolution. More information on
  https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/#ecmascript-module-support-in-node-js

### Patch Changes

- Updated dependencies [7de07cd]
- Updated dependencies [8922c3b]
  - @graphql-yoga/node@2.10.0

## 2.9.2

### Patch Changes

- @graphql-yoga/node@2.9.2

## 2.9.1

### Patch Changes

- @graphql-yoga/node@2.9.1

## 2.9.0

### Patch Changes

- Updated dependencies [06652c7]
- Updated dependencies [2d3c54c]
  - @graphql-yoga/node@2.9.0

## 2.8.0

### Patch Changes

- @graphql-yoga/node@2.8.0

## 2.7.0

### Patch Changes

- @graphql-yoga/node@2.7.0

## 2.6.1

### Patch Changes

- Updated dependencies [0224bf9]
  - @graphql-yoga/node@2.6.1

## 2.6.0

### Patch Changes

- @graphql-yoga/node@2.6.0

## 2.5.0

### Patch Changes

- Updated dependencies [8b6d896]
  - @graphql-yoga/node@2.5.0

## 2.4.1

### Patch Changes

- @graphql-yoga/node@2.4.1

## 2.4.0

### Patch Changes

- Updated dependencies [28e24c3]
- Updated dependencies [13f96db]
  - @graphql-yoga/node@2.4.0

## 2.3.0

### Patch Changes

- @graphql-yoga/node@2.3.0

## 2.2.1

### Patch Changes

- Updated dependencies [32e2e40]
  - @graphql-yoga/node@2.2.1

## 2.2.0

### Patch Changes

- Updated dependencies [1d4fe42]
  - @graphql-yoga/node@2.2.0

## 2.1.0

### Patch Changes

- Updated dependencies [4077773]
- Updated dependencies [2739db2]
- Updated dependencies [cd9394e]
  - @graphql-yoga/node@2.1.0

## 2.0.0

### Major Changes

- b6dd3f1: The goal is to provide a fully-featured, simple to set up, performant and extendable
  server. Some key features:
  - [GraphQL-over-HTTP](https://github.com/graphql/graphql-over-http) spec compliant
  - Extend the GraphQL request flow using [`envelop`](https://www.envelop.dev/)
  - File uploads (via GraphQL multipart request specification)
  - GraphQL Subscriptions (using [SSE](https://github.com/enisdenjo/graphql-sse))
  - Logging using [Pino](https://github.com/pinojs/pino)
  - Improved TypeScript Support
  - Try out experimental GraphQL features such as `@defer` and `@stream`

- de1693e: trigger release

### Minor Changes

- 6750eff: rename `GraphQLServerError` to `GraphQLYogaError`.
- 0edf1f8: feat: options for GraphiQL
- d414f95: **BREAKING** Set `maskedErrors` value to `true` by default for safer defaults.

  **BREAKING** Remove `disableIntrospection`.
  [Please use `useDisableIntrospection` from `@envelop/disable-introspection` instead.](https://www.envelop.dev/plugins/use-disable-introspection)

- 36af58e: export renderGraphiQL function
- bea2dcc: align envelop types
- fc1f2c7: make options optional
- fb894da: Rename createGraphQLServer to createServer
- 1a20e1e: Export everything from @envelop/core and export GraphQLFile scalar
- d078e84: Drop fastify and use node-http package
- 6d60ebf: add tabs to GraphiQL
- 9554f81: Add PubSub utility.
- 95e0ac0: feat: remove unnecessary Upload scalar types
- dcaea56: add missing tslib dependency

### Patch Changes

- 6effd5d: fix(node): handle response cancellation correctly
- 3d54829: enhance: move W3C changes
- 0edf1f8: feat(cli): binds GraphQL Config to GraphQL Yoga
- a10a16c: Node Server implementation has been moved to `@graphql-yoga/node` package.

  CLI implementation has been moved to `graphql-yoga` package.

- 5b6f025: feat(yoga-cli): fallback to default schema and add mock parameter
- Updated dependencies [d414f95]
- Updated dependencies [133f8e9]
- Updated dependencies [14c93a7]
- Updated dependencies [ec777b1]
- Updated dependencies [dcaea56]
- Updated dependencies [b0b244b]
- Updated dependencies [cfec14b]
- Updated dependencies [433558f]
- Updated dependencies [3c82b57]
- Updated dependencies [f5f06f4]
- Updated dependencies [dcaea56]
- Updated dependencies [8ab60cf]
- Updated dependencies [433558f]
- Updated dependencies [5fba736]
- Updated dependencies [62e8c07]
- Updated dependencies [ce60a48]
- Updated dependencies [a8b619b]
- Updated dependencies [6d60ebf]
- Updated dependencies [44ad1b3]
- Updated dependencies [0424fe3]
- Updated dependencies [de1693e]
- Updated dependencies [d60f79f]
- Updated dependencies [dcaea56]
- Updated dependencies [daeea82]
- Updated dependencies [a10a16c]
  - @graphql-yoga/node@0.1.0

## 2.0.0-beta.8

### Minor Changes

- 6d60ebf: add tabs to GraphiQL

### Patch Changes

- 5b6f025: feat(yoga-cli): fallback to default schema and add mock parameter
- Updated dependencies [3c82b57]
- Updated dependencies [6d60ebf]
- Updated dependencies [0424fe3]
- Updated dependencies [d60f79f]
  - @graphql-yoga/node@0.1.0-beta.8

## 2.0.0-beta.7

### Patch Changes

- Updated dependencies [14c93a7]
- Updated dependencies [ec777b1]
- Updated dependencies [8ab60cf]
  - @graphql-yoga/node@0.1.0-beta.7

## 2.0.0-beta.6

### Patch Changes

- @graphql-yoga/node@0.1.0-beta.6

## 2.0.0-beta.5

### Patch Changes

- Updated dependencies [cfec14b]
- Updated dependencies [5fba736]
- Updated dependencies [44ad1b3]
  - @graphql-yoga/node@0.1.0-beta.5

## 2.0.0-beta.4

### Patch Changes

- Updated dependencies [433558f]
- Updated dependencies [433558f]
  - @graphql-yoga/node@0.1.0-beta.4

## 2.0.0-beta.3

### Patch Changes

- Updated dependencies [62e8c07]
  - @graphql-yoga/node@0.1.0-beta.3

## 2.0.0-beta.2

### Patch Changes

- Updated dependencies [daeea82]
  - @graphql-yoga/node@0.0.1-beta.2

## 2.0.0-beta.1

### Patch Changes

- @graphql-yoga/node@0.0.1-beta.1

## 2.0.0-beta.0

### Major Changes

- de1693e: trigger release

### Patch Changes

- Updated dependencies [de1693e]
  - @graphql-yoga/node@0.0.1-beta.0

## 2.0.0-alpha.12

### Minor Changes

- dcaea56: add missing tslib dependency

### Patch Changes

- Updated dependencies [133f8e9]
- Updated dependencies [dcaea56]
- Updated dependencies [f5f06f4]
- Updated dependencies [dcaea56]
- Updated dependencies [ce60a48]
- Updated dependencies [dcaea56]
  - @graphql-yoga/node@0.1.0-alpha.4

## 2.0.0-alpha.11

### Patch Changes

- @graphql-yoga/node@0.1.0-alpha.3

## 2.0.0-alpha.10

### Patch Changes

- Updated dependencies [b0b244b]
  - @graphql-yoga/node@0.1.0-alpha.2

## 2.0.0-alpha.9

### Patch Changes

- @graphql-yoga/node@0.1.0-alpha.1

## 2.0.0-alpha.8

### Minor Changes

- 6750eff: rename `GraphQLServerError` to `GraphQLYogaError`.
- d414f95: **BREAKING** Set `maskedErrors` value to `true` by default for safer defaults.

  **BREAKING** Remove `disableIntrospection`.
  [Please use `useDisableIntrospection` from `@envelop/disable-introspection` instead.](https://www.envelop.dev/plugins/use-disable-introspection)

- bea2dcc: align envelop types
- fc1f2c7: make options optional

### Patch Changes

- 6effd5d: fix(node): handle response cancellation correctly
- a10a16c: Node Server implementation has been moved to `@graphql-yoga/node` package.

  CLI implementation has been moved to `graphql-yoga` package.

- Updated dependencies [d414f95]
- Updated dependencies [a10a16c]
  - @graphql-yoga/node@0.1.0-alpha.0

## 2.0.0-alpha.7

### Patch Changes

- 3d54829: enhance: move W3C changes
- Updated dependencies [3d54829]
  - @graphql-yoga/common@0.2.0-alpha.6
  - @graphql-yoga/handler@0.2.0-alpha.3

## 2.0.0-alpha.6

### Minor Changes

- 36af58e: export renderGraphiQL function

### Patch Changes

- Updated dependencies [36af58e]
  - @graphql-yoga/common@0.2.0-alpha.5
  - @graphql-yoga/handler@0.2.0-alpha.2

## 2.0.0-alpha.5

### Patch Changes

- Updated dependencies [d2c2d18]
  - @graphql-yoga/common@0.2.0-alpha.4

## 2.0.0-alpha.4

### Minor Changes

- fb894da: Rename createGraphQLServer to createServer

### Patch Changes

- Updated dependencies [e99ec3e]
- Updated dependencies [fb894da]
  - @graphql-yoga/subscription@0.1.0-alpha.0
  - @graphql-yoga/common@0.2.0-alpha.3

## 2.0.0-alpha.3

### Minor Changes

- 0edf1f8: feat: options for GraphiQL
- 1a20e1e: Export everything from @envelop/core and export GraphQLFile scalar
- 9554f81: Add PubSub utility.
- 95e0ac0: feat: remove unnecessary Upload scalar types

### Patch Changes

- Updated dependencies [0edf1f8]
- Updated dependencies [95e0ac0]
  - @graphql-yoga/common@0.2.0-alpha.2
  - @graphql-yoga/handler@0.2.0-alpha.1

## 2.0.0-alpha.2

### Patch Changes

- Updated dependencies [5de1acf]
  - @graphql-yoga/common@0.2.0-alpha.1

## 2.0.0-alpha.1

### Minor Changes

- d078e84: Drop fastify and use node-http package

### Patch Changes

- Updated dependencies [d078e84]
- Updated dependencies [d8f8a81]
  - @graphql-yoga/common@0.2.0-alpha.0
  - @graphql-yoga/handler@0.2.0-alpha.0

## 2.0.0-alpha.0

### Major Changes

- b6dd3f1: The goal is to provide a fully-featured, simple to set up, performant and extendable
  server. Some key features:
  - [GraphQL-over-HTTP](https://github.com/graphql/graphql-over-http) spec compliant
  - Extend the GraphQL request flow using [`envelop`](https://www.envelop.dev/)
  - File uploads (via GraphQL multipart request specification)
  - GraphQL Subscriptions (using [SSE](https://github.com/enisdenjo/graphql-sse))
  - Logging using [Pino](https://github.com/pinojs/pino)
  - Improved TypeScript Support
  - Try out experimental GraphQL features such as `@defer` and `@stream`
