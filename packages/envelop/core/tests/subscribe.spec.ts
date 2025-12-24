import { ExecutionResult } from 'graphql';
import {
  assertStreamExecutionValue,
  collectAsyncIteratorValues,
  createTestkit,
} from '@envelop/testing';
import { schema } from './common.js';

describe('subscribe', () => {
  it('Should be able to manipulate streams', async () => {
    const streamExecuteFn = async function* () {
      for (const value of ['a', 'b', 'c', 'd']) {
        yield { data: { alphabet: value } };
      }
    };

    const teskit = createTestkit(
      [
        {
          onSubscribe({ setSubscribeFn }) {
            setSubscribeFn(streamExecuteFn as any);

            return {
              onSubscribeResult: () => {
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
      subscription {
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
          onSubscribe({ setSubscribeFn }) {
            setSubscribeFn(streamExecuteFn as any);

            return {
              onSubscribeResult: () => {
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
      subscription {
        alphabet
      }
    `);
    assertStreamExecutionValue(result);
    await collectAsyncIteratorValues(result);
  });

  it('should preserve referential stability of the context', async () => {
    const streamExecuteFn = async function* () {
      for (const value of ['a', 'b', 'c', 'd']) {
        yield { data: { alphabet: value } };
      }
    };

    const teskit = createTestkit(
      [
        {
          onSubscribe({ setSubscribeFn, extendContext }) {
            setSubscribeFn(streamExecuteFn as any);
            extendContext({ foo: 'bar' });
          },
        },
      ],
      schema,
    );

    const context: any = {};
    const result = await teskit.execute(
      /* GraphQL */ `
        subscription {
          alphabet
        }
      `,
      {},
      context,
    );
    assertStreamExecutionValue(result);
    await collectAsyncIteratorValues(result);

    expect(context.foo).toEqual('bar');
  });

  it('error in subscription source causes onSubscribeError hook invocation', async () => {
    const subscribeSource = (async function* () {
      for (const value of ['a', 'b']) {
        yield { message: value };
      }
      throw new Error('Hee Hoo!');
    })();

    let isOnSubscribeErrorHookInvoked = false;

    const teskit = createTestkit(
      [
        {
          onSubscribe() {
            return {
              onSubscribeError: () => {
                isOnSubscribeErrorHookInvoked = true;
              },
            };
          },
        },
      ],
      schema,
    );

    const result = await teskit.execute(
      /* GraphQL */ `
        subscription {
          message
        }
      `,
      undefined,
      { subscribeSource },
    );
    assertStreamExecutionValue(result);
    try {
      await collectAsyncIteratorValues(result);
    } catch (err: unknown) {
      if (!(err instanceof Error)) {
        throw new Error('Expected error to be instance of Error');
      }
      expect(err.message).toBe('Hee Hoo!');
    }

    expect(isOnSubscribeErrorHookInvoked).toBe(true);
  });
});
