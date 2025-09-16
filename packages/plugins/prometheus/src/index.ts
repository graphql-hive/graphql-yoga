import { getOperationAST, type DocumentNode } from 'graphql';
import { Plugin } from 'graphql-yoga';
import { register as defaultRegistry } from 'prom-client';
import {
  createCounter,
  createHistogram,
  createSummary,
  getCounterFromConfig,
  getHistogramFromConfig,
  getSummaryFromConfig,
  usePrometheus as useEnvelopPrometheus,
  type CounterAndLabels,
  type CounterMetricOption,
  type PrometheusTracingPluginConfig as EnvelopPrometheusTracingPluginConfig,
  type FillLabelsFnParams,
  type HistogramAndLabels,
  type HistogramMetricOption,
  type SummaryAndLabels,
  type SummaryMetricOption,
} from '@envelop/prometheus';

export {
  type CounterAndLabels,
  createCounter,
  createHistogram,
  createSummary,
  type FillLabelsFnParams,
  type HistogramAndLabels,
  type SummaryAndLabels,
  getHistogramFromConfig,
  getCounterFromConfig,
  getSummaryFromConfig,
  type HistogramMetricOption,
  type CounterMetricOption,
  type SummaryMetricOption,
};

export type PrometheusTracingPluginConfig = Omit<
  EnvelopPrometheusTracingPluginConfig,
  'metrics'
> & {
  /**
   * The Prometheus metrics to report.
   *
   * By default, the following metrics are enabled:
   *
   * - `graphql_envelop_deprecated_field`
   * - `graphql_envelop_request`
   * - `graphql_envelop_request_duration`
   * - `graphql_envelop_request_time_summary`
   * - `graphql_envelop_phase_parse`
   * - `graphql_envelop_phase_validate`
   * - `graphql_envelop_phase_context`
   * - `graphql_envelop_error_result`
   * - `graphql_envelop_phase_execute`
   * - `graphql_envelop_phase_subscribe`
   * - `graphql_envelop_schema_change`
   * - `graphql_yoga_http_duration`
   *
   */
  metrics?: EnvelopPrometheusTracingPluginConfig['metrics'] & {
    /**
     * Tracks the duration of HTTP requests. It reports the time spent to
     * process each incoming request as an histogram.
     *
     * You can pass multiple type of values:
     *  - boolean: Disable or Enable the metric with default configuration
     *  - string: Enable the metric with custom name
     *  - number[]: Enable the metric with custom buckets
     *  - ReturnType<typeof createHistogram>: Enable the metric with custom configuration
     */
    graphql_yoga_http_duration?: HistogramMetricOption<'request', string, HTTPFillLabelParams>;
  };

  labels?: {
    /**
     * The HTTP method of the request
     */
    method?: boolean;
    /**
     * The status code of the response
     */
    statusCode?: boolean;
    /**
     * The url of the HTTP request
     */
    url?: boolean;
  };

  /**
   * The endpoint to serve metrics exposed by this plugin.
   * Defaults to "/metrics".
   */
  endpoint?: string | boolean;
};

type HTTPFillLabelParams = FillLabelsFnParams & {
  document: DocumentNode;
  request: Request;
  response: Response;
};

const DEFAULT_METRICS_CONFIG: PrometheusTracingPluginConfig['metrics'] = {
  graphql_envelop_deprecated_field: true,
  graphql_envelop_request: true,
  graphql_envelop_request_duration: true,
  graphql_envelop_request_time_summary: true,
  graphql_envelop_phase_parse: true,
  graphql_envelop_phase_validate: true,
  graphql_envelop_phase_context: true,
  graphql_envelop_error_result: true,
  graphql_envelop_execute_resolver: false,
  graphql_envelop_phase_execute: true,
  graphql_envelop_phase_subscribe: true,
  graphql_envelop_schema_change: true,
  graphql_yoga_http_duration: true,
};

export function usePrometheus(options: PrometheusTracingPluginConfig): Plugin {
  const endpoint = options.endpoint || '/metrics';
  const registry = options.registry || defaultRegistry;
  const resolvedOptions: EnvelopPrometheusTracingPluginConfig = {
    ...options,
    metrics: {
      ...DEFAULT_METRICS_CONFIG,
      ...options.metrics,
    },
  };

  const basePlugin: Plugin = {
    onPluginInit({ addPlugin }) {
      addPlugin(useEnvelopPrometheus({ ...resolvedOptions, registry }) as Plugin);
      addPlugin({
        onRequest({ url, fetchAPI, endResponse }) {
          if (endpoint && url.pathname === endpoint) {
            return registry.metrics().then(metrics => {
              endResponse(
                new fetchAPI.Response(metrics, {
                  headers: {
                    'Content-Type': registry.contentType,
                  },
                }),
              );
            });
          }
          return undefined;
        },
      });
    },
  };

  const httpHistogram = getHistogramFromConfig<
    'request',
    NonNullable<PrometheusTracingPluginConfig['metrics']>,
    HTTPFillLabelParams
  >(
    resolvedOptions,
    'graphql_yoga_http_duration',
    ['request'],
    {
      help: 'Time spent on HTTP connection',
      labelNames: ['operationName', 'operationType', 'method', 'statusCode', 'url'],
    },
    (params, { request, response }) => ({
      method: request.method,
      statusCode: response.status,
      operationType: params.operationType || 'unknown',
      operationName: params.operationName || 'Anonymous',
      url: request.url,
    }),
  );

  // We don't need to register any hooks if the metric is not enabled
  if (!httpHistogram) {
    return basePlugin;
  }

  const startByRequest = new WeakMap<Request, number>();
  const paramsByRequest = new WeakMap<Request, FillLabelsFnParams & { document: DocumentNode }>();

  return {
    ...basePlugin,
    onRequest({ request }) {
      startByRequest.set(request, Date.now());
    },
    onParse({ context }) {
      // If only it is Yoga, we calculate HTTP request time
      if (context.request) {
        return ({ result: document, context }) => {
          const operationAST = getOperationAST(document, context.params.operationName);
          const params = {
            document,
            operationName: operationAST?.name?.value,
            operationType: operationAST?.operation,
          };

          paramsByRequest.set(context.request, params);
        };
      }
      return undefined;
    },
    onResponse({ request, response, serverContext }) {
      const start = startByRequest.get(request);
      const params = paramsByRequest.get(request);
      if (start && params) {
        const context = { ...serverContext, request, response };
        const completeParams: HTTPFillLabelParams = { ...params, request, response };

        if (httpHistogram.shouldObserve(completeParams, context)) {
          httpHistogram.histogram.observe(
            httpHistogram.fillLabelsFn(completeParams, context),
            (Date.now() - start) / 1000,
          );
        }
      }
    },
  };
}
