import { getOperationAST } from 'graphql';
import { Plugin } from 'graphql-yoga';
import { register as defaultRegistry, Histogram } from 'prom-client';
import {
  createCounter,
  createHistogram,
  createSummary,
  PrometheusTracingPluginConfig as EnvelopPrometheusTracingPluginConfig,
  FillLabelsFnParams,
  usePrometheus as useEnvelopPrometheus,
} from '@envelop/prometheus';

export { createCounter, createHistogram, createSummary, FillLabelsFnParams };

export interface PrometheusTracingPluginConfig extends EnvelopPrometheusTracingPluginConfig {
  http?: boolean | ReturnType<typeof createHistogram>;
  httpRequestHeaders?: boolean;
  httpResponseHeaders?: boolean;
  /**
   * The endpoint to serve metrics exposed by this plugin.
   * Defaults to "/metrics".
   */
  endpoint?: string | boolean;
}

export function usePrometheus(options: PrometheusTracingPluginConfig): Plugin {
  const endpoint = options.endpoint || '/metrics';
  const registry = options.registry || defaultRegistry;

  let httpHistogram: ReturnType<typeof createHistogram> | undefined;

  function labelExists(label: string) {
    if ((options.labels as Record<string, boolean>)?.[label] == null) {
      return true;
    }
    return (options.labels as Record<string, boolean>)[label];
  }

  if (options.http) {
    const labelNames = ['method', 'statusCode'];

    if (labelExists('url')) {
      labelNames.push('url');
    }
    if (labelExists('statusText')) {
      labelNames.push('statusText');
    }
    if (labelExists('operationName')) {
      labelNames.push('operationName');
    }
    if (labelExists('operationType')) {
      labelNames.push('operationType');
    }
    if (options.httpRequestHeaders) {
      labelNames.push('requestHeaders');
    }
    if (options.httpResponseHeaders) {
      labelNames.push('responseHeaders');
    }
    httpHistogram =
      typeof options.http === 'object'
        ? options.http
        : createHistogram({
            histogram: new Histogram({
              name: 'graphql_yoga_http_duration',
              help: 'Time spent on HTTP connection',
              labelNames,
              registers: [registry],
            }),
            fillLabelsFn(params, { request, response }) {
              const labels: Record<string, string> = {
                method: request.method,
                statusCode: response.status,
              };
              if (labelExists('url')) {
                labels.url = request.url;
              }
              if (labelExists('statusText')) {
                labels.statusText = request.statusText;
              }
              if (labelExists('operationType') && params.operationType) {
                labels.operationType = params.operationType;
              }
              if (labelExists('operationName')) {
                labels.operationName = params.operationName || 'Anonymous';
              }
              if (options.httpRequestHeaders) {
                labels.requestHeaders = JSON.stringify(
                  Object.fromEntries(request.headers.entries()),
                );
              }
              if (options.httpResponseHeaders) {
                labels.responseHeaders = JSON.stringify(
                  Object.fromEntries(response.headers.entries()),
                );
              }
              return labels;
            },
          });
  }

  const startByRequest = new WeakMap<Request, number>();
  const paramsByRequest = new WeakMap<Request, FillLabelsFnParams>();

  return {
    onPluginInit({ addPlugin }) {
      addPlugin(useEnvelopPrometheus({ ...options, registry }) as Plugin);
    },
    onRequest({ request, url, fetchAPI, endResponse }) {
      startByRequest.set(request, Date.now());
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
    onExecute({ args }) {
      const operationAST = getOperationAST(args.document, args.operationName);
      const operationType = operationAST?.operation;
      const operationName = operationAST?.name?.value;
      paramsByRequest.set(args.contextValue.request, {
        document: args.document,
        operationName,
        operationType,
      });
    },
    onResponse({ request, response, serverContext }) {
      const start = startByRequest.get(request);
      if (start) {
        const duration = Date.now() - start;
        const params = paramsByRequest.get(request);
        httpHistogram?.histogram.observe(
          httpHistogram.fillLabelsFn(params || {}, {
            ...serverContext,
            request,
            response,
          }),
          duration,
        );
      }
    },
  };
}
