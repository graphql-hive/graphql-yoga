## `@envelop/prometheus`

This plugin tracks the complete execution flow, and reports metrics using Prometheus tracing (based
on `prom-client`).

You can opt-in to collect tracing from the following phases:

- Successful requests (`requestCount`)
- Request summary (`requestSummary`)
- errors (categorized by `phase`)
- resolvers tracing and runtime
- deprecated fields usage
- count of graphql operations
- `parse` execution time
- `validate` execution time
- `contextBuilding` execution time
- `execute` execution time

> You can also customize each phase reporter, and add custom metadata and labels to the metrics.

## Getting Started

```
yarn add prom-client @envelop/prometheus
```

## Usage Example

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { usePrometheus } from '@envelop/prometheus'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    // ... other plugins ...
    usePrometheus({
      // all metrics are disabled by default, please opt-in to the metrics you wish to get
      metrics: {
        graphql_envelop_request_time_summary: true,
        graphql_envelop_phase_parse: true,
        graphql_envelop_phase_validate: true,
        graphql_envelop_phase_context: true,
        graphql_envelop_phase_execute: true,
        graphql_envelop_phase_subscribe: true,
        graphql_envelop_error_result: true,
        graphql_envelop_deprecated_field: true,
        graphql_envelop_request_duration: true,
        graphql_envelop_schema_change: true,
        graphql_envelop_request: true,

        // Warning: enabling resolvers level metrics will introduce significant overhead
        graphql_envelop_execute_resolver: true
      },

      resolversWhitelist: ['Mutation.*', 'Query.user'] // reports metrics for these resolvers, leave `undefined` to report all fields
    })
  ]
})
```

## Available Metrics

All metrics are disabled by default. You can enable the one you are interested in by setting the
corresponding key in the `metric` option object to `true`. You can also provide a string to
customize the metric name, or an object to provide more options by using `createHistogram`,
`createCounter` and `createSummary` (see
[`siimon/prom-client` documentation](https://github.com/siimon/prom-client#custom-metrics)).
Histogram metrics can be passed an array of numbers to configure buckets.

Each metric also expose a set of labels. All labels are exposed by default but can be separately
disabled by setting the corresponding key in `labels` option object to `false`.

A metric can observe events in different phases of of GraphQL request pipeline. By default, if a
metric is available, it will observe timing or events in every available phases for this metric. You
can configure this by either providing an array instead of `true` in the metrics config, or use the
`phases` option in the custom metric factory.

### `graphql_envelop_phase_parse`

This metric tracks the duration of the `parse` phase of the GraphQL execution. It reports the time
spent parsing the incoming GraphQL operation.

It is reported as a [histogram](https://prometheus.io/docs/concepts/metric_types/#histogram).

Since you don't have control over the parsing phase, this metric is mostly useful to track potential
attacks. A spike in this metric could indicate someone is trying to send malicious operations to
your gateway.

#### Labels

| Label           | Description                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `operationType` | The type of the GraphQL operation requested. This can be one of `query`, `mutation`, or `subscription`. |
| `operationName` | The name of the GraphQL operation requested. It will be `Anonymous` if no `operationName` is found.     |

#### Sample Output

```text
# HELP graphql_envelop_phase_parse Time spent on running GraphQL "parse" function
# TYPE graphql_envelop_phase_parse histogram
graphql_envelop_phase_parse_bucket{le="0.005",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_parse_bucket{le="0.01",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_parse_bucket{le="0.025",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_parse_bucket{le="0.05",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_parse_bucket{le="0.1",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_parse_bucket{le="0.25",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_parse_bucket{le="0.5",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_parse_bucket{le="1",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_parse_bucket{le="2.5",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_parse_bucket{le="5",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_parse_bucket{le="10",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_parse_bucket{le="+Inf",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_parse_sum{operationName="Anonymous",operationType="query"} 0.001
graphql_envelop_phase_parse_count{operationName="Anonymous",operationType="query"} 1
```

### `graphql_envelop_phase_validate`

This metric tracks the duration of the `validate` phase of the GraphQL execution. It reports the
time spent validating the incoming GraphQL operation.

It is reported as a [histogram](https://prometheus.io/docs/concepts/metric_types/#histogram).

#### Labels

| Label           | Description                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `operationType` | The type of the GraphQL operation requested. This can be one of `query`, `mutation`, or `subscription`. |
| `operationName` | The name of the GraphQL operation requested. It will be `Anonymous` if no `operationName` is found.     |

#### Sample Output

```text
# HELP graphql_envelop_phase_validate Time spent on running GraphQL "validate" function
# TYPE graphql_envelop_phase_validate histogram
graphql_envelop_phase_validate_bucket{le="0.005",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_validate_bucket{le="0.01",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_validate_bucket{le="0.025",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_validate_bucket{le="0.05",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_validate_bucket{le="0.1",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_validate_bucket{le="0.25",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_validate_bucket{le="0.5",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_validate_bucket{le="1",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_validate_bucket{le="2.5",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_validate_bucket{le="5",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_validate_bucket{le="10",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_validate_bucket{le="+Inf",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_validate_sum{operationName="Anonymous",operationType="query"} 0.004
graphql_envelop_phase_validate_count{operationName="Anonymous",operationType="query"} 1
```

### `graphql_envelop_phase_context`

This metric tracks the duration of the `context` phase of the GraphQL execution. It reports the time
spent building the context object that will be passed to the executors.

It is reported as a [histogram](https://prometheus.io/docs/concepts/metric_types/#histogram).

#### Labels

| Label           | Description                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `operationType` | The type of the GraphQL operation requested. This can be one of `query`, `mutation`, or `subscription`. |
| `operationName` | The name of the GraphQL operation requested. It will be `Anonymous` if no `operationName` is found.     |

#### Sample Output

```text
# HELP graphql_envelop_phase_context Time spent on building the GraphQL context
# TYPE graphql_envelop_phase_context histogram
graphql_envelop_phase_context_bucket{le="0.005",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_context_bucket{le="0.01",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_context_bucket{le="0.025",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_context_bucket{le="0.05",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_context_bucket{le="0.1",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_context_bucket{le="0.25",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_context_bucket{le="0.5",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_context_bucket{le="1",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_context_bucket{le="2.5",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_context_bucket{le="5",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_context_bucket{le="10",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_context_bucket{le="+Inf",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_context_sum{operationName="Anonymous",operationType="query"} 0
graphql_envelop_phase_context_count{operationName="Anonymous",operationType="query"} 1
```

### `graphql_envelop_phase_execute`

This metric tracks the duration of the `execute` phase of the GraphQL execution. It reports the time
spent actually resolving the response of the incoming operation. This includes the gathering of all
the data from all sources required to construct the final response. It is reported as a
[histogram](https://prometheus.io/docs/concepts/metric_types/#histogram).

It is the metric that will give you the most insights into the performance of your own code, since
this is where most of the work from your code (resolvers) is done.

#### Labels

| Label           | Description                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `operationType` | The type of the GraphQL operation requested. This can be one of `query`, `mutation`, or `subscription`. |
| `operationName` | The name of the GraphQL operation requested. It will be `Anonymous` if no `operationName` is found.     |

#### Sample Output

```text
# HELP graphql_envelop_phase_execute Time spent on running the GraphQL "execute" function
# TYPE graphql_envelop_phase_execute histogram
graphql_envelop_phase_execute_bucket{le="0.005",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_execute_bucket{le="0.01",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_execute_bucket{le="0.025",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_execute_bucket{le="0.05",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_execute_bucket{le="0.1",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_execute_bucket{le="0.25",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_execute_bucket{le="0.5",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_execute_bucket{le="1",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_execute_bucket{le="2.5",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_execute_bucket{le="5",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_execute_bucket{le="10",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_execute_bucket{le="+Inf",operationName="Anonymous",operationType="query"} 1
graphql_envelop_phase_execute_sum{operationName="Anonymous",operationType="query"} 0.002
graphql_envelop_phase_execute_count{operationName="Anonymous",operationType="query"} 1
```

### `graphql_envelop_phase_subscribe`

This metric tracks the duration of the `subscribe` phase of the GraphQL execution. It reports the
time spent initiating a subscription (which doesn't include actually sending the first response).

It is reported as a [histogram](https://prometheus.io/docs/concepts/metric_types/#histogram).

#### Labels

| Label           | Description                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `operationType` | The type of the GraphQL operation requested. This can be one of `query`, `mutation`, or `subscription`. |
| `operationName` | The name of the GraphQL operation requested. It will be `Anonymous` if no `operationName` is found.     |

#### Sample Output

```text
# HELP graphql_envelop_phase_subscribe Time spent on running the GraphQL "subscribe" function
# TYPE graphql_envelop_phase_subscribe histogram
graphql_envelop_phase_subscribe_bucket{le="0.005",operationName="Anonymous",operationType="subscription"} 0
graphql_envelop_phase_subscribe_bucket{le="0.01",operationName="Anonymous",operationType="subscription"} 0
graphql_envelop_phase_subscribe_bucket{le="0.025",operationName="Anonymous",operationType="subscription"} 1
graphql_envelop_phase_subscribe_bucket{le="0.05",operationName="Anonymous",operationType="subscription"} 1
graphql_envelop_phase_subscribe_bucket{le="0.1",operationName="Anonymous",operationType="subscription"} 1
graphql_envelop_phase_subscribe_bucket{le="0.25",operationName="Anonymous",operationType="subscription"} 1
graphql_envelop_phase_subscribe_bucket{le="0.5",operationName="Anonymous",operationType="subscription"} 1
graphql_envelop_phase_subscribe_bucket{le="1",operationName="Anonymous",operationType="subscription"} 1
graphql_envelop_phase_subscribe_bucket{le="2.5",operationName="Anonymous",operationType="subscription"} 1
graphql_envelop_phase_subscribe_bucket{le="5",operationName="Anonymous",operationType="subscription"} 1
graphql_envelop_phase_subscribe_bucket{le="10",operationName="Anonymous",operationType="subscription"} 1
graphql_envelop_phase_subscribe_bucket{le="+Inf",operationName="Anonymous",operationType="subscription"} 1
graphql_envelop_phase_subscribe_sum{operationName="Anonymous",operationType="subscription"} 0.011
graphql_envelop_phase_subscribe_count{operationName="Anonymous",operationType="subscription"} 1
```

### `graphql_envelop_request_duration`

This metric tracks the duration of the complete GraphQL operation execution.

It is reported as a [histogram](https://prometheus.io/docs/concepts/metric_types/#histogram).

#### Labels

| Label           | Description                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `operationType` | The type of the GraphQL operation requested. This can be one of `query`, `mutation`, or `subscription`. |
| `operationName` | The name of the GraphQL operation requested. It will be `Anonymous` if no `operationName` is found.     |

#### Sample Output

```text
# HELP graphql_envelop_request_duration Time spent on running the GraphQL operation from parse to execute
# TYPE graphql_envelop_request_duration histogram
graphql_envelop_request_duration_bucket{le="0.005",operationName="Anonymous",operationType="subscription"} 0
graphql_envelop_request_duration_bucket{le="0.01",operationName="Anonymous",operationType="subscription"} 0
graphql_envelop_request_duration_bucket{le="0.025",operationName="Anonymous",operationType="subscription"} 1
graphql_envelop_request_duration_bucket{le="0.05",operationName="Anonymous",operationType="subscription"} 1
graphql_envelop_request_duration_bucket{le="0.1",operationName="Anonymous",operationType="subscription"} 1
graphql_envelop_request_duration_bucket{le="0.25",operationName="Anonymous",operationType="subscription"} 1
graphql_envelop_request_duration_bucket{le="0.5",operationName="Anonymous",operationType="subscription"} 1
graphql_envelop_request_duration_bucket{le="1",operationName="Anonymous",operationType="subscription"} 1
graphql_envelop_request_duration_bucket{le="2.5",operationName="Anonymous",operationType="subscription"} 1
graphql_envelop_request_duration_bucket{le="5",operationName="Anonymous",operationType="subscription"} 1
graphql_envelop_request_duration_bucket{le="10",operationName="Anonymous",operationType="subscription"} 1
graphql_envelop_request_duration_bucket{le="+Inf",operationName="Anonymous",operationType="subscription"} 1
graphql_envelop_request_duration_sum{operationName="Anonymous",operationType="subscription"} 0.011
graphql_envelop_request_duration_count{operationName="Anonymous",operationType="subscription"} 1
```

### `graphql_envelop_request_time_summary`

This metric provides a summary of the time spent on the GraphQL operation execution.

It reports the same timing than
[`graphql_envelop_request_duration`](#graphql_envelop_request_duration) but as a
[summary](https://prometheus.io/docs/concepts/metric_types/#summary).

#### Labels

| Label           | Description                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `operationType` | The type of the GraphQL operation requested. This can be one of `query`, `mutation`, or `subscription`. |
| `operationName` | The name of the GraphQL operation requested. It will be `Anonymous` if no `operationName` is found.     |

#### Sample output

```text
# HELP graphql_envelop_request_time_summary Summary to measure the time to complete GraphQL operations
# TYPE graphql_envelop_request_time_summary summary
graphql_envelop_request_time_summary{quantile="0.01",operationName="Anonymous",operationType="subscription"} 0.022
graphql_envelop_request_time_summary{quantile="0.05",operationName="Anonymous",operationType="subscription"} 0.022
graphql_envelop_request_time_summary{quantile="0.5",operationName="Anonymous",operationType="subscription"} 0.022
graphql_envelop_request_time_summary{quantile="0.9",operationName="Anonymous",operationType="subscription"} 0.022
graphql_envelop_request_time_summary{quantile="0.95",operationName="Anonymous",operationType="subscription"} 0.022
graphql_envelop_request_time_summary{quantile="0.99",operationName="Anonymous",operationType="subscription"} 0.022
graphql_envelop_request_time_summary{quantile="0.999",operationName="Anonymous",operationType="subscription"} 0.022
graphql_envelop_request_time_summary_sum{operationName="Anonymous",operationType="subscription"} 0.022
graphql_envelop_request_time_summary_count{operationName="Anonymous",operationType="subscription"} 1
```

### `graphql_envelop_error_result`

This metric tracks the number of errors that occurred returned by the GraphQL execution. It counts
all errors found in the final response, but it also includes errors from other GraphQL processing
phases (parsing, validation and context building).

It is exposed as a [counter](https://prometheus.io/docs/concepts/metric_types/#counter).

#### Labels

Depending on the phase when the error occurred, some labels may be missing. For example, if the
error occurred during the context phase, only the `phase` label will be present.

| Label           | Description                                                                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `path`          | The path of the field that caused the error. It can be `undefined` if the error is not related to a given field.                                                      |
| `phase`         | The phase of the GraphQL execution where the error occurred. It can be `parse`, `validate`, `context`, `execute` (for every operation types including subscriptions). |
| `operationType` | The type of the GraphQL operation requested. This can be one of `query`, `mutation`, or `subscription`.                                                               |
| `operationName` | The name of the GraphQL operation requested. It will be `Anonymous` if no `operationName` is found.                                                                   |

#### Sample Output

```text
# HELP graphql_envelop_error_result Counts the amount of errors reported from all phases
# TYPE graphql_envelop_error_result counter
graphql_envelop_error_result{operationName="Anonymous",operationType="query",path="undefined",phase="execute"} 1
```

### `graphql_envelop_request`

This metric tracks the number of GraphQL operations executed. It counts all operations, either
failed or successful, including subscriptions.

It is exposed as a [counter](https://prometheus.io/docs/concepts/metric_types/#counter).

#### Labels

| Label           | Description                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `operationType` | The type of the GraphQL operation requested. This can be one of `query`, `mutation`, or `subscription`. |
| `operationName` | The name of the GraphQL operation requested. It will be `Anonymous` if no `operationName` is found.     |

#### Sample output

```text
# HELP graphql_envelop_request Counts the amount of GraphQL requests executed through Envelop
# TYPE graphql_envelop_request counter
graphql_envelop_request{operationName="Anonymous",operationType="query"} 1
```

### `graphql_envelop_deprecated_field`

This metric tracks the number of deprecated fields used in the GraphQL operation.

#### Labels

| Label           | Description                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `fieldName`     | The name of the deprecated field that has been used.                                                    |
| `typeName`      | The name of the parent type of the deprecated field that has been used.                                 |
| `operationType` | The type of the GraphQL operation requested. This can be one of `query`, `mutation`, or `subscription`. |
| `operationName` | The name of the GraphQL operation requested. It will be `Anonymous` if no `operationName` is found.     |

#### Sample Output

```text
# HELP graphql_envelop_deprecated_field Counts the amount of deprecated fields used in selection sets
# TYPE graphql_envelop_deprecated_field counter
graphql_envelop_deprecated_field{operationName="Anonymous",operationType="query",fieldName="hello",typeName="Query"} 1
```

### `graphql_envelop_schema_change`

This metric tracks the number of schema changes that have occurred since the gateway started.

If you are using a plugin that modifies the schema on the fly, be aware that this metric will also
include updates made by those plugins. Which means that one schema update can actually trigger
multiple schema changes.

#### Labels

This metric does not include any labels.

#### Sample output

```text
# HELP graphql_envelop_schema_change Counts the amount of schema changes
# TYPE graphql_envelop_schema_change counter
graphql_envelop_schema_change 1
```

### `graphql_envelop_execute_resolver`

> **Caution**: Enabling resolvers level metrics will introduce significant overhead.
>
> We highly recommend to enable this for debugging purpose only.

This metric tracks the duration of each resolver execution. It reports the time spent only on
additional resolvers, not on fields that are resolved by a subgraph. It is up to the subgraph server
to implement resolver level metrics, the gateway can't remotely track their execution time.

#### Filter resolvers to instrument

To mitigate the cost of instrumenting all resolvers, you can explicitly list the fields that should
be instrumented by providing a list of field names to the `instrumentResolvers` option.

It is a list of strings in the form of `TypeName.fieldName`. For example, to instrument the `hello`
root query, you would use `Query.hello`.

You can also use wildcards to instrument all the fields for a type. For example, to instrument all
root queries, you would use `Query.*`.

#### Labels

| Label           | Description                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `operationType` | The type of the GraphQL operation requested. This can be one of `query`, `mutation`, or `subscription`. |
| `operationName` | The name of the GraphQL operation requested. It will be `Anonymous` if no `operationName` is found.     |
| `fieldName`     | The name of the field being resolved.                                                                   |
| `typeName`      | The name of the parent type of the field being resolved.                                                |
| `returnType`    | The name of the return type of the field being resolved.                                                |

#### Sample output

```text
# HELP graphql_envelop_execute_resolver Time spent on running the GraphQL resolvers
# TYPE graphql_envelop_execute_resolver histogram
graphql_envelop_execute_resolver_bucket{le="0.005",operationName="Anonymous",operationType="query",fieldName="hello",typeName="Query",returnType="String!"} 1
graphql_envelop_execute_resolver_bucket{le="0.01",operationName="Anonymous",operationType="query",fieldName="hello",typeName="Query",returnType="String!"} 1
graphql_envelop_execute_resolver_bucket{le="0.025",operationName="Anonymous",operationType="query",fieldName="hello",typeName="Query",returnType="String!"} 1
graphql_envelop_execute_resolver_bucket{le="0.05",operationName="Anonymous",operationType="query",fieldName="hello",typeName="Query",returnType="String!"} 1
graphql_envelop_execute_resolver_bucket{le="0.1",operationName="Anonymous",operationType="query",fieldName="hello",typeName="Query",returnType="String!"} 1
graphql_envelop_execute_resolver_bucket{le="0.25",operationName="Anonymous",operationType="query",fieldName="hello",typeName="Query",returnType="String!"} 1
graphql_envelop_execute_resolver_bucket{le="0.5",operationName="Anonymous",operationType="query",fieldName="hello",typeName="Query",returnType="String!"} 1
graphql_envelop_execute_resolver_bucket{le="1",operationName="Anonymous",operationType="query",fieldName="hello",typeName="Query",returnType="String!"} 1
graphql_envelop_execute_resolver_bucket{le="2.5",operationName="Anonymous",operationType="query",fieldName="hello",typeName="Query",returnType="String!"} 1
graphql_envelop_execute_resolver_bucket{le="5",operationName="Anonymous",operationType="query",fieldName="hello",typeName="Query",returnType="String!"} 1
graphql_envelop_execute_resolver_bucket{le="10",operationName="Anonymous",operationType="query",fieldName="hello",typeName="Query",returnType="String!"} 1
graphql_envelop_execute_resolver_bucket{le="+Inf",operationName="Anonymous",operationType="query",fieldName="hello",typeName="Query",returnType="String!"} 1
graphql_envelop_execute_resolver_sum{operationName="Anonymous",operationType="query",fieldName="hello",typeName="Query",returnType="String!"} 0
graphql_envelop_execute_resolver_count{operationName="Anonymous",operationType="query",fieldName="hello",typeName="Query",returnType="String!"} 1
```

## Configuration

### Custom registry

You can customize the `prom-client` `Registry` object if you are using a custom one, by passing it
along with the configuration object:

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { Registry } from 'prom-client'
import { envelop, useEngine } from '@envelop/core'

const myRegistry = new Registry()

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    // ... other plugins ...
    usePrometheus({
      // ... config ...
      registry: myRegistry
    })
  ]
})
```

> Note: if you are using custom `prom-client` instances, you need to make sure to pass your registry
> there as well.

### Introspection

You can exclude introspection from monitoring by setting `skipIntrospection: true` in your config
object.

### Custom `prom-client` instances

Each tracing field supports custom `prom-client` objects, and custom `labels` a metadata, you can
create a custom extraction function for every `Histogram` / `Summary` / `Counter`:

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { Histogram, register as registry } from 'prom-client'
import { envelop, useEngine } from '@envelop/core'
import { createHistogram, usePrometheus } from '@envelop/prometheus'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    usePrometheus({
      metrics: {
        graphql_envelop_phase_parse: createHistogram({
          registry: registry // if you are not using the default one, make sure to add your custom registry,
          histogram: new Histogram({
            name: 'my_custom_name',
            help: 'HELP ME',
            labelNames: ['opText'] as const,
          }),
          phases: ['parse'], // This is an array of phases that should be hooked for this metric
          fillLabelsFn: params => {
            // if you wish to fill your `labels` with metadata, you can use the params in order to get access to things like DocumentNode, operationName, operationType, `error` (for error metrics) and `info` (for resolvers metrics)
            return {
              opText: print(params.document)
            }
          }
        }),
      }
    })
  ]
})
```

### Configure metric phases

Each metric observes timing or events in different phases of the GraphQL request pipeline.

You can configure which phases are observed for a given metric by providing an array of phases
instead of `true` for any metric configuration. You can also configure the phases when using custom
metrics factories by providing the `phases` option.

By default, all available phases are enabled when the metric is enabled.

```ts
import { execute, parse, specifiedRules, subscribe, validate } from 'graphql'
import { envelop, useEngine } from '@envelop/core'
import { usePrometheus } from '@envelop/prometheus'

const getEnveloped = envelop({
  plugins: [
    useEngine({ parse, validate, specifiedRules, execute, subscribe }),
    usePrometheus({
      metrics: {
        graphql_envelop_phase_error: ['execute', 'subscribe'] // only trace errors of execute and subscribe phases
      }
    })
  ]
})
```

### Skip observation based on request context

To save bandwidth or storage, you can reduce the amount of reported values by filtering which events
are observed based on the request context.

For example, you can only monitor a subset of operations, because they are critical or that you want
to debug it's performance:

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
            name: 'graphql_yoga_http_duration',
            help: 'Time spent on HTTP connection',
            labelNames: ['operation_name']
          },
          fillLabelsFn: ({ operationName }, _rawContext) => ({
            operation_name: operationName
          }),
          shouldObserve: context => TRACKED_OPERATIONS.includes(context?.params?.operationName)
        })
      }
    })
  ]
})
```

## Caveats

Due to Prometheus client API limitations, if this plugin is initialized multiple times, only the
metrics configuration of the first initialization will be applied.

If necessary, use a different registry instance for each plugin instance, or clear the registry
before plugin initialization.

```ts
function usePrometheusWithRegistry() {
  // create a new registry instance for each plugin instance
  const registry = new Registry()

  // or just clear the registry if you use only on plugin instance at a time
  registry.clear()

  return usePrometheus({
    registry,
    ...
  })
}
```

Keep in mind that this implies potential data loss in pull mode if some data is produced between
last pull and the re-initialization of the plugin.
