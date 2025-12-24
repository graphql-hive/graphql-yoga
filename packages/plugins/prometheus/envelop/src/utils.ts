import {
  ASTNode,
  DocumentNode,
  GraphQLError,
  GraphQLResolveInfo,
  OperationDefinitionNode,
  TypeInfo,
  visit,
  visitWithTypeInfo,
} from 'graphql';
import {
  Counter,
  register as defaultRegistry,
  Histogram,
  Summary,
  type CounterConfiguration,
  type HistogramConfiguration,
  type Registry,
  type SummaryConfiguration,
} from 'prom-client';
import { AfterParseEventPayload } from '@envelop/core';
import { PrometheusTracingPluginConfig } from './config.js';

const histograms = new WeakMap<Registry, Map<string, Histogram>>();
const summaries = new WeakMap<Registry, Map<string, Summary>>();
const counters = new WeakMap<Registry, Map<string, Counter>>();

export type DeprecatedFieldInfo = {
  fieldName: string;
  typeName: string;
};

export type FillLabelsFnParams = {
  document?: DocumentNode;
  operationName?: string;
  operationType?: OperationDefinitionNode['operation'];
  info?: GraphQLResolveInfo;
  errorPhase?: string;
  error?: GraphQLError;
  deprecationInfo?: DeprecatedFieldInfo;
};

export function shouldTraceFieldResolver(
  info: GraphQLResolveInfo,
  whitelist: string[] | undefined,
): boolean {
  if (!whitelist) {
    return true;
  }

  const parentType = info.parentType.name;
  const fieldName = info.fieldName;
  const coordinate = `${parentType}.${fieldName}`;

  return whitelist.includes(coordinate) || whitelist.includes(`${parentType}.*`);
}

function getOperation(document: DocumentNode): OperationDefinitionNode {
  return document.definitions[0] as OperationDefinitionNode;
}

export function createFillLabelFnParams(
  parseResult: AfterParseEventPayload<any>['result'],
  context: any,
  filterParams: (params: FillLabelsFnParams) => FillLabelsFnParams | null,
): FillLabelsFnParams | null {
  if (parseResult === null) {
    return null;
  }
  if (parseResult instanceof Error) {
    return null;
  }
  const operation = getOperation(parseResult);
  return filterParams({
    document: parseResult,
    operationName: context?.params?.operationName || operation.name?.value || 'Anonymous',
    operationType: operation.operation,
  });
}

export type FillLabelsFn<LabelNames extends string, Params extends Record<string, any>> = (
  params: Params,
  rawContext: any,
) => Record<LabelNames, string | number>;

export type ShouldObservePredicate<Params extends Record<string, any>> = (
  params: Params,
  rawContext: any,
) => boolean;

export type HistogramAndLabels<
  Phases,
  LabelNames extends string,
  Params extends Record<string, any>,
> = {
  histogram: Histogram<LabelNames>;
  fillLabelsFn: FillLabelsFn<LabelNames, Params>;
  phases?: AtLeastOne<Phases>;
  shouldObserve?: ShouldObservePredicate<Params>;
};

export function registerHistogram<LabelNames extends string>(
  registry: Registry,
  conf: Omit<HistogramConfiguration<LabelNames>, 'registers'>,
): Histogram<LabelNames> {
  if (!histograms.has(registry)) {
    histograms.set(registry, new Map());
  }
  const registryHistograms = histograms.get(registry)!;
  if (!registryHistograms.has(conf.name)) {
    (conf as HistogramConfiguration<LabelNames>).registers = [registry];
    registryHistograms.set(conf.name, new Histogram(conf));
  }
  return registryHistograms.get(conf.name)!;
}

/**
 * Histogram metric factory allowing to define custom metrics with advanced configuration.
 * @param options
 * @returns
 */
export function createHistogram<
  Phases,
  LabelNames extends string,
  Params extends Record<string, any> = FillLabelsFnParams,
>(options: {
  /**
   * The registry to be used by the plugin. If you don't have a custom registry,
   * use `register` exported variable from `prom-client`.
   */
  registry: Registry;
  /**
   * The configuration of the histogram, as expected by the `prom-client` library.
   */
  histogram: Omit<HistogramConfiguration<LabelNames>, 'registers'>;
  /**
   * A function called when an event is observed to extract labels values from the context.
   */
  fillLabelsFn: FillLabelsFn<LabelNames, Params>;
  /**
   * A list of GraphQL pipeline phases which will be observed by this metric.
   *
   * The possible values accepted in this list depends on the metric,
   * please refer to metric type or documentation to know which phases ar available.
   *
   * By default, all available phases are observed
   */
  phases?: AtLeastOne<Phases>;
  /**
   * A function called for each event that can be observed.
   * If it is provided, an event will be observed only if it returns true.
   *
   * By default, all events are observed.
   */
  shouldObserve?: ShouldObservePredicate<Params>;
}): HistogramAndLabels<Phases, LabelNames, Params> {
  return {
    histogram: registerHistogram(options.registry, options.histogram),
    fillLabelsFn: options.fillLabelsFn,
    phases: options.phases,
    shouldObserve: options.shouldObserve ?? (() => true),
  };
}

export type SummaryAndLabels<
  Phases,
  LabelNames extends string,
  Params extends Record<string, any>,
> = {
  summary: Summary<LabelNames>;
  fillLabelsFn: FillLabelsFn<LabelNames, Params>;
  phases?: AtLeastOne<Phases>;
  shouldObserve?: ShouldObservePredicate<Params>;
};

export function registerSummary<LabelNames extends string>(
  registry: Registry,
  conf: Omit<SummaryConfiguration<LabelNames>, 'registers'>,
): Summary<LabelNames> {
  if (!summaries.has(registry)) {
    summaries.set(registry, new Map());
  }
  const registrySummaries = summaries.get(registry)!;
  if (!registrySummaries.has(conf.name)) {
    (conf as HistogramConfiguration<LabelNames>).registers = [registry];
    registrySummaries.set(conf.name, new Summary(conf));
  }
  return registrySummaries.get(conf.name)!;
}

/**
 * Summary metric factory allowing to define custom metrics with advanced configuration.
 * @param options
 * @returns
 */
export function createSummary<
  Phases,
  LabelNames extends string,
  Params extends Record<string, any> = FillLabelsFnParams,
>(options: {
  /**
   * The registry to be used by the plugin. If you don't have a custom registry,
   * use `register` exported variable from `prom-client`.
   */
  registry: Registry;
  /**
   * The configuration of the summary, as expected by the `prom-client` library.
   */
  summary: Omit<SummaryConfiguration<LabelNames>, 'registers'>;
  /**
   * A function called when an event is observed to extract labels values from the context.
   */
  fillLabelsFn: FillLabelsFn<LabelNames, Params>;
  /**
   * A list of GraphQL pipeline phases which will be observed by this metric.
   *
   * The possible values accepted in this list depends on the metric,
   * please refer to metric type or documentation to know which phases ar available.
   *
   * By default, all available phases are observed
   */
  phases?: AtLeastOne<Phases>;
  /**
   * A function called for each event that can be observed.
   * If it is provided, an event will be observed only if it returns true.
   *
   * By default, all events are observed.
   */
  shouldObserve?: ShouldObservePredicate<Params>;
}): SummaryAndLabels<Phases, LabelNames, Params> {
  return {
    summary: registerSummary(options.registry, options.summary),
    fillLabelsFn: options.fillLabelsFn,
    phases: options.phases,
    shouldObserve: options.shouldObserve ?? (() => true),
  };
}

export type CounterAndLabels<
  Phases,
  LabelNames extends string,
  Params extends Record<string, any>,
> = {
  counter: Counter<LabelNames>;
  fillLabelsFn: FillLabelsFn<LabelNames, Params>;
  phases?: AtLeastOne<Phases>;
  shouldObserve?: ShouldObservePredicate<Params>;
};

/**
 * Counter metric factory allowing to define custom metrics with advanced configuration.
 * @param options
 * @returns
 */
export function registerCounter<LabelNames extends string>(
  registry: Registry,
  conf: Omit<CounterConfiguration<LabelNames>, 'registers'>,
): Counter<LabelNames> {
  if (!counters.has(registry)) {
    counters.set(registry, new Map());
  }
  const registryCounters = counters.get(registry)!;
  if (!registryCounters.has(conf.name)) {
    (conf as CounterConfiguration<LabelNames>).registers = [registry];
    registryCounters.set(conf.name, new Counter(conf));
  }
  return registryCounters.get(conf.name)!;
}

export function createCounter<
  Phases,
  LabelNames extends string,
  Params extends Record<string, any> = FillLabelsFnParams,
>(options: {
  /**
   * The registry to be used by the plugin. If you don't have a custom registry,
   * use `register` exported variable from `prom-client`.
   */
  registry: Registry;
  /**
   * The configuration of the counter, as expected by the `prom-client` library.
   */
  counter: Omit<CounterConfiguration<LabelNames>, 'registers'>;
  /**
   * A function called when an event is observed to extract labels values from the context.
   */
  fillLabelsFn: FillLabelsFn<LabelNames, Params>;
  /**
   * A list of GraphQL pipeline phases which will be observed by this metric.
   *
   * The possible values accepted in this list depends on the metric,
   * please refer to metric type or documentation to know which phases ar available.
   *
   * By default, all available phases are observed
   */
  phases?: AtLeastOne<Phases>;
  /**
   * A function called for each event that can be observed.
   * If it is provided, an event will be observed only if it returns true.
   *
   * By default, all events are observed.
   */
  shouldObserve?: ShouldObservePredicate<Params>;
}): CounterAndLabels<Phases, LabelNames, Params> {
  return {
    counter: registerCounter(options.registry, options.counter),
    fillLabelsFn: options.fillLabelsFn,
    phases: options.phases,
    shouldObserve: options.shouldObserve,
  };
}

export function getHistogramFromConfig<
  Phases,
  MetricOptions,
  Params extends Record<string, any> = FillLabelsFnParams,
>(
  config: PrometheusTracingPluginConfig,
  phase: keyof MetricOptions,
  availablePhases: AtLeastOne<Phases>,
  histogram: Omit<HistogramConfiguration<string>, 'registers' | 'name'>,
  fillLabelsFn: FillLabelsFn<string, Params> = params => ({
    operationName: params.operationName!,
    operationType: params.operationType!,
  }),
): Required<HistogramAndLabels<Phases, string, Params>> | undefined {
  const metric = (config.metrics as MetricOptions)[phase];
  if (!metric) {
    return undefined;
  }

  let phases = availablePhases;
  if (Array.isArray(metric)) {
    if (metric.length === 0) {
      throw TypeError(
        `Bad value provided for 'metrics.${phase.toString()}': the array must contain at least one element`,
      );
    } else if (isBucketsList(metric)) {
      histogram.buckets = metric;
    } else if (isPhasesList(metric)) {
      phases = filterAvailablePhases(metric, availablePhases);
    } else {
      throw TypeError(
        `Bad value provided for 'metrics.${phase.toString()}': the array must contain only numbers (buckets) or string (phases)`,
      );
    }
  } else if (typeof metric === 'object') {
    const customMetric = metric as unknown as HistogramAndLabels<Phases, string, Params>;
    if (!customMetric.phases) {
      customMetric.phases = availablePhases;
    }
    if (!customMetric.shouldObserve) {
      customMetric.shouldObserve = () => true;
    }
    return customMetric as Required<HistogramAndLabels<Phases, string, Params>>;
  }

  return createHistogram({
    registry: config.registry || defaultRegistry,
    histogram: {
      name: typeof metric === 'string' ? metric : (phase as string),
      ...histogram,
      labelNames: (histogram.labelNames ?? ['operationType', 'operationName']).filter(label =>
        labelExists(config, label),
      ),
    },
    fillLabelsFn: (...args) => filterFillParamsFnParams(config, fillLabelsFn(...args)),
    phases,
    shouldObserve: () => true,
  }) as Required<HistogramAndLabels<Phases, string, Params>>;
}

export function getSummaryFromConfig<
  Phases,
  MetricOptions,
  Params extends Record<string, any> = FillLabelsFnParams,
>(
  config: PrometheusTracingPluginConfig,
  phase: keyof MetricOptions,
  availablePhases: AtLeastOne<Phases>,
  summary: Omit<SummaryConfiguration<string>, 'registers' | 'name'>,
  fillLabelsFn: FillLabelsFn<string, Params> = params =>
    filterFillParamsFnParams(config, {
      operationName: params.operationName!,
      operationType: params.operationType!,
    }),
): Required<SummaryAndLabels<Phases, string, Params>> | undefined {
  const metric = (config.metrics as MetricOptions)[phase];

  if (!metric) {
    return undefined;
  }

  let phases = availablePhases;
  if (Array.isArray(metric)) {
    if (metric.length === 0) {
      throw TypeError(
        `Bad value provided for 'metrics.${phase.toString()}': the array must contain at least one element`,
      );
    } else if (isPhasesList(metric)) {
      phases = filterAvailablePhases(metric, availablePhases);
    } else {
      throw new TypeError(
        `Bad value provided for 'metrics.${phase.toString()}': the array must contain only strings (phases)`,
      );
    }
  } else if (typeof metric === 'object') {
    const customMetric = metric as unknown as SummaryAndLabels<Phases, string, Params>;
    if (!customMetric.phases) {
      customMetric.phases = availablePhases;
    }
    if (!customMetric.shouldObserve) {
      customMetric.shouldObserve = () => true;
    }
    return customMetric as Required<SummaryAndLabels<Phases, string, Params>>;
  }

  return createSummary({
    registry: config.registry || defaultRegistry,
    summary: {
      name: typeof metric === 'string' ? metric : (phase as string),
      labelNames: ['operationType', 'operationName'].filter(label => labelExists(config, label)),
      ...summary,
    },
    fillLabelsFn,
    phases,
    shouldObserve: () => true,
  }) as Required<SummaryAndLabels<Phases, string, Params>>;
}

export function getCounterFromConfig<
  Phases,
  MetricOptions,
  Params extends Record<string, any> = FillLabelsFnParams,
>(
  config: PrometheusTracingPluginConfig,
  phase: keyof MetricOptions,
  availablePhases: AtLeastOne<Phases>,
  counter: Omit<CounterConfiguration<string>, 'registers' | 'name'>,
  fillLabelsFn: FillLabelsFn<string, Params> = params =>
    filterFillParamsFnParams(config, {
      operationName: params.operationName!,
      operationType: params.operationType!,
    }),
): Required<CounterAndLabels<Phases, string, Params>> | undefined {
  const metric = (config.metrics as MetricOptions)[phase];
  let phases = availablePhases;

  if (!metric) {
    return undefined;
  }

  if (Array.isArray(metric)) {
    if (metric.length === 0) {
      throw TypeError(
        `Bad value provided for 'metrics.${phase.toString()}': the array must contain at least one element`,
      );
    } else if (isPhasesList(metric)) {
      phases = filterAvailablePhases(metric, availablePhases);
    } else {
      throw new TypeError(
        `Bad value provided for 'metrics.${phase.toString()}': the array must contain only strings (phases)`,
      );
    }
  } else if (typeof metric === 'object') {
    const customMetric = metric as unknown as CounterAndLabels<Phases, string, Params>;
    if (!customMetric.phases) {
      customMetric.phases = availablePhases;
    }
    if (!customMetric.shouldObserve) {
      customMetric.shouldObserve = () => true;
    }
    return customMetric as Required<CounterAndLabels<Phases, string, Params>>;
  }

  return createCounter({
    registry: config.registry || defaultRegistry,
    counter: {
      name: typeof metric === 'string' ? metric : (phase as string),
      labelNames: ['operationType', 'operationName'].filter(label => labelExists(config, label)),
      ...counter,
    },
    fillLabelsFn,
    phases,
    shouldObserve: () => true,
  }) as Required<CounterAndLabels<Phases, string, Params>>;
}

export function extractDeprecatedFields(node: ASTNode, typeInfo: TypeInfo): DeprecatedFieldInfo[] {
  const found: DeprecatedFieldInfo[] = [];

  visit(
    node,
    visitWithTypeInfo(typeInfo, {
      Argument: () => {
        const argument = typeInfo.getArgument();
        const field = typeInfo.getFieldDef();
        if (
          field &&
          argument &&
          (argument.deprecationReason != null || (argument as any).isDeprecated)
        ) {
          found.push({
            fieldName: argument.name,
            // the GraphQLArgument type doesn't contain context regarding the mutation the argument was passed to
            // however, when visiting an argument, typeInfo.getFieldDef returns the mutation
            typeName: field.name, // this is the mutation name
          });
        }
      },

      Field: () => {
        const field = typeInfo.getFieldDef();

        if (field && (field.deprecationReason != null || (field as any).isDeprecated)) {
          found.push({
            fieldName: field.name,
            typeName: typeInfo.getParentType()!.name || '',
          });
        }
      },
    }),
  );

  return found;
}

export function labelExists(config: { labels?: Record<string, unknown> }, label: string): boolean {
  const labelFlag = config.labels?.[label];
  if (labelFlag == null) {
    return true;
  }
  return !!labelFlag;
}

export function filterFillParamsFnParams<T extends string>(
  config: PrometheusTracingPluginConfig,
  params: Partial<Record<T, any>>,
) {
  return Object.fromEntries(
    Object.entries(params).filter(([key]) => labelExists(config, key)),
  ) as Record<T, any>;
}

const clearRegistry = new WeakMap<Registry, () => void>();
export function instrumentRegistry(registry: Registry) {
  if (!clearRegistry.has(registry)) {
    clearRegistry.set(registry, registry.clear.bind(registry));
  }
  registry.clear = () => {
    histograms.delete(registry);
    summaries.delete(registry);
    counters.delete(registry);
    clearRegistry.get(registry)!();
  };
  return registry;
}

export type AtLeastOne<T> = [T, ...T[]];

function isBucketsList(list: any[]): list is number[] {
  return list.every(item => typeof item === 'number');
}
function isPhasesList(list: any[]): list is string[] {
  return list.every(item => typeof item === 'string');
}
function filterAvailablePhases<Phases>(
  phases: string[],
  availablePhases: AtLeastOne<Phases>,
): AtLeastOne<Phases> {
  return availablePhases.filter(phase => phases.includes(phase as string)) as AtLeastOne<Phases>;
}
