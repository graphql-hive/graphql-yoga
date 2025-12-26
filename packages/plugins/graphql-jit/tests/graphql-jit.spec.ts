import { execute, subscribe } from 'graphql';
import { LRUCache } from 'lru-cache';
import { useParserCache } from '@envelop/parser-cache';
import {
  assertSingleExecutionValue,
  assertStreamExecutionValue,
  collectAsyncIteratorValues,
  createTestkit,
} from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { ExecutionResultWithSerializer, JITCache, useGraphQlJit } from '../src/index.js';

describe('useGraphQlJit', () => {
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        test: String!
      }
      type Subscription {
        count: Int!
      }
    `,
    resolvers: {
      Query: {
        test: async () => 'boop',
      },
      Subscription: {
        count: {
          async *subscribe() {
            for (let i = 0; i < 10; i++) {
              yield { count: i };
            }
          },
        },
      },
    },
  });

  it('Should override execute function', async () => {
    const onExecuteSpy = jest.fn();

    const testInstance = createTestkit(
      [
        useGraphQlJit(),
        {
          onExecute: onExecuteSpy,
        },
      ],
      schema,
    );

    await testInstance.execute(`query { test }`);

    expect(onExecuteSpy).toHaveBeenCalledTimes(1);
    expect(onExecuteSpy.mock.calls[0][0].executeFn).not.toBe(execute);
  });

  it('Should override subscribe function', async () => {
    const onSubscribeSpy = jest.fn();

    const testInstance = createTestkit(
      [
        useGraphQlJit(),
        {
          onSubscribe: onSubscribeSpy,
        },
      ],
      schema,
    );

    await testInstance.execute(`subscription { count }`);

    expect(onSubscribeSpy).toHaveBeenCalledTimes(1);
    expect(onSubscribeSpy.mock.calls[0][0].subscribeFn).not.toBe(subscribe);
  });

  it('Should not override execute function when enableIf returns false', async () => {
    const onExecuteSpy = jest.fn();

    const testInstance = createTestkit(
      [
        useGraphQlJit(
          {},
          {
            enableIf: () => false,
          },
        ),
        {
          onExecute: onExecuteSpy,
        },
      ],
      schema,
    );

    await testInstance.execute(`query { test }`);

    expect(onExecuteSpy).toHaveBeenCalledTimes(1);
    expect(onExecuteSpy.mock.calls[0][0].executeFn).toBe(execute);
    expect(onExecuteSpy.mock.calls[0][0].executeFn.name).not.toBe('jitExecutor');
  });

  it('Should not override subscribe function when enableIf returns false', async () => {
    const onSubscribeSpy = jest.fn();

    const testInstance = createTestkit(
      [
        useGraphQlJit(
          {},
          {
            enableIf: () => false,
          },
        ),
        {
          onSubscribe: onSubscribeSpy,
        },
      ],
      schema,
    );

    await testInstance.execute(`subscription { count }`);

    expect(onSubscribeSpy).toHaveBeenCalledTimes(1);
    expect(onSubscribeSpy.mock.calls[0][0].subscribeFn).toBe(subscribe);
    expect(onSubscribeSpy.mock.calls[0][0].subscribeFn.name).not.toBe('jitSubscriber');
  });

  it('Should execute correctly', async () => {
    const testInstance = createTestkit([useGraphQlJit()], schema);
    const result = await testInstance.execute(`query { test }`);
    assertSingleExecutionValue(result);
    expect(result.data?.test).toBe('boop');
  });

  it('Should subscribe correctly', async () => {
    const testInstance = createTestkit([useGraphQlJit()], schema);
    const result = await testInstance.execute(`subscription { count }`);
    assertStreamExecutionValue(result);
    const values = await collectAsyncIteratorValues(result);
    for (let i = 0; i < 10; i++) {
      expect(values[i]?.data?.count).toBe(i);
    }
  });

  it('Should use the provided cache instance', async () => {
    const cache: JITCache = new LRUCache({
      max: 100,
    });
    jest.spyOn(cache, 'set');
    jest.spyOn(cache, 'get');

    const testInstance = createTestkit(
      [
        useGraphQlJit(
          {},
          {
            cache,
          },
        ),
      ],
      schema,
    );

    await testInstance.execute(`query { test }`);
    expect(cache.get).toHaveBeenCalled();
    expect(cache.set).toHaveBeenCalled();
  });

  it('never hits LRU cache when parsed document is cached', async () => {
    const cache: JITCache = new LRUCache({
      max: 100,
    });
    jest.spyOn(cache, 'set');
    jest.spyOn(cache, 'get');

    const testInstance = createTestkit(
      [
        useParserCache(),
        useGraphQlJit(
          {},
          {
            cache,
          },
        ),
      ],
      schema,
    );

    await testInstance.execute(`query { test }`);
    await testInstance.execute(`query { test }`);
    await testInstance.execute(`query { test }`);
    expect(cache.get).toHaveBeenCalledTimes(1);
    expect(cache.set).toHaveBeenCalledTimes(1);
  });

  it('provides a custom serializer', async () => {
    const testInstance = createTestkit([useGraphQlJit()], schema);

    const result = (await testInstance.execute(`query { test }`)) as ExecutionResultWithSerializer;
    expect(result.stringify?.(result)).toMatch(
      JSON.stringify({
        data: {
          test: 'boop',
        },
      }),
    );
  });
});
