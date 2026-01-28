## `@envelop/statsd`

This plugin tracks the complete execution flow, and reports metrics using StatsD (based on
`hot-shots`).

Compatible with:

- Datadog's DogStatsD server
- InfluxDB's Telegraf StatsD server
- Etsy's StatsD serve

Available metrics:

- `graphql.operations.count` - the number of performed operations (including failures)
- `graphql.operations.error_count` - the number of failed operations
- `graphql.operations.latency` - a histogram of response times (in milliseconds)

> You can also customize the `graphql` prefix and add custom tags to the metrics.

## Getting Started

```
yarn add hot-shots @envelop/statsd
```

## Usage Example

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import StatsD from 'hot-shots'
import { envelop, useEngine } from '@envelop/core'
import { useStatsD } from '@envelop/statsd'

const client = new StatsD({
  port: 8020,
  globalTags: { env: process.env.NODE_ENV }
})

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    // ... other plugins ...
    useStatsD({
      client,
      prefix: 'gql', // results in `gql.operations.count` instead of `graphql.operations.count`,
      skipIntrospection: true // if you wish to disable introspection logging
    })
  ]
})
```
