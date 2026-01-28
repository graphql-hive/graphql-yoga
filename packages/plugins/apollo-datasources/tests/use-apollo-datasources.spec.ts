import { InMemoryLRUCache } from '@apollo/utils.keyvaluecache';
import 'reflect-metadata';
import { assertSingleExecutionValue, createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { useApolloDataSources } from '../src/index.js';

describe('useApolloDataSources', () => {
  it('should use InMemoryLRUCache by default', async () => {
    const initialize = jest.fn();

    const schema = makeExecutableSchema({
      typeDefs: `type Query { foo: String }`,
      resolvers: {
        Query: {
          foo: () => 'foo',
        },
      },
    });
    const testInstance = createTestkit(
      [
        useApolloDataSources({
          dataSources() {
            return {
              foo: {
                initialize,
              },
            };
          },
        }),
      ],
      schema,
    );
    const result = await testInstance.execute(
      `query { foo }`,
      {},
      {
        initialContextValue: true,
      },
    );
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(initialize).toHaveBeenCalledTimes(1);

    const dataSourceConfig = initialize.mock.calls[0][0];

    expect(dataSourceConfig.cache).toBeInstanceOf(InMemoryLRUCache);
    expect(dataSourceConfig.context).toEqual(
      expect.objectContaining({
        initialContextValue: true,
      }),
    );
  });

  it('should allow to use custom cache', async () => {
    const initialize = jest.fn();
    const cache = new InMemoryLRUCache();

    const schema = makeExecutableSchema({
      typeDefs: `type Query { foo: String }`,
      resolvers: {
        Query: {
          foo: () => 'foo',
        },
      },
    });
    const testInstance = createTestkit(
      [
        useApolloDataSources({
          cache,
          dataSources() {
            return {
              foo: {
                initialize,
              },
            };
          },
        }),
      ],
      schema,
    );
    const result = await testInstance.execute(`query { foo }`);
    assertSingleExecutionValue(result);
    expect(result.errors).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(initialize).toHaveBeenCalledTimes(1);

    const dataSourceConfig = initialize.mock.calls[0][0];

    expect(dataSourceConfig.cache).toBe(cache);
  });
});
