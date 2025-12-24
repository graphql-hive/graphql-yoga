# @envelop/prometheus

## 14.0.0

### Patch Changes

- Updated dependencies
  [[`0434fbd`](https://github.com/graphql-hive/envelop/commit/0434fbdf9e6a33a64f5cb5fe34662ea4815647eb)]:
  - @envelop/core@5.4.0
  - @envelop/on-resolve@7.0.0

## 13.0.0

### Patch Changes

- Updated dependencies
  [[`3ebaa3b`](https://github.com/graphql-hive/envelop/commit/3ebaa3b75b34f9a61aa517166f538796b383bfad)]:
  - @envelop/core@5.3.0
  - @envelop/on-resolve@6.0.0

## 12.1.3

### Patch Changes

- Updated dependencies
  [[`914f9ed`](https://github.com/n1ru4l/envelop/commit/914f9ed3b753f771d938b4beb8fd31753b48771e),
  [`914f9ed`](https://github.com/n1ru4l/envelop/commit/914f9ed3b753f771d938b4beb8fd31753b48771e)]:
  - @envelop/core@5.2.3
  - @envelop/on-resolve@5.1.3

## 12.1.2

### Patch Changes

- Updated dependencies
  [[`26137e7`](https://github.com/n1ru4l/envelop/commit/26137e7c3d0ff349af90724867c715f3b3809a7d),
  [`26137e7`](https://github.com/n1ru4l/envelop/commit/26137e7c3d0ff349af90724867c715f3b3809a7d)]:
  - @envelop/core@5.2.2
  - @envelop/on-resolve@5.1.2

## 12.1.1

### Patch Changes

- Updated dependencies
  [[`90dd1a6`](https://github.com/n1ru4l/envelop/commit/90dd1a665e027ec309df4411f04a310806ee8f15),
  [`90dd1a6`](https://github.com/n1ru4l/envelop/commit/90dd1a665e027ec309df4411f04a310806ee8f15)]:
  - @envelop/core@5.2.1
  - @envelop/on-resolve@5.1.1

## 12.1.0

### Patch Changes

- Updated dependencies
  [[`a107c89`](https://github.com/n1ru4l/envelop/commit/a107c896d7a7b1af7417ed0708be336db2ecbb54),
  [`a107c89`](https://github.com/n1ru4l/envelop/commit/a107c896d7a7b1af7417ed0708be336db2ecbb54)]:
  - @envelop/core@5.2.0
  - @envelop/on-resolve@5.1.0

## 12.0.1

### Patch Changes

- Updated dependencies
  [[`5b6a166`](https://github.com/n1ru4l/envelop/commit/5b6a166f5e2c12e6aa4679eb4e3209de43b0efc1),
  [`5b6a166`](https://github.com/n1ru4l/envelop/commit/5b6a166f5e2c12e6aa4679eb4e3209de43b0efc1)]:
  - @envelop/core@5.1.1
  - @envelop/on-resolve@5.0.1

## 12.0.0

### Patch Changes

- Updated dependencies
  [[`9bd1b20`](https://github.com/n1ru4l/envelop/commit/9bd1b207861540f9bee085026b9fab725a88e84e)]:
  - @envelop/core@5.1.0
  - @envelop/on-resolve@5.0.0

## 11.1.0

### Minor Changes

- [#2326](https://github.com/n1ru4l/envelop/pull/2326)
  [`443fc15`](https://github.com/n1ru4l/envelop/commit/443fc150184b40357d064c900de4105f14164c37)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Allow to explicitly control which
  events and timing should be observe.

  Each metric can now be configured to observe events and timings only for certain GraphQL pipeline
  phases, or depending on the request context.

  ## Example: trace only execution and subscription errors

  ```ts
  import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
  import { envelop, useEngine } from '@envelop/core'
  import { usePrometheus } from '@envelop/prometheus'

  const TRACKED_OPERATION_NAMES = [
    // make a list of operation that you want to monitor
  ]

  const getEnveloped = envelop({
    plugins: [
      useEngine({ parse, validate, specifiedRules, execute, subscribe }),
      usePrometheus({
        metrics: {
          // Here, an array of phases can be provided to enable the metric only on certain phases.
          // In this example, only error happening during the execute and subscribe phases will tracked
          graphql_envelop_phase_error: ['execute', 'subscribe']
        }
      })
    ]
  })
  ```

  ## Example: Monitor timing only of a set of operations by name

  ```ts
  import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
  import { envelop, useEngine } from '@envelop/core'
  import { usePrometheus } from '@envelop/prometheus'

  const TRACKED_OPERATION_NAMES = [
    // make a list of operation that you want to monitor
  ]

  const getEnveloped = envelop({
    plugins: [
      useEngine({ parse, validate, specifiedRules, execute, subscribe }),
      usePrometheus({
        metrics: {
          graphql_yoga_http_duration: createHistogram({
            registry,
            histogram: {
              name: 'graphql_envelop_request_duration',
              help: 'Time spent on HTTP connection',
              labelNames: ['operationName']
            },
            fillLabelsFn: ({ operationName }, _rawContext) => ({ operationName }),
            phases: ['execute', 'subscribe'],

            // Here `shouldObserve` control if the request timing should be observed, based on context
            shouldObserve: ({ operationName }) => TRACKED_OPERATIONS.includes(operationName)
          })
        }
      })
    ]
  })
  ```

  ## Default Behavior Change

  A metric is enabled using `true` value in metrics options will observe in every phases available.

  Previously, which phase was observe was depending on which other metric were enabled. For example,
  this config would only trace validation error:

  ```ts
  usePrometheus({
    metrics: {
      graphql_envelop_phase_error: true,
      graphql_envelop_phase_validate: true
    }
  })
  ```

  This is no longer the case. If you were relying on this behavior, please use an array of string to
  restrict observed phases.

  ```ts
  usePrometheus({
    metrics: {
      graphql_envelop_phase_error: ['validate']
    }
  })
  ```

## 11.0.0

### Major Changes

- [#2270](https://github.com/n1ru4l/envelop/pull/2270)
  [`73eb69f`](https://github.com/n1ru4l/envelop/commit/73eb69fd9d67b24d7598d1ce6195911688077c5d)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - **Breaking Change:** Rename all metrics
  options to their actual metric name to avoid confusion.

  All metric options have been moved under a mandatory `metrics` key, and the name of each options
  have been renamed to match the default metric name.

  The plugin option argument is also now mandatory.

  ```diff
  export const serveConfig = defineConfig({
    plugins: pluginCtx => [
      usePrometheus({
        ...pluginCtx,

        // Enable all available metrics

  -     requestSummary: true,
  -     parse: true,
  -     validate: true,
  -     contextBuilding: true,
  -     execute: true,
  -     subscribe: true,
  -     errors: true,
  -     deprecatedFields: true,
  -     requestTotalDuration: true,
  -     schemaChangeCount: true,

        // Warning: enabling resolvers level metrics will introduce significant overhead
  -     resolvers: true,
  +     metrics: {
  +       graphql_envelop_request_time_summary: true,
  +       graphql_envelop_phase_parse: true,
  +       graphql_envelop_phase_validate: true,
  +       graphql_envelop_phase_context: true,
  +       graphql_envelop_phase_execute: true,
  +       graphql_envelop_phase_subscribe: true,
  +       graphql_envelop_error_result: true,
  +       graphql_envelop_deprecated_field: true,
  +       graphql_envelop_request_duration: true,
  +       graphql_envelop_schema_change: true,

          // Warning: enabling resolvers level metrics will introduce significant overhead
  +       graphql_envelop_execute_resolver: true,
  +     }
      })
    ]
  })
  ```

### Minor Changes

- [#2270](https://github.com/n1ru4l/envelop/pull/2270)
  [`73eb69f`](https://github.com/n1ru4l/envelop/commit/73eb69fd9d67b24d7598d1ce6195911688077c5d)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Add missing labels `path` and `phase`
  of `graphql_envelop_error_result` metric to the configuration.

## 10.0.0

### Major Changes

- [#2217](https://github.com/n1ru4l/envelop/pull/2217)
  [`7ac1d3c`](https://github.com/n1ru4l/envelop/commit/7ac1d3cd45fc715504c12812a83087d1fadad5b0)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Adds a cache for metrics definition
  (Summary, Histogram and Counter).

  Fixes an issue preventing this plugin to be initialized multiple times, leading to metrics
  duplication error (https://github.com/ardatan/graphql-mesh/issues/6545).

  ## Behavior Breaking Change:

  Due to Prometheus client API limitations, a metric is only defined once for a given registry. This
  means that if the configuration of the metrics, it will be silently ignored on plugin
  re-initialization.

  This is to avoid potential loss of metrics data produced between the plugin re-initialization and
  the last pull by the prometheus agent.

  If you need to be sure metrics configuration is up to date after a plugin re-initialization, you
  can either:
  - restart the whole node process instead of just recreating a graphql server at runtime
  - clear the registry using `registry.clear()` before plugin re-initialization:
    ```ts
    function usePrometheusWithReset() {
      registry.clear()
      return usePrometheus({ ... })
    }
    ```
  - use a new registry for each plugin instance:
    ```ts
    function usePrometheusWithRegistry() {
      const registry = new Registry()
      return usePrometheus({
        registry,
        ...
      })
    }
    ```

  Keep in mind that this implies potential data loss in pull mode.

  ## API Breaking Change:

  To ensure metrics from being registered multiple times on the same registry, the signature of
  `createHistogram`, `createSummary` and `createCounter` have been changed to now include the
  registry as a mandatory parameter.

  If you were customizing metrics parameters, you will need to update the metric definitions

  ```diff
  usePrometheus({
    execute: createHistogram({
  +   registry: registry
      histogram: new Histogram({
        name: 'my_custom_name',
        help: 'HELP ME',
        labelNames: ['opText'] as const,
  -     registers: [registry],
      }),
      fillLabelsFn: () => {}
    }),
    requestCount: createCounter({
  +   registry: registry
      histogram: new Histogram({
        name: 'my_custom_name',
        help: 'HELP ME',
        labelNames: ['opText'] as const,
  -     registers: [registry],
      }),
      fillLabelsFn: () => {}
    }),
    requestSummary: createSummary({
  +   registry: registry
      histogram: new Histogram({
        name: 'my_custom_name',
        help: 'HELP ME',
        labelNames: ['opText'] as const,
  -     registers: [registry],
      }),
      fillLabelsFn: () => {}
    }),
  })
  ```

### Patch Changes

- Updated dependencies
  [[`dc1222f`](https://github.com/n1ru4l/envelop/commit/dc1222f440942ec796d72fb7ff0c77e03d29c58b)]:
  - @envelop/core@5.0.1

## 9.4.0

### Minor Changes

- [`5667fc3`](https://github.com/n1ru4l/envelop/commit/5667fc33435e6ba834b44db461bbd801351488ce)
  Thanks [@ardatan](https://github.com/ardatan)! - Ability to change the name of the labels

## 9.3.1

### Patch Changes

- [`3dc808b`](https://github.com/n1ru4l/envelop/commit/3dc808bf4635d6a903ce1b073e592d63a06a0254)
  Thanks [@ardatan](https://github.com/ardatan)! - Remove unwanted labels from metrics

## 9.3.0

### Minor Changes

- [`37d4dac`](https://github.com/n1ru4l/envelop/commit/37d4dac030738709a8fb818c78fc517f2d2b2ed2)
  Thanks [@ardatan](https://github.com/ardatan)! - Support subscriptions

## 9.2.0

### Minor Changes

- [#2142](https://github.com/n1ru4l/envelop/pull/2142)
  [`4c11530`](https://github.com/n1ru4l/envelop/commit/4c115302d16fa6bf095f4397594d3b73ba3c532b)
  Thanks [@ardatan](https://github.com/ardatan)! - - Ability to hide operationName and operationType
  in the labels
  - Count schema changes
  - Catch errors during the context creation

## 9.1.0

### Patch Changes

- Updated dependencies
  [[`408f5be3`](https://github.com/n1ru4l/envelop/commit/408f5be3943775157c9ae29f0d9c7ee78c3c369e)]:
  - @envelop/on-resolve@4.1.0

## 9.0.0

### Major Changes

- [#1986](https://github.com/n1ru4l/envelop/pull/1986)
  [`68e7a2a5`](https://github.com/n1ru4l/envelop/commit/68e7a2a59a2f9872652b4bae28f30c3a2fb70487)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - **Breaking Change:** Support of Node 16
  is dropped.

- Updated dependencies
  [[`68e7a2a5`](https://github.com/n1ru4l/envelop/commit/68e7a2a59a2f9872652b4bae28f30c3a2fb70487),
  [`f7ef03c0`](https://github.com/n1ru4l/envelop/commit/f7ef03c07ae1af3abf08de86bc95fe626bbc7913)]:
  - @envelop/core@5.0.0

### Patch Changes

- [#1989](https://github.com/n1ru4l/envelop/pull/1989)
  [`fc7884fe`](https://github.com/n1ru4l/envelop/commit/fc7884fe69771196788e5b1653075a9ef9c29ddf)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`prom-client@^15.0.0` ↗︎](https://www.npmjs.com/package/prom-client/v/15.0.0) (from
    `^13 || ^14.0.0`, in `peerDependencies`)

- Updated dependencies
  [[`68e7a2a5`](https://github.com/n1ru4l/envelop/commit/68e7a2a59a2f9872652b4bae28f30c3a2fb70487)]:
  - @envelop/on-resolve@4.0.0

## 8.0.3

### Patch Changes

- [#1927](https://github.com/n1ru4l/envelop/pull/1927)
  [`e3c90116`](https://github.com/n1ru4l/envelop/commit/e3c9011640b73aaede4e5e472a5d45aab947165c)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency
    [`@envelop/on-resolve@^3.0.2` ↗︎](https://www.npmjs.com/package/@envelop/on-resolve/v/3.0.2)
    (from `^3.0.1`, in `dependencies`)
  - Updated dependency
    [`@envelop/core@^4.0.2` ↗︎](https://www.npmjs.com/package/@envelop/core/v/4.0.2) (from
    `^4.0.1`, in `peerDependencies`)

- Updated dependencies
  [[`dee6b8d2`](https://github.com/n1ru4l/envelop/commit/dee6b8d215f21301660090037b6685e86d217593)]:
  - @envelop/core@4.0.3
- Updated dependencies
  [[`e3c90116`](https://github.com/n1ru4l/envelop/commit/e3c9011640b73aaede4e5e472a5d45aab947165c)]:
  - @envelop/on-resolve@3.0.3

## 8.0.2

### Patch Changes

- Updated dependencies
  [[`db20864a`](https://github.com/n1ru4l/envelop/commit/db20864aac3fcede3e265ae63b2e8cb4664ba23a)]:
  - @envelop/core@4.0.2
- Updated dependencies []:
  - @envelop/on-resolve@3.0.2

## 8.0.1

### Patch Changes

- Updated dependencies []:
  - @envelop/core@4.0.1
- Updated dependencies []:
  - @envelop/on-resolve@3.0.1

## 8.0.0

### Major Changes

- [#1776](https://github.com/n1ru4l/envelop/pull/1776)
  [`332f1f22`](https://github.com/n1ru4l/envelop/commit/332f1f221f655421a850adb834afe549d50b4fac)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 and require Node 16 or higher

- Updated dependencies
  [[`332f1f22`](https://github.com/n1ru4l/envelop/commit/332f1f221f655421a850adb834afe549d50b4fac),
  [`a36925c7`](https://github.com/n1ru4l/envelop/commit/a36925c7df0538f88b51682e4e23f4b16f6fae2b)]:
  - @envelop/core@4.0.0

### Patch Changes

- Updated dependencies
  [[`332f1f22`](https://github.com/n1ru4l/envelop/commit/332f1f221f655421a850adb834afe549d50b4fac),
  [`7066ce98`](https://github.com/n1ru4l/envelop/commit/7066ce98df8e4ed18be618eb821ca50074557452)]:
  - @envelop/on-resolve@3.0.0

## 7.0.6

### Patch Changes

- [#1725](https://github.com/n1ru4l/envelop/pull/1725)
  [`c1eb2c09`](https://github.com/n1ru4l/envelop/commit/c1eb2c09ac535b076a5c13430c3892d98f7ef957)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - dependencies updates:
  - Updated dependency [`tslib@^2.5.0` ↗︎](https://www.npmjs.com/package/tslib/v/2.5.0) (from
    `^2.4.0`, in `dependencies`)

- Updated dependencies
  [[`c1eb2c09`](https://github.com/n1ru4l/envelop/commit/c1eb2c09ac535b076a5c13430c3892d98f7ef957)]:
  - @envelop/core@3.0.6
- Updated dependencies []:
  - @envelop/on-resolve@2.0.6

## 7.0.5

### Patch Changes

- Updated dependencies
  [[`270249cf`](https://github.com/n1ru4l/envelop/commit/270249cfb7650f8ad64f0167bb45a99475a03b04)]:
  - @envelop/core@3.0.5
- Updated dependencies []:
  - @envelop/on-resolve@2.0.5

## 7.0.4

### Patch Changes

- Updated dependencies []:
  - @envelop/core@3.0.4
- Updated dependencies []:
  - @envelop/on-resolve@2.0.4

## 7.0.3

### Patch Changes

- Updated dependencies
  [[`6b48ef96`](https://github.com/n1ru4l/envelop/commit/6b48ef962020eb7dfd2918626b8a394bff673e4f)]:
  - @envelop/core@3.0.3
- Updated dependencies []:
  - @envelop/on-resolve@2.0.3

## 7.0.2

### Patch Changes

- Updated dependencies
  [[`22f5ccfb`](https://github.com/n1ru4l/envelop/commit/22f5ccfbe69eb052cda6c1908425b63e3d906243)]:
  - @envelop/core@3.0.2
- Updated dependencies []:
  - @envelop/on-resolve@2.0.2

## 7.0.0

### Major Changes

- Updated dependencies
  [[`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f),
  [`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f)]:
  - @envelop/core@3.0.0

### Patch Changes

- Updated dependencies
  [[`dc1e24b5`](https://github.com/n1ru4l/envelop/commit/dc1e24b5340ed7eba300a702b17f9be5cff65a8f)]:
  - @envelop/on-resolve@2.0.0

## 6.6.0

### Minor Changes

- [#1499](https://github.com/n1ru4l/envelop/pull/1499)
  [`1f7af02b`](https://github.com/n1ru4l/envelop/commit/1f7af02b9f1a16058a6d69fcd48425a93be655c6)
  Thanks [@viniciuspalma](https://github.com/viniciuspalma)! - Adding tslib to package dependencies

  Projects that currently are using yarn Berry with PnP or any strict dependency resolver, that
  requires that all dependencies are specified on package.json otherwise it would endue in an error
  if not treated correct

  Since https://www.typescriptlang.org/tsconfig#importHelpers is currently being used, tslib should
  be exported as a dependency to external runners get the proper import.

  Change on each package:

  ```json
  // package.json
  {
    "dependencies": {
      "tslib": "^2.4.0"
    }
  }
  ```

- Updated dependencies
  [[`1f7af02b`](https://github.com/n1ru4l/envelop/commit/1f7af02b9f1a16058a6d69fcd48425a93be655c6),
  [`ae7bc9a3`](https://github.com/n1ru4l/envelop/commit/ae7bc9a36abd595b0a91f7b4e133017d3eb99a4a)]:
  - @envelop/core@2.6.0

## 6.5.0

### Minor Changes

- Updated dependencies
  [[`5a5f5c04`](https://github.com/n1ru4l/envelop/commit/5a5f5c04177b9e1379fd77db5d6383160879d449),
  [`d828f129`](https://github.com/n1ru4l/envelop/commit/d828f1291254a0f9dfdc3654611087859e4c9708)]:
  - @envelop/core@2.5.0

## 6.4.2

### Patch Changes

- 071f946: Fix CommonJS TypeScript resolution with `moduleResolution` `node16` or `nodenext`
- Updated dependencies [071f946]
  - @envelop/core@2.4.2

## 6.4.1

### Patch Changes

- Updated dependencies [787d28a2]
  - @envelop/core@2.4.1

## 6.4.0

### Minor Changes

- 8bb2738: Support TypeScript module resolution.
- Updated dependencies [8bb2738]
  - @envelop/core@2.4.0

## 6.3.3

### Patch Changes

- fbf6155: update package.json repository links to point to the new home
- Updated dependencies [fbf6155]
  - @envelop/core@2.3.3

## 6.3.2

### Patch Changes

- Updated dependencies [07d029b]
  - @envelop/core@2.3.2

## 6.3.1

### Patch Changes

- Updated dependencies [d5c2c9a]
  - @envelop/core@2.3.1

## 6.3.0

### Minor Changes

- Updated dependencies [af23408]
  - @envelop/core@2.3.0

## 6.2.0

### Minor Changes

- Updated dependencies [ada7fb0]
- Updated dependencies [d5115b4]
- Updated dependencies [d5115b4]
  - @envelop/core@2.2.0

## 6.1.0

### Minor Changes

- Updated dependencies [78b3db2]
- Updated dependencies [f5eb436]
  - @envelop/core@2.1.0

## 6.0.1

### Patch Changes

- f102d38: move `@envelop/core` dependency to peerDependencies

## 6.0.0

### Patch Changes

- Updated dependencies [4106e08]
- Updated dependencies [aac65ef]
- Updated dependencies [4106e08]
  - @envelop/core@2.0.0

## 5.0.0

### Patch Changes

- Updated dependencies [d9cfb7c]
  - @envelop/core@1.7.0

## 4.2.1

### Patch Changes

- b1a0331: Properly list `@envelop/core` as a `peerDependency` in plugins.

  This resolves issues where the bundled envelop plugins published to npm had logic inlined from the
  `@envelop/core` package, causing `instanceof` check of `EnvelopError` to fail.

- Updated dependencies [b1a0331]
  - @envelop/core@1.6.1

## 4.2.0

### Minor Changes

- 090cae4: GraphQL v16 support

## 4.1.0

### Minor Changes

- 04120de: add support for GraphQL.js 16

## 4.0.0

### Patch Changes

- Updated dependencies [d65e35d]
- Updated dependencies [26475c9]
  - @envelop/core@1.3.0

## 3.0.0

### Patch Changes

- Updated dependencies [eb0a4bd]
  - @envelop/core@1.2.0

## 2.0.0

### Patch Changes

- Updated dependencies [7704fc3]
- Updated dependencies [7704fc3]
- Updated dependencies [7704fc3]
  - @envelop/core@1.1.0

## 1.0.3

### Patch Changes

- 452af8f: Update dependencies of graphql-tools to latest
- Updated dependencies [452af8f]
  - @envelop/core@1.0.3

## 1.0.2

### Patch Changes

- 94db02d: Update usage of plugins to use the correct `isAsyncIterable` and new helper
  `handleStreamOrSingleExecutionResult`
- Updated dependencies [94db02d]
- Updated dependencies [94db02d]
  - @envelop/core@1.0.2

## 1.0.1

### Patch Changes

- 8021229: fix ESM graphql import
- Updated dependencies [c24a8fd]
- Updated dependencies [f45c0bf]
- Updated dependencies [8021229]
- Updated dependencies [adca399]
  - @envelop/core@1.0.1

## 1.0.0

### Major Changes

- 40bc444: v1 major release for envelop packages

### Patch Changes

- Updated dependencies [dbb241d]
- Updated dependencies [40bc444]
  - @envelop/core@1.0.0

## 0.2.0

### Minor Changes

- e151100: Add support for tracking amount of requests
- e151100: Expose entire `context` object as part of the FillParams fn
- e151100: Added option to skipIntrospection
- e151100: Add support for tracking total "graphql" time

### Patch Changes

- e151100: Set the defualt options to `{}`
- e151100: Use static checking with TypeInfo for "deprecatedFields" counter
- e151100: Fix issues with serialized [Object object] in some built-ins
- e151100: Cleanup, fix some implementation details

## 0.1.0

### Minor Changes

- ccc6cfa: New plugin for prometheus metrics
