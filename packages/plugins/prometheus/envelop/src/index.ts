/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import { TypeInfo, type ExecutionResult, type GraphQLError, type GraphQLSchema } from 'graphql';
import { register as defaultRegistry } from 'prom-client';
import {
  isAsyncIterable,
  isIntrospectionOperationString,
  type OnContextBuildingHook,
  type OnEnvelopedHook,
  type OnExecuteHook,
  type OnParseHook,
  type OnPluginInitHook,
  type OnSchemaChangeHook,
  type OnSubscribeHook,
  type OnValidateHook,
  type Plugin,
} from '@envelop/core';
import { useOnResolve } from '@envelop/on-resolve';
import type {
  CounterMetricOption,
  HistogramMetricOption,
  MetricsConfig,
  PrometheusTracingPluginConfig,
  SummaryMetricOption,
} from './config.js';
import {
  createCounter,
  createFillLabelFnParams,
  createHistogram,
  createSummary,
  extractDeprecatedFields,
  filterFillParamsFnParams,
  getCounterFromConfig,
  getHistogramFromConfig,
  getSummaryFromConfig,
  instrumentRegistry,
  shouldTraceFieldResolver,
  type CounterAndLabels,
  type FillLabelsFnParams,
  type HistogramAndLabels,
  type SummaryAndLabels,
} from './utils.js';

export {
  CounterAndLabels,
  FillLabelsFnParams,
  HistogramAndLabels,
  PrometheusTracingPluginConfig,
  SummaryAndLabels,
  HistogramMetricOption,
  CounterMetricOption,
  SummaryMetricOption,
  createCounter,
  createHistogram,
  createSummary,
  getCounterFromConfig,
  getHistogramFromConfig,
  getSummaryFromConfig,
};

export const fillLabelsFnParamsMap = new WeakMap<any, FillLabelsFnParams | null>();
export const execStartTimeMap = new WeakMap<any, number>();

type PhaseHandler<OtherArgs extends Record<string, unknown> = {}, Params = FillLabelsFnParams> = {
  shouldHandle: (params: Params, context: unknown) => boolean;
  handler: (
    args: OtherArgs & {
      params: Params;
      context: unknown;
      totalTime: number;
    },
  ) => void;
};

export const usePrometheus = (config: PrometheusTracingPluginConfig): Plugin => {
  config.registry = instrumentRegistry(config.registry || defaultRegistry);

  const phasesToHook = {
    parse: [] as PhaseHandler[],
    validate: [] as PhaseHandler[],
    context: [] as PhaseHandler[],
    execute: {
      end: [] as PhaseHandler[],
      result: [] as PhaseHandler<{ result: ExecutionResult }>[],
    },
    subscribe: {
      end: [] as PhaseHandler[],
      result: [] as PhaseHandler<{ result: ExecutionResult }>[],
      error: [] as PhaseHandler<{ error: unknown }>[],
    },
    pluginInit: [] as OnPluginInitHook<Record<string, unknown>>[],
    enveloped: [] as OnEnvelopedHook<Record<string, unknown>>[],
    schema: [] as OnSchemaChangeHook[],
  };

  const parseHistogram = getHistogramFromConfig<'parse', MetricsConfig>(
    config,
    'graphql_envelop_phase_parse',
    ['parse'],
    {
      help: 'Time spent on running GraphQL "parse" function',
    },
  );
  if (parseHistogram) {
    phasesToHook.parse.push({
      shouldHandle: parseHistogram.shouldObserve,
      handler: ({ params, context, totalTime }) => {
        parseHistogram.histogram.observe(parseHistogram.fillLabelsFn(params, context), totalTime);
      },
    });
  }

  const validateHistogram = getHistogramFromConfig<'validate', MetricsConfig>(
    config,
    'graphql_envelop_phase_validate',
    ['validate'],
    {
      help: 'Time spent on running GraphQL "validate" function',
    },
  );
  if (validateHistogram) {
    phasesToHook.validate.push({
      shouldHandle: validateHistogram.shouldObserve,
      handler: ({ params, context, totalTime }) => {
        const labels = validateHistogram.fillLabelsFn(params, context);
        validateHistogram.histogram.observe(labels, totalTime);
      },
    });
  }

  const contextBuildingHistogram = getHistogramFromConfig<'context', MetricsConfig>(
    config,
    'graphql_envelop_phase_context',
    ['context'],
    {
      help: 'Time spent on building the GraphQL context',
    },
  );
  if (contextBuildingHistogram) {
    phasesToHook.context.push({
      shouldHandle: contextBuildingHistogram.shouldObserve,
      handler: ({ params, context, totalTime }) => {
        const labels = contextBuildingHistogram.fillLabelsFn(params, context);
        contextBuildingHistogram.histogram.observe(labels, totalTime);
      },
    });
  }

  const executeHistogram = getHistogramFromConfig<'execute', MetricsConfig>(
    config,
    'graphql_envelop_phase_execute',
    ['execute'],
    {
      help: 'Time spent on running the GraphQL "execute" function',
    },
  );
  if (executeHistogram) {
    phasesToHook.execute.end.push({
      shouldHandle: executeHistogram.shouldObserve,
      handler: ({ params, context, totalTime }) => {
        const labels = executeHistogram.fillLabelsFn(params, context);
        executeHistogram.histogram.observe(labels, totalTime);
      },
    });
  }

  const subscribeHistogram = getHistogramFromConfig<'subscribe', MetricsConfig>(
    config,
    'graphql_envelop_phase_subscribe',
    ['subscribe'],
    {
      help: 'Time spent on running the GraphQL "subscribe" function',
    },
  );
  if (subscribeHistogram) {
    phasesToHook.subscribe.end.push({
      shouldHandle: subscribeHistogram.shouldObserve,
      handler: ({ params, context, totalTime }) => {
        const labels = subscribeHistogram.fillLabelsFn(params, context);
        subscribeHistogram.histogram.observe(labels, totalTime);
      },
    });
  }

  const resolversHistogram = getHistogramFromConfig<'execute' | 'subscribe', MetricsConfig>(
    config,
    'graphql_envelop_execute_resolver',
    ['execute', 'subscribe'],
    {
      help: 'Time spent on running the GraphQL resolvers',
      labelNames: ['operationType', 'operationName', 'fieldName', 'typeName', 'returnType'],
    },
    params =>
      filterFillParamsFnParams(config, {
        operationName: params.operationName!,
        operationType: params.operationType!,
        fieldName: params.info?.fieldName!,
        typeName: params.info?.parentType.name!,
        returnType: params.info?.returnType.toString()!,
      }),
  );
  if (resolversHistogram) {
    phasesToHook.pluginInit.push(({ addPlugin }) => {
      addPlugin(
        useOnResolve(({ info, context }) => {
          const phase = info.operation.operation === 'subscription' ? 'subscribe' : 'execute';

          if (
            !resolversHistogram.phases?.includes(phase) ||
            !shouldTraceFieldResolver(info, config.resolversWhitelist)
          ) {
            return undefined;
          }

          const fillLabelsFnParams = fillLabelsFnParamsMap.get(context);
          const paramsCtx = { ...fillLabelsFnParams, info };

          if (!resolversHistogram.shouldObserve(paramsCtx, context)) {
            return undefined;
          }

          const startTime = Date.now();

          return () => {
            const totalTime = (Date.now() - startTime) / 1000;

            resolversHistogram.histogram.observe(
              resolversHistogram.fillLabelsFn(paramsCtx, context),
              totalTime,
            );
          };
        }),
      );
    });
  }

  const requestTotalHistogram = getHistogramFromConfig<'execute' | 'subscribe', MetricsConfig>(
    config,
    'graphql_envelop_request_duration',
    ['execute', 'subscribe'],
    {
      help: 'Time spent on running the GraphQL operation from parse to execute',
    },
  );
  if (requestTotalHistogram) {
    const handler: PhaseHandler = {
      shouldHandle: requestTotalHistogram.shouldObserve,
      handler: ({ params, context, totalTime }) => {
        const labels = requestTotalHistogram!.fillLabelsFn(params, context);
        requestTotalHistogram!.histogram.observe(labels, totalTime);
      },
    };
    for (const phase of requestTotalHistogram.phases) {
      phasesToHook[phase].end.push(handler);
    }
  }

  const requestSummary = getSummaryFromConfig<'execute' | 'subscribe', MetricsConfig>(
    config,
    'graphql_envelop_request_time_summary',
    ['execute', 'subscribe'],
    {
      help: 'Summary to measure the time to complete GraphQL operations',
    },
  );
  if (requestSummary) {
    phasesToHook.enveloped.push(({ context }) => {
      if (!execStartTimeMap.has(context)) {
        execStartTimeMap.set(context, Date.now());
      }
    });
    const handler: PhaseHandler = {
      shouldHandle: (params, context) =>
        requestSummary.shouldObserve(params, context) && execStartTimeMap.has(context),
      handler: ({ params, context }) => {
        const execStartTime = execStartTimeMap.get(context);
        const summaryTime = (Date.now() - execStartTime!) / 1000;
        const labels = requestSummary!.fillLabelsFn(params, context);
        requestSummary!.summary.observe(labels, summaryTime);
      },
    };
    for (const phase of requestSummary.phases) {
      phasesToHook[phase].end.push(handler);
    }
  }

  const errorsCounter = getCounterFromConfig<
    'parse' | 'validate' | 'context' | 'execute' | 'subscribe',
    MetricsConfig
  >(
    config,
    'graphql_envelop_error_result',
    ['parse', 'validate', 'context', 'execute', 'subscribe'],
    {
      help: 'Counts the amount of errors reported from all phases',
      labelNames: ['operationType', 'operationName', 'path', 'phase'],
    },
    params => {
      const labels: Record<string, string> = {
        operationName: params.operationName!,
        operationType: params.operationType!,
        phase: params.errorPhase!,
      };

      if (params.error?.path) {
        labels['path'] = params.error.path?.join('.');
      }

      return filterFillParamsFnParams(config, labels);
    },
  );
  if (errorsCounter) {
    (['parse', 'validate'] as const)
      .filter(phase => errorsCounter.phases.includes(phase))
      .forEach(phase => {
        phasesToHook[phase].push({
          shouldHandle: (params, context) =>
            !!params.errorPhase && errorsCounter.shouldObserve(params, context),
          handler: ({ params, context }) => {
            const labels = errorsCounter.fillLabelsFn(params, context);
            errorsCounter?.counter.labels(labels).inc();
          },
        });
      });

    (['execute', 'subscribe'] as const)
      .filter(phase => errorsCounter.phases.includes(phase))
      .forEach(phase => {
        phasesToHook[phase].result.push({
          shouldHandle: errorsCounter.shouldObserve,
          handler: ({ result, params, context }) => {
            if (!result.errors?.length) {
              return;
            }
            for (const error of result.errors) {
              const labelParams = { ...params, errorPhase: 'execute', error };

              if (errorsCounter!.shouldObserve(labelParams, context)) {
                errorsCounter!.counter
                  .labels(errorsCounter!.fillLabelsFn(labelParams, context))
                  .inc();
              }
            }
          },
        });
      });

    if (errorsCounter.phases.includes('subscribe')) {
      phasesToHook.subscribe.error.push({
        shouldHandle: errorsCounter.shouldObserve,
        handler: ({ params, context }) => {
          const labels = errorsCounter.fillLabelsFn(params, context);
          errorsCounter.counter.labels(labels).inc();
        },
      });
    }

    if (errorsCounter.phases.includes('context')) {
      phasesToHook.pluginInit.push(({ registerContextErrorHandler }) => {
        registerContextErrorHandler(({ context, error }) => {
          const fillLabelsFnParams = fillLabelsFnParamsMap.get(context);
          // FIXME: unsafe cast here, but it's ok, fillabelfn is doing duck typing anyway
          const params = {
            error: error as GraphQLError,
            errorPhase: 'context',
            ...fillLabelsFnParams,
          };

          if (errorsCounter.shouldObserve(params, context)) {
            errorsCounter.counter.labels(errorsCounter?.fillLabelsFn(params, context)).inc();
          }
        });
      });
    }
  }

  const reqCounter = getCounterFromConfig<'execute' | 'subscribe', MetricsConfig>(
    config,
    'graphql_envelop_request',
    ['execute', 'subscribe'],
    {
      help: 'Counts the amount of GraphQL requests executed through Envelop',
    },
  );
  if (reqCounter) {
    const handler: PhaseHandler = {
      shouldHandle: reqCounter.shouldObserve,
      handler: ({ params, context }) => {
        reqCounter!.counter.labels(reqCounter!.fillLabelsFn(params, context)).inc();
      },
    };
    for (const phase of reqCounter.phases) {
      phasesToHook[phase].end.push(handler);
    }
  }

  const deprecationCounter = getCounterFromConfig<'parse', MetricsConfig>(
    config,
    'graphql_envelop_deprecated_field',
    ['parse'],
    {
      help: 'Counts the amount of deprecated fields used in selection sets',
      labelNames: ['operationType', 'operationName', 'fieldName', 'typeName'],
    },
    params =>
      filterFillParamsFnParams(config, {
        operationName: params.operationName!,
        operationType: params.operationType!,
        fieldName: params.deprecationInfo?.fieldName!,
        typeName: params.deprecationInfo?.typeName!,
      }),
  );
  if (deprecationCounter) {
    let typeInfo: TypeInfo | null = null;
    phasesToHook.schema.push(({ schema }) => {
      typeInfo = new TypeInfo(schema);
    });

    phasesToHook.parse.push({
      shouldHandle: (params, context) =>
        // If parse error happens, we can't explore the query document
        !!typeInfo && !params.errorPhase && deprecationCounter.shouldObserve(params, context),
      handler: ({ params, context }) => {
        const deprecatedFields = extractDeprecatedFields(params.document!, typeInfo!);

        for (const depField of deprecatedFields) {
          const deprecationLabelParams = {
            ...params,
            deprecationInfo: depField,
          };

          if (deprecationCounter.shouldObserve(deprecationLabelParams, context)) {
            deprecationCounter.counter
              .labels(deprecationCounter.fillLabelsFn(deprecationLabelParams, context))
              .inc();
          }
        }
      },
    });
  }

  const schemaChangeCounter = getCounterFromConfig<'schema', MetricsConfig>(
    config,
    'graphql_envelop_schema_change',
    ['schema'],
    {
      help: 'Counts the amount of schema changes',
      labelNames: [],
    },
    () => ({}),
  );
  if (schemaChangeCounter) {
    const countedSchemas = new WeakSet<GraphQLSchema>();

    phasesToHook.schema.push(({ schema }) => {
      if (schemaChangeCounter?.shouldObserve({}, null) && !countedSchemas.has(schema)) {
        schemaChangeCounter.counter.inc();
        countedSchemas.add(schema);
      }
    });
  }

  const onParse: OnParseHook<{}> = ({ context, params }) => {
    if (config.skipIntrospection && isIntrospectionOperationString(params.source)) {
      return;
    }

    const startTime = Date.now();

    return params => {
      const fillLabelsFnParams = createFillLabelFnParams(params.result, context, params =>
        filterFillParamsFnParams(config, params),
      );
      fillLabelsFnParamsMap.set(context, fillLabelsFnParams);

      const args = {
        context,
        totalTime: (Date.now() - startTime) / 1000,
        params: fillLabelsFnParams ?? { error: params.result, errorPhase: 'parse' },
      };

      phasesToHook.parse
        .filter(({ shouldHandle }) => shouldHandle(args.params, context))
        .forEach(({ handler }) => handler(args));
    };
  };

  const onValidate: OnValidateHook<{}> = ({ context }) => {
    const fillLabelsFnParams = fillLabelsFnParamsMap.get(context);
    if (!fillLabelsFnParams) {
      return undefined;
    }

    const startTime = Date.now();

    return ({ valid }) => {
      const args = {
        params: valid ? fillLabelsFnParams : { ...fillLabelsFnParams, errorPhase: 'validate' },
        context,
        totalTime: (Date.now() - startTime) / 1000,
      };
      phasesToHook.validate
        .filter(({ shouldHandle }) => shouldHandle(args.params, context))
        .forEach(({ handler }) => handler(args));

      // TODO: we should probably iterate over validation errors to report each error.
    };
  };

  const onContextBuilding: OnContextBuildingHook<{}> | undefined = ({ context }) => {
    const fillLabelsFnParams = fillLabelsFnParamsMap.get(context);
    if (!fillLabelsFnParams) {
      return;
    }

    const startTime = Date.now();

    const args = {
      context,
      params: fillLabelsFnParams,
      totalTime: (Date.now() - startTime) / 1000,
    };

    phasesToHook.context
      .filter(({ shouldHandle }) => shouldHandle(fillLabelsFnParams, context))
      .forEach(({ handler }) => handler(args));
  };

  const onExecute: OnExecuteHook<{}> = ({ args: { contextValue: context } }) => {
    const fillLabelsFnParams = fillLabelsFnParamsMap.get(context);
    if (!fillLabelsFnParams) {
      return;
    }

    const endHandlers = phasesToHook.execute.end.filter(({ shouldHandle }) =>
      shouldHandle(fillLabelsFnParams, context),
    );
    const resultHandlers = phasesToHook.execute.result.filter(({ shouldHandle }) =>
      shouldHandle(fillLabelsFnParams, context),
    );

    if (endHandlers.length + resultHandlers.length === 0) {
      return undefined;
    }

    const startTime = Date.now();

    function handleResult({ result }: { result: ExecutionResult }) {
      const totalTime = (Date.now() - startTime) / 1000;
      const args = { params: fillLabelsFnParams!, context, totalTime, result };
      resultHandlers.forEach(({ handler }) => handler(args));
    }

    const handleEnd = () => {
      const totalTime = (Date.now() - startTime) / 1000;
      const args = { params: fillLabelsFnParams, context, totalTime };
      endHandlers.forEach(({ handler }) => handler(args));
    };

    return {
      onExecuteDone: ({ result }) => {
        if (isAsyncIterable(result)) {
          return {
            onNext: resultHandlers.length ? handleResult : undefined,
            onEnd: endHandlers.length ? handleEnd : undefined,
          };
        } else {
          handleResult({ result });
          handleEnd();
          return undefined;
        }
      },
    };
  };

  const onSubscribe: OnSubscribeHook<{}> = ({ args: { contextValue: context } }) => {
    const fillLabelsFnParams = fillLabelsFnParamsMap.get(context);
    if (!fillLabelsFnParams) {
      return;
    }

    const endHandlers = phasesToHook.subscribe.end.filter(({ shouldHandle }) =>
      shouldHandle(fillLabelsFnParams, context),
    );
    const resultHandlers = phasesToHook.subscribe.result.filter(({ shouldHandle }) =>
      shouldHandle(fillLabelsFnParams, context),
    );
    const errorHandlers = phasesToHook.subscribe.error.filter(({ shouldHandle }) =>
      shouldHandle(fillLabelsFnParams, context),
    );

    if (endHandlers.length + resultHandlers.length + errorHandlers.length === 0) {
      return undefined;
    }

    const startTime = Date.now();

    function handleResult({ result }: { result: ExecutionResult }) {
      const totalTime = (Date.now() - startTime) / 1000;
      const args = { params: fillLabelsFnParams!, context, totalTime, result };
      resultHandlers.forEach(({ handler }) => handler(args));
    }

    const handleEnd = () => {
      const totalTime = (Date.now() - startTime) / 1000;
      const args = { params: fillLabelsFnParams, context, totalTime };
      endHandlers.forEach(({ handler }) => handler(args));
    };

    const handleError = ({ error }: { error: unknown }) => {
      const totalTime = (Date.now() - startTime) / 1000;
      const args = { params: fillLabelsFnParams, context, totalTime, error };
      errorHandlers.forEach(({ handler }) => handler(args));
    };

    return {
      onSubscribeResult: ({ result }) => {
        if (isAsyncIterable(result)) {
          return {
            onNext: resultHandlers.length ? handleResult : undefined,
            onEnd: endHandlers.length ? handleEnd : undefined,
          };
        } else {
          handleResult({ result });
          handleEnd();
          return undefined;
        }
      },
      onSubscribeError: errorHandlers.length ? handleError : undefined,
    };
  };

  const onPluginInit: OnPluginInitHook<{}> = payload => {
    for (const handler of phasesToHook.pluginInit) {
      handler(payload);
    }
  };

  const onEnveloped: OnEnvelopedHook<{}> = payload => {
    for (const handler of phasesToHook.enveloped) {
      handler(payload);
    }
  };

  const onSchemaChange: OnSchemaChangeHook = payload => {
    for (const handler of phasesToHook.schema) {
      handler(payload);
    }
  };

  return {
    onParse, // onParse is required, because it sets up the label params WeakMap
    onSchemaChange: phasesToHook.schema.length ? onSchemaChange : undefined,
    onPluginInit: phasesToHook.pluginInit.length ? onPluginInit : undefined,
    onEnveloped: phasesToHook.enveloped.length ? onEnveloped : undefined,
    onValidate: phasesToHook.validate.length ? onValidate : undefined,
    onContextBuilding: phasesToHook.context.length ? onContextBuilding : undefined,
    onExecute:
      phasesToHook.execute.end.length + phasesToHook.execute.result.length ? onExecute : undefined,
    onSubscribe:
      phasesToHook.subscribe.end.length +
      phasesToHook.subscribe.result.length +
      phasesToHook.subscribe.error.length
        ? onSubscribe
        : undefined,
  };
};
