import { getIntrospectionQuery } from 'graphql';
import type { StatsD } from 'hot-shots';
import { useExtendContext } from '@envelop/core';
import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { metricNames, StatsDPluginOptions, useStatsD } from '../src/index.js';

function createMetricName(key: keyof typeof metricNames, prefix: string = 'graphql'): string {
  return `${prefix}.${metricNames[key]}`;
}

describe('StatsD plugin', () => {
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        regularField: String!
        errorField: String
      }
    `,
    resolvers: {
      Query: {
        regularField() {
          return 'regular';
        },
        errorField() {
          throw new Error('error');
        },
      },
    },
  });

  function prepare(config: Omit<StatsDPluginOptions, 'client'>) {
    const client = {
      increment: jest.fn(),
      histogram: jest.fn(),
    } as any as StatsD;

    const plugin = useStatsD({
      ...config,
      client,
    });
    const teskit = createTestkit(
      [plugin, useExtendContext(() => new Promise<void>(resolve => setTimeout(resolve, 250)))],
      schema,
    );

    return {
      execute: teskit.execute,
      plugin,
      client,
    };
  }

  test('increase error_count and count on parse error', async () => {
    const { execute, client } = prepare({});
    const result = await execute('query {');
    assertSingleExecutionValue(result);

    expect(result.errors?.length).toBe(1);
    expect(client.histogram).not.toHaveBeenCalled();
    expect(client.increment).toHaveBeenCalledTimes(2);
    expect(client.increment).toHaveBeenCalledWith(createMetricName('errorCount'), undefined);
    expect(client.increment).toHaveBeenCalledWith(createMetricName('operationCount'), undefined);
  });

  test('increase error_count and count on validate error', async () => {
    const { execute, client } = prepare({});
    const result = await execute('query test($v: String!) { regularField }');
    assertSingleExecutionValue(result);

    expect(result.errors?.length).toBe(1);
    expect(client.histogram).not.toHaveBeenCalled();
    expect(client.increment).toHaveBeenCalledTimes(2);
    expect(client.increment).toHaveBeenCalledWith(createMetricName('errorCount'), {
      operation: 'test',
    });
    expect(client.increment).toHaveBeenCalledWith(createMetricName('operationCount'), {
      operation: 'test',
    });
  });

  test('increase error_count and count on graphql error', async () => {
    const { execute, client } = prepare({});
    const result = await execute('query test { errorField }');
    assertSingleExecutionValue(result);

    expect(result.errors?.length).toBe(1);
    expect(client.histogram).not.toHaveBeenCalled();
    expect(client.increment).toHaveBeenCalledTimes(2);
    expect(client.increment).toHaveBeenCalledWith(createMetricName('errorCount'), {
      operation: 'test',
    });
    expect(client.increment).toHaveBeenCalledWith(createMetricName('operationCount'), {
      operation: 'test',
    });
  });

  test('increase count and update histogram on successful operation', async () => {
    const { execute, client } = prepare({});
    const result = await execute('query test { regularField }');
    assertSingleExecutionValue(result);

    expect(result.errors).toBeUndefined();
    expect(client.increment).toHaveBeenCalledTimes(1);
    expect(client.increment).toHaveBeenCalledWith(createMetricName('operationCount'), {
      operation: 'test',
    });
    expect(client.histogram).toHaveBeenCalledTimes(1);
    expect(client.histogram).toHaveBeenCalledWith(createMetricName('latency'), expect.any(Number), {
      operation: 'test',
    });
  });

  test('support custom prefix', async () => {
    const prefix = 'gql';
    const { execute, client } = prepare({ prefix });
    const result = await execute('query test { regularField }');
    assertSingleExecutionValue(result);

    expect(result.errors).toBeUndefined();
    expect(client.increment).toHaveBeenCalledTimes(1);
    expect(client.increment).toHaveBeenCalledWith(createMetricName('operationCount', prefix), {
      operation: 'test',
    });
    expect(client.histogram).toHaveBeenCalledTimes(1);
    expect(client.histogram).toHaveBeenCalledWith(
      createMetricName('latency', prefix),
      expect.any(Number),
      {
        operation: 'test',
      },
    );
  });

  test('do not skip on introspection by default', async () => {
    const { execute, client } = prepare({});
    const result = await execute(getIntrospectionQuery());
    assertSingleExecutionValue(result);

    expect(result.errors).toBeUndefined();
    expect(client.increment).toHaveBeenCalledTimes(1);
    expect(client.increment).toHaveBeenCalledWith(createMetricName('operationCount'), {
      operation: 'IntrospectionQuery',
    });
    expect(client.histogram).toHaveBeenCalledTimes(1);
    expect(client.histogram).toHaveBeenCalledWith(createMetricName('latency'), expect.any(Number), {
      operation: 'IntrospectionQuery',
    });
  });

  test('skip on introspection on demand', async () => {
    const { execute, client } = prepare({ skipIntrospection: true });
    const result = await execute(getIntrospectionQuery());
    assertSingleExecutionValue(result);

    expect(result.errors).toBeUndefined();
    expect(client.increment).not.toHaveBeenCalled();
    expect(client.histogram).not.toHaveBeenCalled();
  });
});
