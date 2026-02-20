import { useExtendContext } from '@envelop/core';
import { assertStreamExecutionValue, createTestkit } from '@envelop/testing';
import { schema, subscriptionOperationString } from '../../../core/test/common.js';
import { useExtendContextValuePerExecuteSubscriptionEvent } from '../src/index.js';

describe('useContextValuePerExecuteSubscriptionEvent', () => {
  const { makePushPullAsyncIterableIterator } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@n1ru4l/push-pull-async-iterable-iterator') as {
      makePushPullAsyncIterableIterator: <T>() => {
        pushValue: (value: T) => void;
        asyncIterableIterator: AsyncIterableIterator<T>;
      };
    };
  it('it can be used for injecting a context that is different from the subscription context', async () => {
    expect.assertions(4);
    const { pushValue, asyncIterableIterator } = makePushPullAsyncIterableIterator<unknown>();
    const subscriptionContextValue: {
      subscribeSource: AsyncIterableIterator<unknown>;
      message: string;
    } = {
      subscribeSource: asyncIterableIterator,
      message: 'this is only used during subscribe phase',
    };

    let counter = 0;

    const testInstance = createTestkit(
      [
        useExtendContext(() => subscriptionContextValue),
        useExtendContextValuePerExecuteSubscriptionEvent(() => ({
          contextPartial: {
            message: counter.toString(),
          },
        })),
      ],
      schema,
    );

    const result = await testInstance.execute(subscriptionOperationString);
    assertStreamExecutionValue(result);

    pushValue({});

    for await (const value of result) {
      expect(value.errors).toBeUndefined();
      if (counter === 0) {
        expect(value.data?.message).toEqual('0');
        counter = 1;
        pushValue({});
      } else if (counter === 1) {
        expect(value.data?.message).toEqual('1');
        return;
      }
    }
  });

  it('invokes cleanup function after value is published', async () => {
    expect.assertions(3);
    const { pushValue, asyncIterableIterator } = makePushPullAsyncIterableIterator<unknown>();

    const onEnd = jest.fn();
    const testInstance = createTestkit(
      [
        useExtendContext(() => ({ subscribeSource: asyncIterableIterator })),
        useExtendContextValuePerExecuteSubscriptionEvent(() => ({
          contextPartial: {
            message: `hi`,
          },
          onEnd,
        })),
      ],
      schema,
    );

    const result = await testInstance.execute(subscriptionOperationString);
    assertStreamExecutionValue(result);

    pushValue({});

    const { value } = await result.next();
    expect(value.errors).toBeUndefined();
    expect(value.data?.message).toEqual('hi');
    expect(onEnd.mock.calls).toHaveLength(1);

    await result.return?.();
  });
});
