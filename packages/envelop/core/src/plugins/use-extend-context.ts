import { Plugin } from '@envelop/types';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

export type ContextFactoryFn<TResult = unknown, TCurrent = unknown> = (
  currentContext: TCurrent,
) => TResult | Promise<TResult>;

type UnwrapAsync<T> = T extends Promise<infer U> ? U : T;

export const useExtendContext = <TContextFactory extends (...args: any[]) => any>(
  contextFactory: TContextFactory,
): Plugin<UnwrapAsync<ReturnType<TContextFactory>>> => ({
  onContextBuilding({ context, extendContext }) {
    return handleMaybePromise(
      () => contextFactory(context),
      result => extendContext(result),
    );
  },
});
