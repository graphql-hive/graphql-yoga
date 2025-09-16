# @graphql-yoga/redis-event-target

## 3.0.3

### Patch Changes

- Updated dependencies
  [[`d4cbae1`](https://github.com/dotansimha/graphql-yoga/commit/d4cbae12348a39a2f64d7048dc582ebbaac93a5b)]:
  - @graphql-yoga/typed-event-target@3.0.2

## 3.0.2

### Patch Changes

- Updated dependencies
  [[`57e7701`](https://github.com/dotansimha/graphql-yoga/commit/57e7701dd62495cee224d71ad55f726740a38cdd)]:
  - @graphql-yoga/typed-event-target@3.0.1

## 3.0.1

### Patch Changes

- [#3300](https://github.com/dotansimha/graphql-yoga/pull/3300)
  [`fdd902c`](https://github.com/dotansimha/graphql-yoga/commit/fdd902c2a713c6bd951e1b1e6570164b6ff2d546)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - dependencies updates:
  - Updated dependency
    [`@graphql-yoga/typed-event-target@workspace:^` ↗︎](https://www.npmjs.com/package/@graphql-yoga/typed-event-target/v/workspace:^)
    (from `^3.0.0`, in `dependencies`)

## 3.0.0

### Major Changes

- [#3063](https://github.com/dotansimha/graphql-yoga/pull/3063)
  [`01430e03`](https://github.com/dotansimha/graphql-yoga/commit/01430e03288f072a9cb09b0b898316b1f5b58a5f)
  Thanks [@EmrysMyrddin](https://github.com/EmrysMyrddin)! - **Breaking Change:** Drop support of
  Node.js 16

### Minor Changes

- [#3037](https://github.com/dotansimha/graphql-yoga/pull/3037)
  [`8d143e4e`](https://github.com/dotansimha/graphql-yoga/commit/8d143e4ee18d24eec20dbdacc554e9ae336460aa)
  Thanks [@Akryum](https://github.com/Akryum)! - Added `serializeMessage` and `deserializeMessage`
  options to `createRedisEventTarget`

### Patch Changes

- Updated dependencies
  [[`01430e03`](https://github.com/dotansimha/graphql-yoga/commit/01430e03288f072a9cb09b0b898316b1f5b58a5f)]:
  - @graphql-yoga/typed-event-target@3.0.0

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

### Patch Changes

- Updated dependencies
  [[`4228c1d5`](https://github.com/dotansimha/graphql-yoga/commit/4228c1d54ed785fac1fb9669d861ed46659872ca),
  [`4228c1d5`](https://github.com/dotansimha/graphql-yoga/commit/4228c1d54ed785fac1fb9669d861ed46659872ca)]:
  - @graphql-yoga/typed-event-target@2.0.0

## 1.0.0

### Major Changes

- [#1761](https://github.com/dotansimha/graphql-yoga/pull/1761)
  [`b2407c6a`](https://github.com/dotansimha/graphql-yoga/commit/b2407c6addab136e3390bd4efa1fbbad7eb8dab8)
  Thanks [@ardatan](https://github.com/ardatan)! - - Drop `TypedEvent` in favor of
  [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent)
  - Use `@whatwg-node/events` as a ponyfill instead of `@whatwg-node/fetch`

### Patch Changes

- Updated dependencies
  [[`b2407c6a`](https://github.com/dotansimha/graphql-yoga/commit/b2407c6addab136e3390bd4efa1fbbad7eb8dab8)]:
  - @graphql-yoga/typed-event-target@1.0.0

## 1.0.0-next.0

### Major Changes

- [#1761](https://github.com/dotansimha/graphql-yoga/pull/1761)
  [`b2407c6a`](https://github.com/dotansimha/graphql-yoga/commit/b2407c6addab136e3390bd4efa1fbbad7eb8dab8)
  Thanks [@ardatan](https://github.com/ardatan)! - **BREAKING**:

  - Drop `TypedEvent` in favor of
    [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent)
  - Use `@whatwg-node/events` as a ponyfill instead of `@whatwg-node/fetch`

### Patch Changes

- Updated dependencies
  [[`b2407c6a`](https://github.com/dotansimha/graphql-yoga/commit/b2407c6addab136e3390bd4efa1fbbad7eb8dab8)]:
  - @graphql-yoga/typed-event-target@1.0.0-next.0

## 0.1.3

### Patch Changes

- eecf24c: Fix CommonJS TypeScript resolution with `moduleResolution` `node16` or `nodenext`
- Updated dependencies [eecf24c]
  - @graphql-yoga/typed-event-target@0.1.1

## 0.1.2

### Patch Changes

- 3363de2: Use `import type { Foo } from '@pkg'` instead of `import { type Foo } from '@pkg'` as
  many tools don't yet support this syntax.

## 0.1.1

### Patch Changes

- ebddc71: Correctly handle empty ('undefined') payloads.

## 0.1.0

### Minor Changes

- d024757: Initial release of this package. It contains an EventTarget implementation based upon
  Redis Pub/Sub using ioredis.

### Patch Changes

- Updated dependencies [d024757]
  - @graphql-yoga/typed-event-target@0.1.0
