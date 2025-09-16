# @graphql-yoga/typed-event-target

## 3.0.2

### Patch Changes

- [#3660](https://github.com/dotansimha/graphql-yoga/pull/3660)
  [`d4cbae1`](https://github.com/dotansimha/graphql-yoga/commit/d4cbae12348a39a2f64d7048dc582ebbaac93a5b)
  Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:
  - Updated dependency [`tslib@^2.8.1` ↗︎](https://www.npmjs.com/package/tslib/v/2.8.1) (from
    `^2.5.2`, in `dependencies`)

## 3.0.1

### Patch Changes

- [#3532](https://github.com/dotansimha/graphql-yoga/pull/3532)
  [`57e7701`](https://github.com/dotansimha/graphql-yoga/commit/57e7701dd62495cee224d71ad55f726740a38cdd)
  Thanks [@ardatan](https://github.com/ardatan)! - Improve typings for `TypedEventTarget<TEvent>`,
  so `addEventListener` and `removeEventListener` methods now expect `type` to be the `type`
  property of `TEvent`, and `dispatchEvent` expects to get `TEvent`.

## 3.0.0

### Major Changes

- [#3063](https://github.com/dotansimha/graphql-yoga/pull/3063)
  [`01430e03`](https://github.com/dotansimha/graphql-yoga/commit/01430e03288f072a9cb09b0b898316b1f5b58a5f)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - **Breaking Change:** Drop support of
  Node.js 16

## 2.0.0

### Major Changes

- [#2767](https://github.com/dotansimha/graphql-yoga/pull/2767)
  [`4228c1d5`](https://github.com/dotansimha/graphql-yoga/commit/4228c1d54ed785fac1fb9669d861ed46659872ca)
  Thanks [@renovate](https://github.com/apps/renovate)! - Drop support for Node.js 14. Require
  Node.js `>=16`.

- [#2767](https://github.com/dotansimha/graphql-yoga/pull/2767)
  [`4228c1d5`](https://github.com/dotansimha/graphql-yoga/commit/4228c1d54ed785fac1fb9669d861ed46659872ca)
  Thanks [@renovate](https://github.com/apps/renovate)! - Events without an event payload will now
  always have `null` as the event payload instead of `undefined`.

## 1.0.0

### Major Changes

- [#1761](https://github.com/dotansimha/graphql-yoga/pull/1761)
  [`b2407c6a`](https://github.com/dotansimha/graphql-yoga/commit/b2407c6addab136e3390bd4efa1fbbad7eb8dab8)
  Thanks [@ardatan](https://github.com/ardatan)! - - Drop `TypedEvent` in favor of
  [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent)
  - Use `@whatwg-node/events` as a ponyfill instead of `@whatwg-node/fetch`

## 1.0.0-next.0

### Major Changes

- [#1761](https://github.com/dotansimha/graphql-yoga/pull/1761)
  [`b2407c6a`](https://github.com/dotansimha/graphql-yoga/commit/b2407c6addab136e3390bd4efa1fbbad7eb8dab8)
  Thanks [@ardatan](https://github.com/ardatan)! - **BREAKING**:

  - Drop `TypedEvent` in favor of
    [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent)
  - Use `@whatwg-node/events` as a ponyfill instead of `@whatwg-node/fetch`

## 0.1.1

### Patch Changes

- eecf24c: Fix CommonJS TypeScript resolution with `moduleResolution` `node16` or `nodenext`

## 0.1.0

### Minor Changes

- d024757: Initial release of this package. It contains an EventTarget implementation with generic
  typings.
