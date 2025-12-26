# @envelop/types

## 5.2.1

### Patch Changes

- [#2486](https://github.com/n1ru4l/envelop/pull/2486)
  [`914f9ed`](https://github.com/n1ru4l/envelop/commit/914f9ed3b753f771d938b4beb8fd31753b48771e)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - Fix the name of the new envelop
  instrumentation API

## 5.2.0

### Minor Changes

- [#2430](https://github.com/n1ru4l/envelop/pull/2430)
  [`a107c89`](https://github.com/n1ru4l/envelop/commit/a107c896d7a7b1af7417ed0708be336db2ecbb54)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - ## New `Instruments` API

  Introducation of a new API allowing to instrument the graphql pipeline.

  This new API differs from already existing Hooks by not having access to intup/output of phases.
  The goal of `Instruments` is to run allow running code before, after or araound the **whole
  process of a phase**, incuding plugins hooks executions.

  The main use case of this new API is observability (monitoring, tracing, etc...).

  ### Basic usage

  ```ts
  import { envelop } from '@envelop/core'
  import Sentry from '@sentry/node'

  const getEnveloped = envelop({
    plugins: [
      {
        instruments: {
          execute: ({ context }, wrapped) =>
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

  ### Mutliple instruments plugins

  It is possilbe to have multiple instruments plugins (Prometheus and Sentry for example), they will
  be automatically composed by envelop in the same order than the plugin array (first is outtermost,
  last is inner most).

  ```ts
  import { useOpentelemetry } from '@envelop/opentelemetry'
  import { useSentry } from '@envelop/sentry'

  const getEnveloped = envelop({
    plugins: [useSentry(), useOpentelemetry()]
  })
  ```

  ```mermaid
  sequenceDiagram
    Sentry->>Opentelemetry: ;
    Opentelemetry->>Envelop: ;
    Envelop->>Opentelemetry: ;
    Opentelemetry->>Sentry: ;
  ```

  ### Custom instruments ordering

  If the default composition ordering doesn't suite your need, you can mannually compose
  instruments. This allows to have a different execution order of hooks and instruments.

  ```ts
  import { useOpentelemetry } from '@envelop/opentelemetry'
  import { composeInstruments, useSentry } from '@envelop/sentry'

  const { instruments: sentryInstruments, ...sentryPlugin } = useSentry()
  const { instruments: otelInstruments, ...otelPlugin } = useOpentelemetry()
  const instruments = composeInstruments([otelInstruments, sentryInstruments])

  const getEnveloped = envelop({
    plugins: [{ instruments }, sentryPlugin, otelPlugin]
  })
  ```

  ```mermaid
  sequenceDiagram
    Opentelemetry->>Sentry: ;
    Sentry->>Envelop: ;
    Envelop->>Sentry: ;
    Sentry->>Opentelemetry: ;
  ```

## 5.1.1

### Patch Changes

- [#2455](https://github.com/n1ru4l/envelop/pull/2455)
  [`5b6a166`](https://github.com/n1ru4l/envelop/commit/5b6a166f5e2c12e6aa4679eb4e3209de43b0efc1)
  Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:
  - Added dependency
    [`@whatwg-node/promise-helpers@^1.0.0` ↗︎](https://www.npmjs.com/package/@whatwg-node/promise-helpers/v/1.0.0)
    (to `dependencies`)

## 5.1.0

### Minor Changes

- [#2438](https://github.com/n1ru4l/envelop/pull/2438)
  [`9bd1b20`](https://github.com/n1ru4l/envelop/commit/9bd1b207861540f9bee085026b9fab725a88e84e)
  Thanks [@ardatan](https://github.com/ardatan)! - Add `context` field to `onExecute` and
  `onSubscribe` hooks payloads. This harmonize all the hooks invovled in the handling of a graphql
  operation.

## 5.0.0

### Major Changes

- [#1986](https://github.com/n1ru4l/envelop/pull/1986)
  [`68e7a2a5`](https://github.com/n1ru4l/envelop/commit/68e7a2a59a2f9872652b4bae28f30c3a2fb70487)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - **Breaking Change:** Support of Node 16
  is dropped.

## 4.0.1

### Patch Changes

- [#1896](https://github.com/n1ru4l/envelop/pull/1896)
  [`834e1e39`](https://github.com/n1ru4l/envelop/commit/834e1e396c5f4b055fce52e61927a99cde6f7a6c)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - add support for @defer and @stream

## 4.0.0

### Major Changes

- [#1776](https://github.com/n1ru4l/envelop/pull/1776)
  [`332f1f22`](https://github.com/n1ru4l/envelop/commit/332f1f221f655421a850adb834afe549d50b4fac)
  Thanks [@ardatan](https://github.com/ardatan)! - Drop Node 14 and require Node 16 or higher

## 3.0.2

### Patch Changes

- [#1725](https://github.com/n1ru4l/envelop/pull/1725)
  [`c1eb2c09`](https://github.com/n1ru4l/envelop/commit/c1eb2c09ac535b076a5c13430c3892d98f7ef957)
  Thanks [@n1ru4l](https://github.com/n1ru4l)! - dependencies updates:

  - Updated dependency [`tslib@^2.5.0` ↗︎](https://www.npmjs.com/package/tslib/v/2.5.0) (from
    `^2.4.0`, in `dependencies`)

## 3.0.1

### Patch Changes

- [#1587](https://github.com/n1ru4l/envelop/pull/1587)
  [`e2ff77ed`](https://github.com/n1ru4l/envelop/commit/e2ff77edbc8c38d2854fc019f1d71ad4cf948d5f)
  Thanks [@enisdenjo](https://github.com/enisdenjo)! - Don't use `Id` TypeScript generic utility
  that can cause a circular constraint error

## 2.4.0

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

## 2.3.1

### Patch Changes

- 071f946: Fix CommonJS TypeScript resolution with `moduleResolution` `node16` or `nodenext`

## 2.3.0

### Minor Changes

- 8bb2738: Support TypeScript module resolution.

## 2.2.1

### Patch Changes

- fbf6155: update package.json repository links to point to the new home

## 2.2.0

### Minor Changes

- af23408: Pass context to registerContextErrorHandler

  ```ts
  export const useMyHook = (): Plugin => {
    return {
      onPluginInit(context) {
        context.registerContextErrorHandler(({ context }) => {
          console.error(
            'Error occurred during context creation but at least I have the  context so far',
            context
          )
        })
      }
    }
  }
  ```

## 2.1.0

### Minor Changes

- d5115b4: add `setResult` to `AfterValidateEventPayload` for altering the validation errors.

## 2.0.0

### Major Changes

- aac65ef: Move `onResolverCalled` from within `OnExecuteHookResult` and `OnSubscribeHookResult` to
  the `Plugin` type.

  ```diff
  import type { Plugin } from "@envelop/core";

  const plugin: Plugin = {
    onExecute() {
  -    return {
  -      onResolverCalled() {}
  -    }
  -  }
  +  },
  +  onResolverCalled() {},
  }
  ```

  We highly recommend avoiding to use any plugins that use `onResolverCalled` within your production
  environment as it has severe impact on the performance of the individual resolver functions within
  your schema.

  The schema resolver functions are now ONLY wrapped if any plugin in your envelop setup uses the
  `onResolverCalled` hook.

  If you need any shared state between `onExecute` and `onResolverCalled` you can share it by
  extending the context object.

  ```ts
  import type { Plugin } from '@envelop/core'

  const sharedStateSymbol = Symbol('sharedState')

  const plugin: Plugin = {
    onExecute({ extendContext }) {
      extendContext({ [sharedStateSymbol]: { value: 1 } })
    },
    onResolverCalled({ context }) {
      const sharedState = context[sharedStateSymbol]
      // logs 1
      console.log(sharedState.value)
    }
  }
  ```

### Minor Changes

- 4106e08: Add new option `breakContextBuilding` to `OnContextBuildingEventPayload`.

  This allows short-circuiting the context building phase. Please use this with care as careless
  usage of it can result in severe errors during the execution phase, as the context might not
  include all the fields your schema resolvers need.

## 1.5.1

### Patch Changes

- b1a0331: Properly list `@envelop/core` as a `peerDependency` in plugins.

  This resolves issues where the bundled envelop plugins published to npm had logic inlined from the
  `@envelop/core` package, causing `instanceof` check of `EnvelopError` to fail.

## 1.5.0

### Minor Changes

- 090cae4: GraphQL v16 support

## 1.4.0

### Minor Changes

- 04120de: add support for GraphQL.js 16

## 1.3.0

### Minor Changes

- 365a982: Allow async OnExecuteDone hook

## 1.2.0

### Minor Changes

- d65e35d: add enableIf utility to enable plugins conditionally
- 26475c9: useErrorHandler: Pass in the execution arguments to the error handler callbacks.

## 1.1.0

### Minor Changes

- 7704fc3: Add API for registering a context creation error handler.

  ```ts
  export const useMyHook = (): Plugin => {
    return {
      onPluginInit(context) {
        context.registerContextErrorHandler(({ error, setError }) => {
          console.error('Error occurred during context creation.', error)
          setError(new Error('Something went wrong :('))
        })
      }
    }
  }
  ```

## 1.0.2

### Patch Changes

- 94db02d: Added new helper `handleStreamOrSingleExecutionResult`
- 94db02d: Update usage of plugins to use the correct `isAsyncIterable` and new helper
  `handleStreamOrSingleExecutionResult`

## 1.0.1

### Patch Changes

- c24a8fd: re-use graphql "execute" & "subscribe" types
- adca399: add jsdoc comments for hook types

## 1.0.0

### Major Changes

- 40bc444: v1 major release for envelop packages

### Minor Changes

- dbb241d: allow hooking into published subscribe values

## 0.4.2

### Patch Changes

- a7321e1: Fix issues with compiled d.ts

## 0.4.1

### Patch Changes

- 932f6a8: Added better type-safety for contextValue in OnExecute hook

## 0.4.0

### Minor Changes

- 50dffaa: Added new hook for onEnveloped

### Patch Changes

- 778c207: Better type safety for OnEnveloped hook

## 0.3.0

### Minor Changes

- 2113527: Extend Envelop plugin API with the ability to access and replace resolver function

### Patch Changes

- 28ad742: Improve TypeScript types

## 0.2.1

### Patch Changes

- 7f4901d: Fix issues with contextFactory and missing context coming from GraphQL pipeline
  orchestrator

## 0.2.0

### Minor Changes

- a5bee94: \* Allow access to context in all phases
  - Improve usage of `getEnveloped` function and allow to pass initial context there
- eb6f53b: ESM Support for all plugins and envelop core

## 0.1.4

### Patch Changes

- ced704e: Allow plugins to stop execution and return errors

## 0.1.3

### Patch Changes

- 5fc65a4: Improve type safety for plugins context

## 0.1.2

### Patch Changes

- f5177eb: Added `setResult` to the result of onResolverCalled

## 0.1.1

### Patch Changes

- 925a1ea: Extend `onSchemaChange` and allow to override schema. Make sure to avoid infinite loops.

## 0.1.0

### Minor Changes

- 2fba0b4: Initial version bump

## 0.0.2

### Patch Changes

- b1333b0: Initial packages release

## 0.0.1

### Patch Changes

- c499ae8: First bump as envelop
- 2cfc726: Fixes
