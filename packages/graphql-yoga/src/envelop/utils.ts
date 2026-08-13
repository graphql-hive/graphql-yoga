import { fakePromise } from '@whatwg-node/promise-helpers';
import type {
  AsyncIterableIteratorOrValue,
  ExecuteFunction,
  ExecutionArgs,
  PolymorphicExecuteArguments,
  PolymorphicSubscribeArguments,
  PromiseOrValue,
  SubscribeFunction,
} from './types/index';

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

export function finalAsyncIterator<TInput>(
  source: AsyncIterable<TInput>,
  onFinal: () => void,
): AsyncGenerator<TInput> {
  let iterator: AsyncIterator<TInput>;
  function ensureIterator() {
    iterator ||= source[Symbol.asyncIterator]();
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
    iterator ||= source[Symbol.asyncIterator]();
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
