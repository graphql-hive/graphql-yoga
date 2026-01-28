import type { GraphQLResolveInfo } from 'graphql';
import { Registry } from 'prom-client';
import {
  createCounter,
  createHistogram,
  createSummary,
  type AtLeastOne,
  type DeprecatedFieldInfo,
  type FillLabelsFnParams,
} from './utils.js';

export type PrometheusTracingPluginConfig = {
  /**
   * The `prom-client` registry to use. If not provided, the default global registry will be used.
   */
  registry?: Registry;

  /**
   * Ignore introspection queries when collecting metrics.
   *
   * @default false
   */
  skipIntrospection?: boolean;

  /**
   * Only applicable when `metrics.graphql_envelop_execute_resolver` is enabled.
   *
   * Allows to whitelist resolvers to collect metrics for. It is highly recommended to provide this
   * option to avoid metrics explosion and performance degradation.
   */
  resolversWhitelist?: string[];

  /**
   * Metrics configuration.
   *
   * By default, all metrics are disabled. You can enable them by setting the corresponding field to `true`.
   *
   * An object can also be passed to configure the metric.
   * Please use the factories `createCounter`, `createHistogram` and `createSummary`
   * to create those metric configuration objects.
   */
  metrics: MetricsConfig;

  /**
   * All labels attached to metrics can be disabled. This can help you reduce the size of the exported metrics
   *
   * By default, all labels are enabled, but all labels are not available for all metrics.
   * See the documentation for each metric to see which labels are available.
   */
  labels?: LabelsConfig;
};

export type MetricsConfig = {
  /**
   * Tracks the number of GraphQL operations executed.
   * It counts all operations, either failed or successful, including subscriptions.
   * It is exposed as a counter.
   *
   * You can pass multiple type of values:
   *  - boolean: Disable or Enable the metric with default configuration
   *  - string: Enable the metric with custom name
   *  - string[]: Enable the metric on a list of phases
   *  - ReturnType<typeof createCounter>: Enable the metric with custom configuration
   */
  graphql_envelop_request?: CounterMetricOption<'execute' | 'subscribe'>;

  /**
   * Tracks the duration of the complete GraphQL operation execution.
   * It is reported as a histogram.
   *
   * You can pass multiple type of values:
   *  - boolean: Disable or Enable the metric with default configuration
   *  - string: Enable the metric with custom name
   *  - string[]: Enable the metric on a list of phases
   *  - number[]: Enable the metric with custom buckets
   *  - ReturnType<typeof createHistogram>: Enable the metric with custom configuration
   */
  graphql_envelop_request_duration?: HistogramMetricOption<'execute' | 'subscribe'>;
  /**
   * Provides a summary of the time spent on the GraphQL operation execution.
   * It reports the same timing than graphql_envelop_request_duration but as a summary.
   *
   * You can pass multiple type of values:
   *  - boolean: Disable or Enable the metric with default configuration
   *  - string: Enable the metric with custom name
   *  - string[]: Enable the metric on a list of phases
   *  - ReturnType<typeof createSummary>: Enable the metric with custom configuration
   */
  graphql_envelop_request_time_summary?: SummaryMetricOption<'execute' | 'subscribe'>;
  /**
   * Tracks the duration of the parse phase of the GraphQL execution.
   * It reports the time spent parsing the incoming GraphQL operation.
   * It is reported as a histogram.
   *
   * You can pass multiple type of values:
   *  - boolean: Disable or Enable the metric with default configuration
   *  - string: Enable the metric with custom name
   *  - string[]: Enable the metric on a list of phases
   *  - number[]: Enable the metric with custom buckets
   *  - ReturnType<typeof createHistogram>: Enable the metric with custom configuration
   */
  graphql_envelop_phase_parse?: HistogramMetricOption<'parse'>;
  /**
   * Tracks the duration of the validate phase of the GraphQL execution.
   * It reports the time spent validating the incoming GraphQL operation.
   * It is reported as a histogram.
   *
   * You can pass multiple type of values:
   *  - boolean: Disable or Enable the metric with default configuration
   *  - string: Enable the metric with custom name
   *  - string[]: Enable the metric on a list of phases
   *  - number[]: Enable the metric with custom buckets
   *  - ReturnType<typeof createHistogram>: Enable the metric with custom configuration
   */
  graphql_envelop_phase_validate?: HistogramMetricOption<'validate'>;
  /**
   * Tracks the duration of the context phase of the GraphQL execution.
   * It reports the time spent building the context object that will be passed to the executors.
   * It is reported as a histogram.
   *
   * You can pass multiple type of values:
   *  - boolean: Disable or Enable the metric with default configuration
   *  - string: Enable the metric with custom name
   *  - string[]: Enable the metric on a list of phases
   *  - number[]: Enable the metric with custom buckets
   *  - ReturnType<typeof createHistogram>: Enable the metric with custom configuration
   */
  graphql_envelop_phase_context?: HistogramMetricOption<'context'>;
  /**
   * Tracks the duration of the execute phase of the GraphQL execution.
   * It reports the time spent actually resolving the response of the incoming operation.
   * This includes the gathering of all the data from all sources required to construct the final response.
   * It is reported as a histogram.
   *
   * You can pass multiple type of values:
   *  - boolean: Disable or Enable the metric with default configuration
   *  - string: Enable the metric with custom name
   *  - string[]: Enable the metric on a list of phases
   *  - number[]: Enable the metric with custom buckets
   *  - ReturnType<typeof createHistogram>: Enable the metric with custom configuration
   */
  graphql_envelop_phase_execute?: HistogramMetricOption<'execute'>;
  /**
   * This metric tracks the duration of the subscribe phase of the GraphQL execution.
   * It reports the time spent initiating a subscription (which doesn’t include actually sending the first response).
   * It is reported as a histogram.
   *
   * You can pass multiple type of values:
   *  - boolean: Disable or Enable the metric with default configuration
   *  - string: Enable the metric with custom name
   *  - string[]: Enable the metric on a list of phases
   *  - number[]: Enable the metric with custom buckets
   *  - ReturnType<typeof createHistogram>: Enable the metric with custom configuration
   */
  graphql_envelop_phase_subscribe?: HistogramMetricOption<'subscribe'>;
  /**
   * This metric tracks the number of errors that returned by the GraphQL execution.
   * It counts all errors found in response, but it also includes errors from other GraphQL
   * processing phases (parsing, validation and context building).
   * It is exposed as a counter.
   *
   * You can pass multiple type of values:
   *  - boolean: Disable or Enable the metric with default configuration
   *  - string: Enable the metric with custom name
   *  - string[]: Enable the metric on a list of phases
   *  - ReturnType<typeof createCounter>: Enable the metric with custom configuration
   */
  graphql_envelop_error_result?: CounterMetricOption<
    'parse' | 'validate' | 'context' | 'execute' | 'subscribe',
    string,
    FillLabelsFnParams & {
      error: unknown;
      errorPhase: 'parse' | 'validate' | 'context' | 'execute' | 'subscribe';
    }
  >;
  /**
   * This metric tracks the number of deprecated fields used in the GraphQL operation.
   * It is exposed as a counter.
   *
   * You can pass multiple type of values:
   *  - boolean: Disable or Enable the metric with default configuration
   *  - string: Enable the metric with custom name
   *  - string[]: Enable the metric on a list of phases
   *  - ReturnType<typeof createCounter>: Enable the metric with custom configuration
   */
  graphql_envelop_deprecated_field?: CounterMetricOption<
    'parse',
    string,
    FillLabelsFnParams & { deprecationInfo: DeprecatedFieldInfo }
  >;
  /**
   * This metric tracks the number of schema changes that have occurred since the gateway started.
   * If you are using a plugin that modifies the schema on the fly,
   * be aware that this metric will also include updates made by those plugins.
   * Which means that one schema update can actually trigger multiple schema changes.
   * It is exposed as a counter.
   *
   * You can pass multiple type of values:
   *  - boolean: Disable or Enable the metric with default configuration
   *  - string: Enable the metric with custom name
   *  - string[]: Enable the metric on a list of phases
   *  - ReturnType<typeof createCounter>: Enable the metric with custom configuration
   */
  graphql_envelop_schema_change?: CounterMetricOption<'schema', string, {}>;
  /**
   * This metric tracks the duration of each resolver execution.
   *
   * It is highly recommended to enable this metric for debugging purposes only,
   * since it can have a significant performance impact.
   * You can use the `resolversWhitelist` option to limit metrics explosion and performance degradation.
   *
   * You can pass multiple type of values:
   *  - boolean: Disable or Enable the metric with default configuration
   *  - string: Enable the metric with custom name
   *  - string[]: Enable the metric on a list of phases
   *  - number[]: Enable the metric with custom buckets
   *  - ReturnType<typeof createHistogram>: Enable the metric with custom configuration
   */
  graphql_envelop_execute_resolver?: HistogramMetricOption<
    'subscribe' | 'execute',
    string,
    FillLabelsFnParams & {
      info: GraphQLResolveInfo;
    }
  >;
};

export type LabelsConfig = {
  /**
   * The currently executing operation name.
   *
   * If no operation name is provided, this will be set to 'Anonymous'
   *
   * @default true
   */
  operationName?: boolean;
  /**
   * The currently executing operation type.
   *
   * @default true
   */
  operationType?: boolean;

  /**
   * The resolved field name.
   *
   * @default true
   */
  fieldName?: boolean;
  /**
   * The resolved field parent type name.
   *
   * @default true
   */
  typeName?: boolean;
  /**
   * The resolved field type name. This is only available for the `graphql_envelop_execute_resolver` metric.
   *
   * @default true
   */
  returnType?: boolean;

  /**
   * The path of the field from which originated the error. Only available for the `graphql_envelop_error_result` metric.
   */
  path?: boolean;
  /**
   * The execution phase where the error occurred. Only available for the `graphql_envelop_error_result` metric.
   */
  phase?: boolean;
};

export type HistogramMetricOption<
  Phases,
  LabelNames extends string = string,
  Params extends Record<string, unknown> = FillLabelsFnParams,
> =
  | boolean
  | string
  | BucketsConfig
  | AtLeastOne<Phases>
  | ReturnType<typeof createHistogram<Phases, LabelNames, Params>>;
export type BucketsConfig = AtLeastOne<number>;

export type CounterMetricOption<
  Phases,
  LabelNames extends string = string,
  Params extends Record<string, unknown> = FillLabelsFnParams,
> =
  | boolean
  | string
  | AtLeastOne<Phases>
  | ReturnType<typeof createCounter<Phases, LabelNames, Params>>;

export type SummaryMetricOption<
  Phases,
  LabelNames extends string = string,
  Params extends Record<string, unknown> = FillLabelsFnParams,
> =
  | boolean
  | string
  | AtLeastOne<Phases>
  | ReturnType<typeof createSummary<Phases, LabelNames, Params>>;
