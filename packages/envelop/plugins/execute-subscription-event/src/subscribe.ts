import type { ExecutionArgs, ExecutionResult } from 'graphql';
import { createSourceEventStream } from 'graphql';
import type { ExecuteFunction, SubscribeFunction } from '@envelop/core';
import { isAsyncIterable, makeSubscribe, mapAsyncIterator } from '@envelop/core';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

// graphql-js 17 requires validating subscription args via `validateSubscriptionArgs` before calling
// `createSourceEventStream`, and dropped the positional-args overload that graphql-js 15/16 support.
// `validateSubscriptionArgs` doesn't exist prior to 17, and a static import of it would crash real ESM
// consumers running graphql-js 15/16 (missing named exports fail at module-link time there), so it's
// resolved dynamically once here and the presence check happens at runtime instead.
const validateSubscriptionArgsPromise: Promise<
  ((args: ExecutionArgs) => ReadonlyArray<Error> | ExecutionArgs) | undefined
> = import('graphql').then(
  graphqlModule =>
    (
      graphqlModule as {
        validateSubscriptionArgs?: (args: ExecutionArgs) => ReadonlyArray<Error> | ExecutionArgs;
      }
    ).validateSubscriptionArgs,
);

function getSourceEventStream(
  args: ExecutionArgs,
  validateSubscriptionArgs:
    | ((args: ExecutionArgs) => ReadonlyArray<Error> | ExecutionArgs)
    | undefined,
) {
  if (validateSubscriptionArgs) {
    const validatedExecutionArgs = validateSubscriptionArgs(args);
    if (!('schema' in validatedExecutionArgs)) {
      return { errors: validatedExecutionArgs } as unknown as ExecutionResult;
    }
    return (createSourceEventStream as unknown as (args: ExecutionArgs) => unknown)(
      validatedExecutionArgs,
    ) as ReturnType<typeof createSourceEventStream>;
  }

  return (createSourceEventStream as any)(
    args.schema,
    args.document,
    args.rootValue,
    args.contextValue,
    args.variableValues ?? undefined,
    args.operationName,
    (args as any).subscribeFieldResolver,
  );
}

/**
 * This is a almost identical port from graphql-js subscribe.
 * The only difference is that a custom `execute` function can be injected for customizing the behavior.
 */
export const subscribe = (execute: ExecuteFunction): SubscribeFunction =>
  makeSubscribe(args => {
    const { schema, document, contextValue, variableValues, operationName, fieldResolver } = args;

    return handleMaybePromise(
      () => validateSubscriptionArgsPromise,
      validateSubscriptionArgs =>
        handleMaybePromise(
          () => getSourceEventStream(args, validateSubscriptionArgs),
          resultOrStream => {
            if (!isAsyncIterable(resultOrStream)) {
              return resultOrStream as AsyncIterableIterator<ExecutionResult>;
            }

            // Map every source value to a ExecutionResult value as described above.
            return mapAsyncIterator(
              resultOrStream,
              // For each payload yielded from a subscription, map it over the normal
              // GraphQL `execute` function, with `payload` as the rootValue.
              // This implements the "MapSourceToResponseEvent" algorithm described in
              // the GraphQL specification. The `execute` function provides the
              // "ExecuteSubscriptionEvent" algorithm, as it is nearly identical to the
              // "ExecuteQuery" algorithm, for which `execute` is also used.
              (payload: any) =>
                execute({
                  schema,
                  document,
                  rootValue: payload,
                  contextValue,
                  variableValues,
                  operationName,
                  fieldResolver,
                }),
            );
          },
        ),
    );
  });
