import { execute, ExecutionResult, GraphQLError, GraphQLSchema } from 'graphql';
import {
  assertSingleExecutionValue,
  assertStreamExecutionValue,
  collectAsyncIteratorValues,
  createSpiedPlugin,
  createTestkit,
} from '@envelop/testing';
import { OnExecuteDoneHookResult, OnSubscribeResultResult } from '@envelop/types';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { fakePromise } from '@whatwg-node/promise-helpers';
import { query, schema } from './common.js';

type Deferred<T = void> = {
  promise: Promise<T>;
  state: 'pending' | 'resolved' | 'rejected';
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

function createDeferred<T = void>(): Deferred<T> {
  const deferred = {
    state: 'pending',
    reject: () => undefined,
    resolve: () => undefined,
  } as any as Deferred<T>;

  deferred.promise = new Promise<T>((res, rej) => {
    deferred.reject = error => {
      if (deferred.state !== 'pending') {
        throw new Error(`Cannot reject deferred in state '${deferred.state}'.`);
      }
      deferred.state = 'rejected';
      rej(error);
    };
    deferred.resolve = value => {
      if (deferred.state !== 'pending') {
        throw new Error(`Cannot resolve deferred in state '${deferred.state}'.`);
      }
      deferred.state = 'resolved';

      res(value);
    };
  });

  return deferred;
}

describe('execute', () => {
  it('Should wrap and trigger events correctly', async () => {
    const spiedPlugin = createSpiedPlugin();
    const teskit = createTestkit([spiedPlugin.plugin], schema);
    const context = { test: 1 };
    await teskit.execute(query, {}, context);
    expect(spiedPlugin.spies.beforeExecute).toHaveBeenCalledTimes(1);
    expect(spiedPlugin.spies.beforeExecute).toHaveBeenCalledWith({
      executeFn: expect.any(Function),
      setExecuteFn: expect.any(Function),
      extendContext: expect.any(Function),
      setResultAndStopExecution: expect.any(Function),
      context,
      args: {
        contextValue: context,
        rootValue: {},
        schema: expect.any(GraphQLSchema),
        operationName: undefined,
        fieldResolver: undefined,
        typeResolver: undefined,
        variableValues: {},
        document: expect.objectContaining({
          definitions: expect.any(Array),
        }),
      },
    });

    expect(spiedPlugin.spies.afterExecute).toHaveBeenCalledTimes(1);
    expect(spiedPlugin.spies.afterExecute).toHaveBeenCalledWith({
      args: expect.any(Object),
      setResult: expect.any(Function),
      result: {
        data: {
          me: {
            id: '1',
            name: 'Dotan Simha',
          },
        },
      },
    });
  });

  it('Should allow to override execute function', async () => {
    const altExecute = jest.fn(execute);
    const teskit = createTestkit(
      [
        {
          onExecute({ setExecuteFn }) {
            setExecuteFn(altExecute as any);
          },
        },
      ],
      schema,
    );
    await teskit.execute(query);
    expect(altExecute).toHaveBeenCalledTimes(1);
  });

  it('Should allow to write async functions for before execute', async () => {
    const altExecute = jest.fn(execute);
    const teskit = createTestkit(
      [
        {
          onExecute({ setExecuteFn }) {
            setExecuteFn(altExecute as any);
          },
        },
      ],
      schema,
    );
    await teskit.execute(query);
  });

  describe('setResultAndStopExecution', () => {
    it('invoke "onExecuteDone" handlers of already invoked "onExecute" hooks.', async () => {
      let onExecuteCalled = false;
      let onExecuteDoneCalled = false;
      let onExecuteDone2Called = false;
      const teskit = createTestkit(
        [
          {
            onExecute() {
              onExecuteCalled = true;
              return {
                onExecuteDone: () => {
                  onExecuteDoneCalled = true;
                },
              };
            },
          },
          {
            onExecute({ setResultAndStopExecution }) {
              setResultAndStopExecution({
                data: null,
                errors: [new GraphQLError('setResultAndStopExecution.')],
              });

              return {
                onExecuteDone() {
                  onExecuteDone2Called = true;
                },
              };
            },
          },
        ],
        schema,
      );
      const result = await teskit.execute(query);
      assertSingleExecutionValue(result);
      expect(onExecuteCalled).toEqual(true);
      expect(onExecuteDoneCalled).toEqual(true);
      expect(onExecuteDone2Called).toEqual(true);
      expect(result).toMatchInlineSnapshot(`
        {
          "data": null,
          "errors": [
            [GraphQLError: setResultAndStopExecution.],
          ],
        }
      `);
    });

    it('skip invoking "onExecute" and "onExecuteDone" handlers of plugins after a plugin that calls "setResultAndStopExecution".', async () => {
      let onExecuteCalled = false;
      let onExecuteDoneCalled = false;
      let onExecuteDone2Called = false;
      const teskit = createTestkit(
        [
          {
            onExecute({ setResultAndStopExecution }) {
              setResultAndStopExecution({
                data: null,
                errors: [new GraphQLError('setResultAndStopExecution.')],
              });

              return {
                onExecuteDone() {
                  onExecuteDone2Called = true;
                },
              };
            },
          },
          {
            onExecute() {
              onExecuteCalled = true;
              return {
                onExecuteDone: () => {
                  onExecuteDoneCalled = true;
                },
              };
            },
          },
        ],
        schema,
      );
      const result = await teskit.execute(query);
      assertSingleExecutionValue(result);
      expect(onExecuteCalled).toEqual(false);
      expect(onExecuteDoneCalled).toEqual(false);
      expect(onExecuteDone2Called).toEqual(true);
      expect(result).toMatchInlineSnapshot(`
        {
          "data": null,
          "errors": [
            [GraphQLError: setResultAndStopExecution.],
          ],
        }
      `);
    });
  });

  it('Should be able to manipulate streams', async () => {
    const streamExecuteFn = async function* () {
      for (const value of ['a', 'b', 'c', 'd']) {
        yield { data: { alphabet: value } };
      }
    };

    const teskit = createTestkit(
      [
        {
          onExecute({ setExecuteFn }) {
            setExecuteFn(streamExecuteFn as any);

            return {
              onExecuteDone: () => {
                return {
                  onNext: ({ setResult }) => {
                    setResult({ data: { alphabet: 'x' } });
                  },
                };
              },
            };
          },
        },
      ],
      schema,
    );

    const result = await teskit.execute(/* GraphQL */ `
      query {
        alphabet
      }
    `);
    assertStreamExecutionValue(result);
    const values = await collectAsyncIteratorValues(result);
    expect(values).toEqual([
      { data: { alphabet: 'x' } },
      { data: { alphabet: 'x' } },
      { data: { alphabet: 'x' } },
      { data: { alphabet: 'x' } },
    ]);
  });

  it('Should be able to invoke something after the stream has ended.', async () => {
    expect.assertions(1);
    const streamExecuteFn = async function* () {
      for (const value of ['a', 'b', 'c', 'd']) {
        yield { data: { alphabet: value } };
      }
    };

    const teskit = createTestkit(
      [
        {
          onExecute({ setExecuteFn }) {
            setExecuteFn(streamExecuteFn as any);

            return {
              onExecuteDone: () => {
                let latestResult: ExecutionResult;
                return {
                  onNext: ({ result }) => {
                    latestResult = result;
                  },
                  onEnd: () => {
                    expect(latestResult).toEqual({ data: { alphabet: 'd' } });
                  },
                };
              },
            };
          },
        },
      ],
      schema,
    );

    const result = await teskit.execute(/* GraphQL */ `
      query {
        alphabet
      }
    `);
    assertStreamExecutionValue(result);
    // run AsyncGenerator
    await collectAsyncIteratorValues(result);
  });

  it('hook into execute stream phases with proper cleanup on the source.', async () => {
    expect.assertions(2);
    let isReturnCalled = false;
    const values = ['a', 'b', 'c', 'd'];
    const streamExecuteFn = (): AsyncGenerator => ({
      [Symbol.asyncIterator]() {
        return this;
      },
      async next() {
        const value = values.shift();
        if (value === undefined || isReturnCalled) {
          return { done: true, value: undefined };
        }
        return { done: false, value: { data: { alphabet: value } } };
      },
      async return() {
        isReturnCalled = true;
        return { done: true, value: undefined };
      },
      async throw() {
        throw new Error('Noop.');
      },
      [Symbol.asyncDispose]() {
        // This is a no-op, but we need to implement it to ensure that the AsyncGenerator
        // is properly cleaned up when the subscription is disposed.
        return fakePromise();
      },
    });

    const teskit = createTestkit(
      [
        {
          onExecute({ setExecuteFn }) {
            setExecuteFn(streamExecuteFn as any);

            return {
              onExecuteDone: () => {
                let latestResult: ExecutionResult;
                return {
                  onNext: ({ result }) => {
                    latestResult = result;
                  },
                  onEnd: () => {
                    expect(latestResult).toEqual({ data: { alphabet: 'a' } });
                  },
                };
              },
            };
          },
        },
      ],
      schema,
    );

    const result = await teskit.execute(/* GraphQL */ `
      query {
        alphabet
      }
    `);
    assertStreamExecutionValue(result);
    const iterator = result[Symbol.asyncIterator]();
    await iterator.next();
    await iterator.return!();
    expect(isReturnCalled).toEqual(true);
  });

  it.each([
    {
      onNext: () => {},
    } as OnExecuteDoneHookResult<unknown>,
    {
      onEnd: () => {},
    } as OnExecuteDoneHookResult<unknown>,
    {
      onNext: () => {},
      onEnd: () => {},
    } as OnExecuteDoneHookResult<unknown>,
  ])(
    "hook into execute stream is not prone to 'block return until next stream value is published' issues",
    async onExecuteDoneHookResult => {
      const delayNextDeferred = createDeferred();
      let isReturnCalled = false;

      const streamExecuteFn = () =>
        ({
          [Symbol.asyncIterator]() {
            return this;
          },
          async next() {
            return delayNextDeferred.promise.then(() => ({
              value: { data: { alphabet: 'a' } },
              done: false,
            }));
          },
          async return() {
            isReturnCalled = true;
            return { done: true, value: undefined };
          },
          async throw() {
            throw new Error('Noop.');
          },
          [Symbol.asyncDispose]() {
            // This is a no-op, but we need to implement it to ensure that the AsyncGenerator
            // is properly cleaned up when the subscription is disposed.
            return fakePromise();
          },
        }) as AsyncGenerator;

      const teskit = createTestkit(
        [
          {
            onExecute({ setExecuteFn }) {
              setExecuteFn(streamExecuteFn as any);

              return {
                onExecuteDone: () => {
                  return onExecuteDoneHookResult;
                },
              };
            },
          },
        ],
        schema,
      );

      const result = await teskit.execute(/* GraphQL */ `
        query {
          alphabet
        }
      `);
      assertStreamExecutionValue(result);
      const iterator = result[Symbol.asyncIterator]();
      const nextPromise = iterator.next();
      const returnPromise = iterator.return!();
      // This should be true because the AsyncIterable.return calls should not be blocked until
      // delayNextDeferred.promise resolves
      expect(isReturnCalled).toEqual(true);

      // cleanup of pending promises :)
      delayNextDeferred.resolve();

      await Promise.all([nextPromise, returnPromise, delayNextDeferred.promise]);
    },
  );

  it('should allow to use an async function for the done hook', async () => {
    const executeMock = jest.fn();
    const testkit = createTestkit(
      [
        {
          onExecute({ setExecuteFn }) {
            setExecuteFn(executeMock as any);

            return {
              onExecuteDone: async ({ setResult }) => {
                setResult({ data: { test: await Promise.resolve('test') } });
              },
            };
          },
        },
      ],
      schema,
    );

    expect(await testkit.execute(query)).toEqual({ data: { test: 'test' } });
  });

  it('hook into subscription phases with proper cleanup on the source', async () => {
    expect.assertions(2);
    let isReturnCalled = false;
    const values = ['a', 'b', 'c', 'd'];
    const source = {
      [Symbol.asyncIterator]() {
        return this;
      },
      async next() {
        const value = values.shift();
        if (value === undefined || isReturnCalled) {
          return { done: true, value: undefined };
        }
        return { done: false, value };
      },
      async return() {
        isReturnCalled = true;
        return { done: true, value: undefined };
      },
      async throw() {
        throw new Error('Noop.');
      },
      [Symbol.asyncDispose]() {
        // This is a no-op, but we need to implement it to ensure that the AsyncGenerator
        // is properly cleaned up when the subscription is disposed.
        return fakePromise();
      },
    } as AsyncGenerator;

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String
        }

        type Subscription {
          alphabet: String
        }
      `,
      resolvers: {
        Subscription: {
          alphabet: {
            subscribe: () => source,
            resolve: value => value,
          },
        },
      },
    });

    const testkit = createTestkit(
      [
        {
          onSubscribe() {
            return {
              onSubscribeResult() {
                let latestResult: ExecutionResult;
                return {
                  onNext: ({ result }) => {
                    latestResult = result;
                  },
                  onEnd: () => {
                    expect(latestResult).toEqual({ data: { alphabet: 'b' } });
                  },
                };
              },
            };
          },
        },
      ],
      schema,
    );

    const document = /* GraphQL */ `
      subscription {
        alphabet
      }
    `;

    const result = await testkit.execute(document);
    assertStreamExecutionValue(result);
    await result.next();
    await result.next();
    await result.return!();
    expect(isReturnCalled).toEqual(true);
  });

  it('should preserve referential stability of the context', async () => {
    const testKit = createTestkit(
      [
        {
          onExecute({ extendContext }) {
            extendContext({ foo: 'bar' });
          },
        },
      ],
      schema,
    );

    const context = {};
    await testKit.execute(query, {}, context);

    expect(context).toMatchObject({ foo: 'bar' });
  });
});

it.each([
  {
    onNext: () => {},
  } as OnSubscribeResultResult<unknown>,
  {
    onEnd: () => {},
  } as OnSubscribeResultResult<unknown>,
  {
    onNext: () => {},
    onEnd: () => {},
  } as OnSubscribeResultResult<unknown>,
])(
  "hook into subscribe result stream is not prone to 'block return until next stream value is published' issues",
  async onSubscribeResultResultHook => {
    const delayNextDeferred = createDeferred();
    let isReturnCalled = false;

    const source = {
      [Symbol.asyncIterator]() {
        return this;
      },
      async next() {
        return delayNextDeferred.promise.then(() => ({
          value: { data: { alphabet: 'a' } },
          done: false,
        }));
      },
      async return() {
        isReturnCalled = true;
        return { done: true, value: undefined };
      },
      async throw() {
        throw new Error('Noop.');
      },
      [Symbol.asyncDispose]() {
        // This is a no-op, but we need to implement it to ensure that the AsyncGenerator
        // is properly cleaned up when the subscription is disposed.
        return fakePromise();
      },
    } as AsyncGenerator;

    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String
        }

        type Subscription {
          alphabet: String
        }
      `,
      resolvers: {
        Subscription: {
          alphabet: {
            subscribe: () => source,
            resolve: value => value,
          },
        },
      },
    });

    const teskit = createTestkit(
      [
        {
          onSubscribe() {
            return {
              onSubscribeResult() {
                return onSubscribeResultResultHook;
              },
            };
          },
        },
      ],
      schema,
    );

    const result = await teskit.execute(/* GraphQL */ `
      subscription {
        alphabet
      }
    `);
    assertStreamExecutionValue(result);
    const iterator = result[Symbol.asyncIterator]();
    const nextPromise = iterator.next();
    const returnPromise = iterator.return!();
    // This should be true because the AsyncIterable.return calls should not be blocked until
    // delayNextDeferred.promise resolves
    expect(isReturnCalled).toEqual(true);

    // cleanup of pending promises :)
    delayNextDeferred.resolve();

    await Promise.all([nextPromise, returnPromise, delayNextDeferred.promise]);
  },
);
