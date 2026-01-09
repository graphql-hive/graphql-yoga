import { SubscriptionArgs } from 'graphql';
import { DefaultContext, makeExecute, Plugin, PromiseOrValue } from '@envelop/core';
import { normalizedExecutor } from '@graphql-tools/executor';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import { subscribe } from './subscribe';

export type ContextFactoryOptions = {
  /** The arguments with which the subscription was set up. */
  args: SubscriptionArgs;
};

export type ContextFactoryHook<TContextValue> = {
  /** Context that will be used for the "ExecuteSubscriptionEvent" phase. */
  contextPartial: Partial<TContextValue>;
  /** Optional callback that is invoked once the "ExecuteSubscriptionEvent" phase has ended. Useful for cleanup, such as tearing down database connections. */
  onEnd?: () => void;
};

export type ContextFactoryType<TContextValue = DefaultContext> = (
  options: ContextFactoryOptions,
) => PromiseOrValue<ContextFactoryHook<TContextValue> | void>;

export const useExtendContextValuePerExecuteSubscriptionEvent = <
  TContextValue extends Record<any, any>,
>(
  createContext: ContextFactoryType<TContextValue>,
): Plugin<TContextValue> => {
  return {
    onSubscribe({ args, setSubscribeFn }) {
      const executeNew = makeExecute(executionArgs => {
        return handleMaybePromise(
          () => createContext({ args }),
          context =>
            handleMaybePromise(
              () =>
                normalizedExecutor({
                  ...executionArgs,
                  // GraphQL.js 16 changed the type of contextValue to unknown
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore
                  contextValue: { ...executionArgs.contextValue, ...context?.contextPartial },
                }),
              result => {
                context?.onEnd?.();
                return result;
              },
              error => {
                context?.onEnd?.();
                throw error;
              },
            ),
        );
      });
      setSubscribeFn(subscribe(executeNew));
    },
  };
};
