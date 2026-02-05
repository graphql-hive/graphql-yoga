import {
  AsyncIterableIteratorOrValue,
  DefaultContext,
  ExecuteFunction,
  ExecutionArgs,
  OnExecuteDoneEventPayload,
  OnExecuteDoneHookResult,
  OnExecuteDoneHookResultOnNextHook,
  PolymorphicExecuteArguments,
  PolymorphicSubscribeArguments,
  SubscribeFunction,
  type PromiseOrValue,
} from '@envelop/types';
import { fakePromise } from '@whatwg-node/promise-helpers';

export const envelopIsIntrospectionSymbol = Symbol('ENVELOP_IS_INTROSPECTION');

export function isIntrospectionOperationString(operation: string | any): boolean {
  return (typeof operation === 'string' ? operation : operation.body).indexOf('__schema') !== -1;
}

function getSubscribeArgs(args: PolymorphicSubscribeArguments): ExecutionArgs {
  return args.length === 1
    ? args[0]
    : {
        schema: args[0],
        document: args[1],
        rootValue: args[2],
        contextValue: args[3],
        variableValues: args[4],
        operationName: args[5],
        fieldResolver: args[6],
        subscribeFieldResolver: args[7],
      };
}
/**
 * Utility function for making a subscribe function that handles polymorphic arguments.
 */
export const makeSubscribe = (subscribeFn: (args: ExecutionArgs) => any): SubscribeFunction =>
  ((...polyArgs: PolymorphicSubscribeArguments): PromiseOrValue<AsyncIterableIterator<any>> =>
    subscribeFn(getSubscribeArgs(polyArgs))) as SubscribeFunction;

export { mapAsyncIterator } from '@whatwg-node/promise-helpers';

function getExecuteArgs(args: PolymorphicExecuteArguments): ExecutionArgs {
  return args.length === 1
    ? args[0]
    : {
        schema: args[0],
        document: args[1],
        rootValue: args[2],
        contextValue: args[3],
        variableValues: args[4],
        operationName: args[5],
        fieldResolver: args[6],
        typeResolver: args[7],
      };
}

/**
 * Utility function for making a execute function that handles polymorphic arguments.
 */
export const makeExecute = (
  executeFn: (args: ExecutionArgs) => PromiseOrValue<AsyncIterableIteratorOrValue<any>>,
): ExecuteFunction =>
  ((...polyArgs: PolymorphicExecuteArguments): PromiseOrValue<AsyncIterableIteratorOrValue<any>> =>
    executeFn(getExecuteArgs(polyArgs))) as unknown as ExecuteFunction;

/**
 * Returns true if the provided object implements the AsyncIterator protocol via
 * implementing a `Symbol.asyncIterator` method.
 *
 * Source: https://github.com/graphql/graphql-js/blob/main/src/jsutils/isAsyncIterable.ts
 */
export function isAsyncIterable<TType>(
  maybeAsyncIterable: any,
): maybeAsyncIterable is AsyncIterable<TType> {
  return (
    typeof maybeAsyncIterable === 'object' &&
    maybeAsyncIterable != null &&
    typeof maybeAsyncIterable[Symbol.asyncIterator] === 'function'
  );
}

/**
 * A utility function for handling `onExecuteDone` hook result, for simplifying the handling of AsyncIterable returned from `execute`.
 *
 * @param payload The payload send to `onExecuteDone` hook function
 * @param fn The handler to be executed on each result
 * @returns a subscription for streamed results, or undefined in case of an non-async
 */
export function handleStreamOrSingleExecutionResult<ContextType = DefaultContext>(
  payload: OnExecuteDoneEventPayload<ContextType>,
  fn: OnExecuteDoneHookResultOnNextHook<ContextType>,
): void | OnExecuteDoneHookResult<ContextType> {
  if (isAsyncIterable(payload.result)) {
    return { onNext: fn };
  }
  fn({
    args: payload.args,
    result: payload.result,
    setResult: payload.setResult,
  });

  return undefined;
}

export function finalAsyncIterator<TInput>(
  source: AsyncIterable<TInput>,
  onFinal: () => void,
): AsyncGenerator<TInput> {
  let iterator: AsyncIterator<TInput>;
  function ensureIterator() {
    if (!iterator) {
      iterator = source[Symbol.asyncIterator]();
    }
    return iterator;
  }
  let isDone = false;
  return {
    [Symbol.asyncIterator]() {
      return this;
    },
    next() {
      return ensureIterator()
        .next()
        .then(result => {
          if (result.done && isDone === false) {
            isDone = true;
            onFinal();
          }
          return result;
        });
    },
    return() {
      const promise = ensureIterator().return?.();
      if (isDone === false) {
        isDone = true;
        onFinal();
      }
      return promise || fakePromise({ done: true, value: undefined });
    },
    throw(error: unknown) {
      const promise = ensureIterator().throw?.();
      if (promise) {
        return promise;
      }
      // if the source has no throw method we just re-throw error
      // usually throw is not called anyways
      throw error;
    },
    [Symbol.asyncDispose || Symbol.for('Symbol.asyncDispose')]() {
      // This is a no-op, but we need to implement it to ensure that the AsyncGenerator
      // is properly cleaned up when the subscription is disposed.
      return fakePromise();
    },
  } as AsyncGenerator<TInput>;
}

export function errorAsyncIterator<TInput>(
  source: AsyncIterable<TInput>,
  onError: (err: unknown) => void,
): AsyncGenerator<TInput> {
  let iterator: AsyncIterator<TInput>;
  function ensureIterator() {
    if (!iterator) {
      iterator = source[Symbol.asyncIterator]();
    }
    return iterator;
  }
  return {
    [Symbol.asyncIterator]() {
      return this;
    },
    next() {
      return ensureIterator()
        .next()
        .catch(error => {
          onError(error);
          return { done: true, value: undefined };
        });
    },
    return() {
      const promise = ensureIterator().return?.();
      return promise || fakePromise({ done: true, value: undefined });
    },
    throw(error: unknown) {
      const promise = ensureIterator().throw?.();
      if (promise) {
        return promise;
      }
      // if the source has no throw method we just re-throw error
      // usually throw is not called anyways
      throw error;
    },
    [Symbol.asyncDispose || Symbol.for('Symbol.asyncDispose')]() {
      // This is a no-op, but we need to implement it to ensure that the AsyncGenerator
      // is properly cleaned up when the subscription is disposed.
      return fakePromise();
    },
  } as AsyncGenerator<TInput>;
}

export { mapMaybePromise, isPromise } from '@whatwg-node/promise-helpers';
