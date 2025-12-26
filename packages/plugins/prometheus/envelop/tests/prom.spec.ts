import { buildSchema, print as graphQLPrint, type ASTNode } from 'graphql';
import { Registry } from 'prom-client';
import { useExtendContext, type Plugin } from '@envelop/core';
import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import type {
  CounterMetricOption,
  HistogramMetricOption,
  MetricsConfig,
  SummaryMetricOption,
} from '../src/config.js';
import {
  createCounter,
  createHistogram,
  usePrometheus,
  type PrometheusTracingPluginConfig,
} from '../src/index.js';
import { createSummary, registerHistogram, type FillLabelsFnParams } from '../src/utils.js';

// Graphql.js 16 and 15 produce different results
// Graphql.js 16 output has not trailing \n
// In order to produce the same output we remove any trailing white-space
const print = (ast: ASTNode) => graphQLPrint(ast).replace(/^\s+|\s+$/g, '');

const allMetrics: { [Name in keyof MetricsConfig]-?: true } = {
  graphql_envelop_deprecated_field: true,
  graphql_envelop_error_result: true,
  graphql_envelop_phase_context: true,
  graphql_envelop_phase_execute: true,
  graphql_envelop_phase_parse: true,
  graphql_envelop_phase_subscribe: true,
  graphql_envelop_phase_validate: true,
  graphql_envelop_request: true,
  graphql_envelop_request_duration: true,
  graphql_envelop_request_time_summary: true,
  graphql_envelop_schema_change: true,
  graphql_envelop_execute_resolver: true,
};

describe('Prom Metrics plugin', () => {
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        regularField: String!
        deprecatedField: String @deprecated(reason: "old")
        longField: String!
        errorField: String
      }
      input MutationInput {
        deprecatedField: String @deprecated(reason: "old")
        regularField: String!
      }
      type MutationPayload {
        payloadField: String
      }
      type Mutation {
        mutationWithDeprecatedFields(
          deprecatedInput: String @deprecated(reason: "old")
        ): MutationPayload
      }
    `,
    resolvers: {
      Query: {
        regularField() {
          return 'regular';
        },
        deprecatedField() {
          return 'regular';
        },
        errorField() {
          throw new Error('error');
        },
        async longField() {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve('long');
            }, 500);
          });
        },
      },
      Mutation: {
        mutationWithDeprecatedFields: () => {
          return {
            payloadField: 'a non deprecated field',
          };
        },
      },
    },
  });

  function prepare(
    config: PrometheusTracingPluginConfig,
    registry: Registry = new Registry(),
    plugins: Plugin[] = [],
  ) {
    const plugin = usePrometheus({
      ...config,
      registry,
    });

    const teskit = createTestkit(
      [
        plugin,
        useExtendContext(() => new Promise<void>(resolve => setTimeout(resolve, 250))),
        ...plugins,
      ],
      schema,
    );

    return {
      execute: teskit.execute,
      plugin,
      registry,
      async metricString(name: string) {
        return registry.getSingleMetricAsString(name);
      },
      async allMetrics() {
        return await registry.metrics();
      },
      async metricCount(name: string, sub: string | null = null) {
        const arr = await registry.getMetricsAsJSON();
        const m = arr.find(m => m.name === name);

        if (m) {
          return ((m as any).values || []).filter((v: any) =>
            sub === null ? true : v.metricName === `${name}_${sub}`,
          ).length;
        }

        return 0;
      },
      async metricValue(name: string, sub: string | null = null) {
        const arr = await registry.getMetricsAsJSON();
        const m = arr.find(m => m.name === name);

        if (m) {
          return ((m as any).values || []).find((v: any) =>
            sub === null ? true : v.metricName === `${name}_${sub}`,
          ).value;
        }

        return 0;
      },
    };
  }

  function testHistogram(
    metricName: MetricNames<HistogramMetricOption<any>>,
    phases: [string, ...string[]],
  ) {
    const histogramFactory = (config: object) =>
      //@ts-ignore
      createHistogram({
        ...config,
        histogram: {
          name: metricName,
          help: 'test',
          labelNames: ['operationName', 'operationType'],
        },
      });

    it.each<{ name: string; config: PrometheusTracingPluginConfig }>([
      {
        name: 'given a buckets list',
        config: { metrics: { [metricName]: [0.5, 1, 5, 10] } },
      },
      ...metricEnabledTestCases(metricName, phases, histogramFactory),
    ])(`should monitor timing when $name`, async ({ config }) => {
      const { execute, metricCount, metricString } = prepare(config, config.registry);

      const result = await execute('query { regularField }');
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      expect(await metricCount(metricName, 'count')).toBe(1);
      const metricReport = await metricString(metricName);
      expect(metricReport).toContain(`operationName="Anonymous"`);
      expect(metricReport).toContain(`operationType="query"`);
    });

    it.each<{ name: string; config: PrometheusTracingPluginConfig }>(
      metricDisabledTestCases(metricName, histogramFactory),
    )('should not monitor parse timing when $name', async ({ config }) => {
      const { execute, metricCount } = prepare(config, config.registry);

      const result = await execute('query { regularField }');
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      expect(await metricCount(metricName, 'count')).toBe(0);
    });

    it('should not contain operationName and operationType if disabled', async () => {
      const { execute, metricString } = prepare({
        metrics: {
          [metricName]: true,
        },
        labels: {
          operationName: false,
          operationType: false,
        },
      });

      const result = await execute('query { regularField }');
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      const metricReport = await metricString(metricName);
      expect(metricReport).not.toContain('operationName="Anonymous"');
      expect(metricReport).not.toContain('operationType="query"');
    });

    it('should allow to use a custom name', async () => {
      const { execute, metricCount } = prepare({ metrics: { [metricName]: 'metric_test' } });

      const result = await execute('query { regularField }');
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      expect(await metricCount('metric_test', 'count')).toBe(1);
    });

    it('should allow to use a custom name within a custom config', async () => {
      const registry = new Registry();
      const { execute, metricCount } = prepare(
        {
          metrics: {
            [metricName]: createHistogram({
              registry,
              histogram: {
                name: 'metric_test',
                help: 'test',
                labelNames: ['operationName', 'operationType'],
              },
              fillLabelsFn: params => ({
                operationName: params.operationName!,
                operationType: params.operationType!,
              }),
            }),
          },
        },
        registry,
      );

      const result = await execute('query { regularField }');
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      expect(await metricCount('metric_test', 'count')).toBe(1);
    });

    it('should allow to use custom labelNames', async () => {
      const registry = new Registry();
      const { execute, metricCount, metricString } = prepare(
        {
          metrics: {
            [metricName]: createHistogram({
              registry,
              histogram: {
                name: metricName,
                help: 'HELP ME',
                labelNames: ['opText'] as const,
              },
              fillLabelsFn: params => {
                return {
                  opText: print(params.document!),
                };
              },
            }),
          },
        },
        registry,
      );
      const result = await execute('query { regularField }');
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      expect(await metricCount(metricName, 'count')).toBe(1);
      expect(await metricString(metricName)).toContain(`opText="{\\n  regularField\\n}"`);
    });
  }

  function testSummary(
    metricName: MetricNames<SummaryMetricOption<any>>,
    phases: [string, ...string[]],
  ) {
    const summaryFactory = (config: object) =>
      //@ts-ignore
      createSummary({
        ...config,
        summary: {
          name: metricName,
          help: 'test',
          labelNames: ['operationName', 'operationType'],
        },
      });

    it.each<{ name: string; config: PrometheusTracingPluginConfig }>(
      metricEnabledTestCases(metricName, phases, summaryFactory),
    )(`should monitor timing when $name`, async ({ config }) => {
      const { execute, metricCount, metricString } = prepare(config, config.registry);

      const result = await execute('query { regularField }');
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      expect(await metricCount(metricName, 'count')).toBe(1);
      const metricReport = await metricString(metricName);
      expect(metricReport).toContain(`operationName="Anonymous"`);
      expect(metricReport).toContain(`operationType="query"`);
    });

    it.each<{ name: string; config: PrometheusTracingPluginConfig }>(
      metricDisabledTestCases(metricName, summaryFactory),
    )('should not monitor parse timing when $name', async ({ config }) => {
      const { execute, metricCount } = prepare(config, config.registry);

      const result = await execute('query { regularField }');
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      expect(await metricCount(metricName, 'count')).toBe(0);
    });

    it('should not contain operationName and operationType if disabled', async () => {
      const { execute, metricString } = prepare({
        metrics: {
          [metricName]: true,
        },
        labels: {
          operationName: false,
          operationType: false,
        },
      });

      const result = await execute('query { regularField }');
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      const metricReport = await metricString(metricName);
      expect(metricReport).not.toContain('operationName="Anonymous"');
      expect(metricReport).not.toContain('operationType="query"');
    });

    it('should allow to use a custom name', async () => {
      const { execute, metricCount } = prepare({ metrics: { [metricName]: 'metric_test' } });

      const result = await execute('query { regularField }');
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      expect(await metricCount('metric_test', 'count')).toBe(1);
    });

    it('should allow to use a custom name within a custom config', async () => {
      const registry = new Registry();
      const { execute, metricCount } = prepare(
        {
          metrics: {
            [metricName]: createSummary({
              registry,
              summary: {
                name: 'metric_test',
                help: 'test',
                labelNames: ['operationName', 'operationType'],
              },
              fillLabelsFn: params => ({
                operationName: params.operationName!,
                operationType: params.operationType!,
              }),
            }),
          },
        },
        registry,
      );

      const result = await execute('query { regularField }');
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      expect(await metricCount('metric_test', 'count')).toBe(1);
    });

    it('should allow to use custom labelNames', async () => {
      const registry = new Registry();
      const { execute, metricCount, metricString } = prepare(
        {
          metrics: {
            [metricName]: createSummary({
              registry,
              summary: {
                name: metricName,
                help: 'HELP ME',
                labelNames: ['opText'] as const,
              },
              fillLabelsFn: params => {
                return {
                  opText: print(params.document!),
                };
              },
            }),
          },
        },
        registry,
      );
      const result = await execute('query { regularField }');
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      expect(await metricCount(metricName, 'count')).toBe(1);
      expect(await metricString(metricName)).toContain(`opText="{\\n  regularField\\n}"`);
    });
  }

  function testCounter(
    metricName: MetricNames<CounterMetricOption<any>>,
    phases: [string, ...string[]],
    query = 'query { regularField }',
  ) {
    const counterFactory = (config: object) =>
      //@ts-ignore
      createCounter({
        ...config,
        counter: {
          name: metricName,
          help: 'HELP ME',
          labelNames: ['operationName', 'operationType'],
        },
      });

    it.each<{ name: string; config: PrometheusTracingPluginConfig }>(
      metricEnabledTestCases(metricName, phases, counterFactory),
    )(`should monitor timing when $name`, async ({ config }) => {
      const { execute, metricCount, metricString } = prepare(config, config.registry);

      const result = await execute(query);
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      expect(await metricCount(metricName)).toBe(1);
      const metricReport = await metricString(metricName);
      expect(metricReport).toContain(`operationName="Anonymous"`);
      expect(metricReport).toContain(`operationType="query"`);
    });

    it.each<{ name: string; config: PrometheusTracingPluginConfig }>(
      metricDisabledTestCases(metricName, counterFactory),
    )('should not monitor parse timing when $name', async ({ config }) => {
      const { execute, metricCount } = prepare(config, config.registry);

      const result = await execute(query);
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      expect(await metricCount(metricName)).toBe(0);
    });

    it('should not contain operationName and operationType if disabled', async () => {
      const { execute, metricString } = prepare({
        metrics: {
          [metricName]: true,
        },
        labels: {
          operationName: false,
          operationType: false,
        },
      });

      const result = await execute(query);
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      const metricReport = await metricString(metricName);
      expect(metricReport).not.toContain('operationName="Anonymous"');
      expect(metricReport).not.toContain('operationType="query"');
    });

    it('should allow to use a custom name', async () => {
      const { execute, metricCount } = prepare({ metrics: { [metricName]: 'metric_test' } });

      const result = await execute(query);
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      expect(await metricCount('metric_test')).toBe(1);
    });

    it('should allow to use a custom name within a custom config', async () => {
      const registry = new Registry();
      const { execute, metricCount } = prepare(
        {
          metrics: {
            [metricName]: createCounter({
              registry,
              counter: {
                name: 'metric_test',
                help: 'test',
                labelNames: ['operationName', 'operationType'],
              },
              fillLabelsFn: params => ({
                operationName: params.operationName!,
                operationType: params.operationType!,
              }),
            }),
          },
        },
        registry,
      );

      const result = await execute(query);
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      expect(await metricCount('metric_test')).toBe(1);
    });

    it('should allow to use custom labelNames', async () => {
      const registry = new Registry();
      const { execute, metricCount, metricString } = prepare(
        {
          metrics: {
            [metricName]: createCounter({
              registry,
              counter: {
                name: metricName,
                help: 'HELP ME',
                labelNames: ['opText'] as const,
              },
              fillLabelsFn: () => {
                return {
                  opText: query,
                };
              },
            }),
          },
        },
        registry,
      );
      const result = await execute(query);
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      expect(await metricCount(metricName)).toBe(1);
      expect(await metricString(metricName)).toContain(`opText="${query}"`);
    });
  }

  it('integration', async () => {
    const { execute, allMetrics } = prepare({
      metrics: {
        graphql_envelop_error_result: true,
        graphql_envelop_phase_execute: true,
        graphql_envelop_phase_parse: true,
        graphql_envelop_phase_validate: true,
        graphql_envelop_phase_context: true,
        graphql_envelop_deprecated_field: true,
        graphql_envelop_execute_resolver: true,
      },
    });
    const result = await execute('query { regularField longField deprecatedField }');
    assertSingleExecutionValue(result);

    expect(result.errors).toBeUndefined();
    const metricsStr = await allMetrics();

    expect(metricsStr).toContain('graphql_envelop_phase_parse_count{');
    expect(metricsStr).toContain('graphql_envelop_phase_validate_count{');
    expect(metricsStr).toContain('graphql_envelop_phase_context_count{');
    expect(metricsStr).toContain('graphql_envelop_phase_execute_count{');
    expect(metricsStr).toContain('graphql_envelop_execute_resolver_count{');
    expect(metricsStr).toContain('graphql_envelop_deprecated_field{');
    expect(metricsStr).not.toContain('graphql_envelop_error_result{');
  });

  it(`should limit its impact on perf by not adding unnecessary hooks`, () => {
    const plugin = usePrometheus({
      metrics: {},
    });

    const hooks = Object.entries(plugin)
      .filter(([, value]) => value)
      .map(([key]) => key);

    // onParse is the only required hook, it sets up the params for most metric labels
    expect(hooks).toEqual(['onParse']);
  });

  describe('parse', () => {
    it('should not allow empty arrays', () => {
      expect(
        // @ts-expect-error Empty array should be disallowed
        () => usePrometheus({ metrics: { graphql_envelop_phase_parse: [] } }),
      ).toThrow();
    });

    // testHistogram('graphql_envelop_phase_parse', ['parse']);

    it('should allow to use custom Histogram and custom labelNames', async () => {
      const registry = new Registry();
      const { execute, metricCount, metricString } = prepare(
        {
          metrics: {
            graphql_envelop_phase_parse: createHistogram({
              registry,
              histogram: {
                name: 'test_parse',
                help: 'HELP ME',
                labelNames: ['opText'] as const,
              },
              fillLabelsFn: params => {
                return {
                  opText: print(params.document!),
                };
              },
            }),
          },
        },
        registry,
      );
      const result = await execute('query { regularField }');
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      expect(await metricCount('test_parse', 'count')).toBe(1);
      expect(await metricString('test_parse')).toContain(
        `test_parse_count{opText=\"{\\n  regularField\\n}\"} 1`,
      );
    });
  });

  describe('validate', () => {
    it('should not allow empty arrays', () => {
      expect(
        // @ts-expect-error Empty array should be disallowed
        () => usePrometheus({ metrics: { graphql_envelop_phase_validate: [] } }),
      ).toThrow();
    });

    // testHistogram('graphql_envelop_phase_validate', ['validate']);

    it('should allow to use custom Histogram and custom labelNames', async () => {
      const registry = new Registry();
      const { execute, metricCount, metricString } = prepare(
        {
          metrics: {
            graphql_envelop_phase_validate: createHistogram({
              registry,
              histogram: {
                name: 'test_validate',
                help: 'HELP ME',
                labelNames: ['opText'] as const,
              },
              fillLabelsFn: params => {
                return {
                  opText: print(params.document!),
                };
              },
            }),
          },
        },
        registry,
      );
      const result = await execute('query { regularField }');
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      expect(await metricCount('test_validate', 'count')).toBe(1);
      expect(await metricString('test_validate')).toContain(
        `test_validate_count{opText=\"{\\n  regularField\\n}\"} 1`,
      );
    });

    it('should trace timing even when an error occurs', async () => {
      const { execute, metricCount } = prepare({
        metrics: {
          graphql_envelop_phase_validate: true,
        },
      });
      const result = await execute('query test($v: String!) { regularField }');
      assertSingleExecutionValue(result);

      expect(result.errors?.length).toBe(1);
      expect(await metricCount('graphql_envelop_phase_validate', 'count')).toBe(1);
    });
  });

  describe('contextBuilding', () => {
    it('should not allow empty arrays', () => {
      expect(
        // @ts-expect-error Empty array should be disallowed
        () => usePrometheus({ metrics: { graphql_envelop_phase_context: [] } }),
      ).toThrow();
    });

    testHistogram('graphql_envelop_phase_context', ['context']);

    it('should allow to use custom Histogram and custom labelNames', async () => {
      const registry = new Registry();
      const { execute, metricCount, metricString } = prepare(
        {
          metrics: {
            graphql_envelop_phase_context: createHistogram({
              registry,
              histogram: {
                name: 'test_context',
                help: 'HELP ME',
                labelNames: ['opText'] as const,
              },
              fillLabelsFn: params => {
                return {
                  opText: print(params.document!),
                };
              },
            }),
          },
        },
        registry,
      );
      const result = await execute('query { regularField }');
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      expect(await metricCount('test_context', 'count')).toBe(1);
      expect(await metricString('test_context')).toContain(
        `test_context_count{opText=\"{\\n  regularField\\n}\"} 1`,
      );
    });

    it('should trace timing even when an error occurs', async () => {
      const registry = new Registry();
      const { execute, metricValue } = prepare(
        {
          metrics: {
            graphql_envelop_phase_context: true,
          },
        },
        registry,
        [
          useExtendContext<any>(() => {
            throw new Error('error');
          }),
        ],
      );

      try {
        await execute('query { regularField }');
      } catch (e) {}
      expect(await metricValue('graphql_envelop_phase_context', 'count')).toBe(1);
    });

    // it('should trace error during contextBuilding', async () => {
    //   const registry = new Registry();
    //   const testKit = createTestkit(
    //     [
    //       usePrometheus({
    //         metrics: {
    //           graphql_envelop_error_result: true,
    //         },
    //         registry,
    //       }),
    //       useExtendContext<any>(() => {
    //         throw new Error('error');
    //       }),
    //     ],
    //     schema,
    //   );
    //   try {
    //     await testKit.execute('query { regularField }');
    //   } catch (e) {}
    //   const metrics = await registry.getMetricsAsJSON();
    //   expect(metrics).toEqual([
    //     {
    //       help: 'Counts the amount of errors reported from all phases',
    //       name: 'graphql_envelop_error_result',
    //       type: 'counter',
    //       values: [
    //         {
    //           labels: {
    //             operationName: 'Anonymous',
    //             operationType: 'query',
    //             phase: 'context',
    //           },
    //           value: 1,
    //         },
    //       ],
    //       aggregator: 'sum',
    //     },
    //   ]);
    // });
  });

  describe('execute', () => {
    it('should not allow empty arrays', () => {
      expect(
        // @ts-expect-error Empty array should be disallowed
        () => usePrometheus({ metrics: { graphql_envelop_phase_execute: [] } }),
      ).toThrow();
    });

    testHistogram('graphql_envelop_phase_execute', ['execute']);

    it('should allow to use custom Histogram and custom labelNames', async () => {
      const registry = new Registry();
      const { execute, metricCount, metricString } = prepare(
        {
          metrics: {
            graphql_envelop_phase_execute: createHistogram({
              registry,
              histogram: {
                name: 'test_execute',
                help: 'HELP ME',
                labelNames: ['opText'] as const,
              },
              fillLabelsFn: params => {
                return {
                  opText: print(params.document!),
                };
              },
            }),
          },
        },
        registry,
      );
      const result = await execute('query { regularField }');
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      expect(await metricCount('test_execute', 'count')).toBe(1);
      expect(await metricString('test_execute')).toContain(
        `test_execute_count{opText=\"{\\n  regularField\\n}\"} 1`,
      );
    });

    // it('should trace error during execute with a single error', async () => {
    //   const { execute, metricCount, metricString } = prepare({
    //     metrics: {
    //       graphql_envelop_error_result: true,
    //     },
    //   });
    //   const result = await execute('query { errorField }');
    //   assertSingleExecutionValue(result);

    //   expect(result.errors?.length).toBe(1);
    //   expect(await metricString('graphql_envelop_error_result')).toContain(
    //     'graphql_envelop_error_result{operationName="Anonymous",operationType="query",phase="execute",path="errorField"} 1',
    //   );
    //   expect(await metricCount('graphql_envelop_error_result')).toBe(1);
    // });

    // it('should trace error during execute with a multiple errors', async () => {
    //   const { execute, metricCount, metricString } = prepare({
    //     metrics: {
    //       graphql_envelop_error_result: true,
    //     },
    //   });
    //   const result = await execute('query { errorField test: errorField }');
    //   assertSingleExecutionValue(result);

    //   expect(result.errors?.length).toBe(2);
    //   expect(await metricString('graphql_envelop_error_result')).toContain(
    //     'graphql_envelop_error_result{operationName="Anonymous",operationType="query",phase="execute",path="errorField"} 1',
    //   );
    //   expect(await metricCount('graphql_envelop_error_result')).toBe(2);
    // });

    it('should trace timing even if an error occurs', async () => {
      const { execute, metricCount } = prepare({
        metrics: {
          graphql_envelop_phase_execute: true,
        },
      });
      const result = await execute('query { errorField test: errorField }');
      assertSingleExecutionValue(result);

      expect(result.errors?.length).toBe(2);
      expect(await metricCount('graphql_envelop_phase_execute', 'count')).toBe(1);
    });
  });

  describe('errors', () => {
    it('should not allow empty arrays', () => {
      expect(
        // @ts-expect-error Empty array should be disallowed
        () => usePrometheus({ metrics: { graphql_envelop_error_result: [] } }),
      ).toThrow();
    });

    const errorMetricFactory = (config: any) =>
      createCounter({
        ...config,
        counter: {
          name: 'graphql_envelop_error_result',
          help: 'HELP ME',
          labelNames: ['operationType', 'operationName', 'phase'],
        },
        fillLabelsFn: params => ({
          operationName: params.operationName!,
          operationType: params.operationType!,
          phase: params.errorPhase!,
        }),
      });

    describe('parse errors', () => {
      it.each(
        metricEnabledTestCases('graphql_envelop_error_result', ['parse'], errorMetricFactory),
      )('should count errors when $name', async ({ config }) => {
        const { execute, metricCount, metricString } = prepare(config, config.registry);
        const result = await execute('query {');
        assertSingleExecutionValue(result);

        expect(result.errors?.length).toBe(1);
        expect(await metricCount('graphql_envelop_error_result')).toBe(1);
        expect(await metricString('graphql_envelop_error_result')).toContain('phase="parse"');
      });

      it.each(
        metricDisabledTestCases('graphql_envelop_error_result', errorMetricFactory, [
          'validate',
          'context',
          'execute',
          'subscribe',
        ]),
      )('should not count error when $name', async ({ config }) => {
        const { execute, metricCount } = prepare(config, config.registry);
        const result = await execute('query {');
        assertSingleExecutionValue(result);

        expect(result.errors?.length).toBe(1);
        expect(await metricCount('graphql_envelop_error_result')).toBe(0);
      });
    });

    describe('validate errors', () => {
      it.each(
        metricEnabledTestCases('graphql_envelop_error_result', ['validate'], errorMetricFactory),
      )('should count errors when $name', async ({ config }) => {
        const { execute, metricCount, metricString } = prepare(config, config.registry);
        const result = await execute('query test($v: String!) { regularField }');
        assertSingleExecutionValue(result);

        expect(result.errors?.length).toBe(1);
        expect(await metricCount('graphql_envelop_error_result')).toBe(1);
        const errorReport = await metricString('graphql_envelop_error_result');
        expect(errorReport).toContain('phase="validate"');
      });

      it.each(
        metricDisabledTestCases('graphql_envelop_error_result', errorMetricFactory, [
          'parse',
          'context',
          'execute',
          'subscribe',
        ]),
      )('should not count error when $name', async ({ config }) => {
        const { execute, metricCount } = prepare(config, config.registry);
        const result = await execute('query test($v: String!) { regularField }');
        assertSingleExecutionValue(result);

        expect(result.errors?.length).toBe(1);
        expect(await metricCount('graphql_envelop_error_result')).toBe(0);
      });
    });

    describe('context errors', () => {
      it.each(
        metricEnabledTestCases('graphql_envelop_error_result', ['context'], errorMetricFactory),
      )('should count errors when $name', async ({ config }) => {
        const { execute, metricCount, metricString } = prepare(config, config.registry, [
          useExtendContext<any>(() => {
            throw new Error('error');
          }),
        ]);

        await expect(execute('query { regularField }')).rejects.toThrow();

        expect(await metricCount('graphql_envelop_error_result')).toBe(1);
        const errorReport = await metricString('graphql_envelop_error_result');
        expect(errorReport).toContain('phase="context"');
      });

      it.each(
        metricDisabledTestCases('graphql_envelop_error_result', errorMetricFactory, [
          'parse',
          'validate',
          'execute',
          'subscribe',
        ]),
      )('should not count error when $name', async ({ config }) => {
        const { execute, metricCount } = prepare(config, config.registry, [
          useExtendContext<any>(() => {
            throw new Error('error');
          }),
        ]);
        await expect(execute('query { regularField }')).rejects.toThrow();
        expect(await metricCount('graphql_envelop_error_result')).toBe(0);
      });
    });

    describe('execute errors', () => {
      it.each(
        metricEnabledTestCases('graphql_envelop_error_result', ['execute'], errorMetricFactory),
      )('should count errors when $name', async ({ config }) => {
        const { execute, metricCount, metricString } = prepare(
          config,
          config.registry ?? new Registry(),
        );
        const result = await execute('query { errorField }');
        assertSingleExecutionValue(result);

        expect(result.errors?.length).toBe(1);
        expect(await metricCount('graphql_envelop_error_result')).toBe(1);

        const errorReport = await metricString('graphql_envelop_error_result');
        expect(errorReport).toContain('phase="execute"');
        expect(errorReport).toContain('operationName="Anonymous');
        expect(errorReport).toContain('operationType="query"');
      });

      it.each(
        metricDisabledTestCases('graphql_envelop_error_result', errorMetricFactory, [
          'parse',
          'validate',
          'context',
          'subscribe',
        ]),
      )('should not count error when $name', async ({ config }) => {
        const { execute, metricCount } = prepare(config, config.registry);
        const result = await execute('query { errorField }');
        assertSingleExecutionValue(result);

        expect(result.errors?.length).toBe(1);
        expect(await metricCount('graphql_envelop_error_result')).toBe(0);
      });
    });

    it('should allow to use custom Counter and custom labelNames', async () => {
      const registry = new Registry();
      const { execute, metricCount, metricString } = prepare(
        {
          metrics: {
            graphql_envelop_error_result: createCounter({
              registry,
              counter: {
                name: 'test_error',
                help: 'HELP ME',
                labelNames: ['opText', 'errorMessage'] as const,
              },
              fillLabelsFn: params => {
                return {
                  opText: print(params.document!),
                  errorMessage: params.error!.message,
                };
              },
            }),
          },
        },
        registry,
      );
      const result = await execute('query { errorField }');
      assertSingleExecutionValue(result);

      expect(result.errors?.length).toBe(1);
      expect(await metricCount('test_error')).toBe(1);
      expect(await metricString('test_error')).toContain(
        `test_error{opText=\"{\\n  errorField\\n}\",errorMessage=\"error\"} 1`,
      );
    });
    it('should allow to use custom name', async () => {
      const registry = new Registry();
      const { execute, metricCount } = prepare(
        {
          metrics: {
            graphql_envelop_error_result: 'test_error',
          },
        },
        registry,
      );
      const result = await execute('query { errorField }');
      assertSingleExecutionValue(result);

      expect(result.errors?.length).toBe(1);
      expect(await metricCount('test_error')).toBe(1);
    });
  });

  describe('resolvers', () => {
    it('should not allow empty arrays', () => {
      expect(
        // @ts-expect-error Empty array should be disallowed
        () => usePrometheus({ metrics: { graphql_envelop_error_result: [] } }),
      ).toThrow();
    });

    testHistogram('graphql_envelop_execute_resolver', ['execute']);

    it('should trace all resolvers times correctly', async () => {
      const { execute, metricCount, metricString } = prepare({
        metrics: {
          graphql_envelop_execute_resolver: true,
        },
      });
      const result = await execute('query { regularField }');
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      expect(await metricCount('graphql_envelop_execute_resolver', 'count')).toBe(1);
      expect(await metricString('graphql_envelop_execute_resolver')).toContain(
        'graphql_envelop_execute_resolver_count{operationName="Anonymous",operationType="query",fieldName="regularField",typeName="Query",returnType="String!"} 1',
      );
    });

    it('should allow custom metric options', async () => {
      const registry = new Registry();
      const { execute, metricCount, metricString } = prepare(
        {
          metrics: {
            graphql_envelop_execute_resolver: createHistogram({
              registry,
              fillLabelsFn: ({ document }) => ({
                opText: print(document!),
              }),
              histogram: {
                name: 'graphql_envelop_execute_resolver',
                help: 'test',
                labelNames: ['opText'] as const,
              },
            }),
          },
        },
        registry,
      );
      const result = await execute('query { regularField }');
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      expect(await metricCount('graphql_envelop_execute_resolver', 'count')).toBe(1);
      expect(await metricString('graphql_envelop_execute_resolver')).toContain(
        'graphql_envelop_execute_resolver_count{opText="{\\n  regularField\\n}"} 1',
      );
    });

    it('should trace only specified resolvers when resolversWhitelist is used', async () => {
      const { execute, metricCount, metricString } = prepare({
        metrics: {
          graphql_envelop_execute_resolver: true,
        },
        resolversWhitelist: ['Query.regularField'],
      });
      const result = await execute('query { regularField longField }');
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      expect(await metricCount('graphql_envelop_execute_resolver', 'count')).toBe(1);
      expect(await metricString('graphql_envelop_execute_resolver')).toContain(
        'graphql_envelop_execute_resolver_count{operationName="Anonymous",operationType="query",fieldName="regularField",typeName="Query",returnType="String!"} 1',
      );
    });
  });

  describe('deprecation', () => {
    it('should not allow empty arrays', () => {
      expect(
        // @ts-expect-error Empty array should be disallowed
        () => usePrometheus({ metrics: { graphql_envelop_deprecated_field: [] } }),
      ).toThrow();
    });

    testCounter('graphql_envelop_deprecated_field', ['parse'], 'query { deprecatedField }');

    it('should track deprecated arguments in mutation', async () => {
      const { execute, metricCount, allMetrics, metricString } = prepare({
        metrics: {
          graphql_envelop_deprecated_field: true,
        },
      });
      const result = await execute(
        /* GraphQL */ `
          mutation MutationWithDeprecatedFields($deprecatedInput: String) {
            mutationWithDeprecatedFields(deprecatedInput: $deprecatedInput) {
              payloadField
            }
          }
        `,
        {
          deprecatedInput: 'a deprecated input',
        },
      );
      assertSingleExecutionValue(result);

      await allMetrics();

      expect(result.errors).toBeUndefined();
      expect(await metricCount('graphql_envelop_deprecated_field')).toBe(1);

      const metric = await metricString('graphql_envelop_deprecated_field');
      expect(metric).toContain(
        '{operationName="MutationWithDeprecatedFields",operationType="mutation",fieldName="deprecatedInput",typeName="mutationWithDeprecatedFields"}',
      );
    });
  });

  describe('requestCount', () => {
    it('should not allow empty arrays', () => {
      expect(
        // @ts-expect-error Empty array should be disallowed
        () => usePrometheus({ metrics: { graphql_envelop_request: [] } }),
      ).toThrow();
    });

    testCounter('graphql_envelop_request', ['execute', 'subscribe']);

    it('should not count requests when execute phase is disabled', async () => {
      const { execute, metricCount } = prepare({
        metrics: {
          graphql_envelop_request: ['subscribe'],
        },
      });
      const result = await execute('query { regularField }');
      assertSingleExecutionValue(result);

      expect(result.errors).toBeUndefined();
      expect(await metricCount('graphql_envelop_request')).toBe(0);
    });

    it('should trace all successful requests, with multiple req', async () => {
      const { execute, metricValue } = prepare({
        metrics: {
          graphql_envelop_request: true,
        },
      });
      const result1 = await execute('query { regularField }');
      const result2 = await execute('query { regularField }');
      assertSingleExecutionValue(result1);
      assertSingleExecutionValue(result2);

      expect(result1.errors).toBeUndefined();
      expect(result2.errors).toBeUndefined();
      expect(await metricValue('graphql_envelop_request')).toBe(2);
    });
  });

  describe('requestSummary', () => {
    it('should not allow empty arrays', () => {
      expect(
        // @ts-expect-error Empty array should be disallowed
        () => usePrometheus({ metrics: { graphql_envelop_request_time_summary: [] } }),
      ).toThrow();
    });

    testSummary('graphql_envelop_request_time_summary', ['execute', 'subscribe']);
  });

  describe('schema', () => {
    it('should not allow empty arrays', () => {
      expect(
        // @ts-expect-error Empty array should be disallowed
        () => usePrometheus({ metrics: { graphql_envelop_schema_change: [] } }),
      ).toThrow();
    });

    it('should capture graphql schema changing', async () => {
      const registry = new Registry();
      createTestkit(
        [
          usePrometheus({ registry, metrics: { graphql_envelop_schema_change: true } }),
          {
            onSchemaChange: ({ replaceSchema }) => {
              replaceSchema(
                buildSchema(/* GraphQL */ `
                  type Query {
                    hello: String!
                  }
                `),
              );
            },
          },
        ],
        schema,
      );

      const metrics = await registry.getMetricsAsJSON();
      expect(metrics).toEqual([
        {
          help: 'Counts the amount of schema changes',
          name: 'graphql_envelop_schema_change',
          type: 'counter',
          values: [
            {
              labels: {},
              value: 2,
            },
          ],
          aggregator: 'sum',
        },
      ]);
    });
  });

  it('should be able to be initialized multiple times', async () => {
    const registry = new Registry();
    const allMetrics: PrometheusTracingPluginConfig = {
      metrics: {
        graphql_envelop_request: true,
        graphql_envelop_request_duration: true,
        graphql_envelop_request_time_summary: true,
        graphql_envelop_phase_parse: true,
        graphql_envelop_phase_validate: true,
        graphql_envelop_phase_context: true,
        graphql_envelop_phase_execute: true,
        graphql_envelop_phase_subscribe: true,
        graphql_envelop_error_result: true,
        graphql_envelop_deprecated_field: true,
        graphql_envelop_schema_change: true,
        graphql_envelop_execute_resolver: true,
      },
    };

    prepare(allMetrics, registry); // fake initialization to make sure it doesn't break

    const { execute } = prepare(allMetrics, registry);
    const result = await execute('{ regularField }');
    assertSingleExecutionValue(result);

    expect(result.errors).toBeUndefined();
  });

  it('should be able to register the same histogram for multiple different registries', async () => {
    const registry1 = new Registry();
    const registry2 = new Registry();

    const h1 = registerHistogram(registry1, { name: 'h', help: 'This is a test' });
    const h2 = registerHistogram(registry2, { name: 'h', help: 'This is a test' });

    expect(h1 === h2).toBe(false);
  });

  it('should allow to clear the registry between initializations', async () => {
    const registry = new Registry();

    prepare({ metrics: { graphql_envelop_phase_parse: true } }, registry); // fake initialization to make sure it doesn't break
    registry.clear();
    const { execute, allMetrics } = prepare(
      { metrics: { graphql_envelop_phase_parse: true } },
      registry,
    );
    const result = await execute('{ regularField }');
    assertSingleExecutionValue(result);

    expect(result.errors).toBeUndefined();
    expect(await allMetrics()).toContain('graphql_envelop_phase_parse_count{');
  });
});

function metricEnabledTestCases(
  metricName: MetricNames,
  phases: [string, ...string[]],
  factory: (config: object) => object,
): TestCase[] {
  return [
    {
      name: 'enabled alone',
      config: { metrics: { [metricName]: true } },
    },
    {
      name: 'enabled with all metrics',
      config: { metrics: allMetrics },
    },
    {
      name: 'given a list of phase',
      config: { metrics: { [metricName]: phases } },
    },
    ((registry: Registry) => ({
      name: 'given a custom configuration',
      config: {
        registry,
        metrics: {
          [metricName]: factory({
            registry,
            fillLabelsFn: (params: FillLabelsFnParams) => ({
              operationName: params.operationName!,
              operationType: params.operationType!,
            }),
          }),
        },
      },
    }))(new Registry()),
    ((registry: Registry) => ({
      name: 'given a shouldObserve',
      config: {
        registry,
        metrics: {
          [metricName]: factory({
            registry,
            fillLabelsFn: (params: FillLabelsFnParams) => ({
              operationName: params.operationName!,
              operationType: params.operationType!,
            }),
            shouldObserve: () => true,
          }),
        },
      },
    }))(new Registry()),
    ((registry: Registry) => ({
      name: 'given a custom config and phases',
      config: {
        registry,
        metrics: {
          [metricName]: factory({
            registry,
            fillLabelsFn: (params: FillLabelsFnParams) => ({
              operationName: params.operationName!,
              operationType: params.operationType!,
            }),
            phases,
          }),
        },
      },
    }))(new Registry()),
  ];
}

function metricDisabledTestCases(
  metricName: MetricNames,
  factory: (config: object) => object,
  phases?: [string, ...string[]],
): TestCase[] {
  const cases: TestCase[] = [
    {
      name: 'disabled with false',
      config: { metrics: { [metricName]: false } },
    },
    {
      name: 'disabled with undefined',
      config: { metrics: { [metricName]: undefined } },
    },
    {
      name: 'disabled with all metrics',
      config: { metrics: { ...allMetrics, [metricName]: false } },
    },
    {
      name: 'disabled with all metrics',
      config: { metrics: { ...allMetrics, [metricName]: undefined } },
    },
    ((registry: Registry) => ({
      name: 'given a shouldObserve',
      config: {
        registry,
        metrics: {
          [metricName]: factory({
            registry,
            fillLabelsFn: (params: FillLabelsFnParams) => ({
              operationName: params.operationName!,
              operationType: params.operationType!,
            }),
            shouldObserve: () => false,
          }),
        },
      },
    }))(new Registry()),
  ];
  if (phases) {
    cases.push({
      name: `enabled phases are ${phases}`,
      config: { metrics: { [metricName]: phases } },
    });
  }
  return cases;
}

type MetricNames<V = any> = {
  [K in keyof MetricsConfig]-?: [V] extends [MetricsConfig[K]] ? K : never;
}[keyof MetricsConfig];

type TestCase = {
  name: string;
  config: PrometheusTracingPluginConfig;
};
