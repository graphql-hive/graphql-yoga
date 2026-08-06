import type { ExecutionArgs, validateSubscriptionArgs } from 'graphql';
import { createSourceEventStream } from 'graphql';
import type { ExecuteFunction, SubscribeFunction } from '@envelop/core';
import { isAsyncIterable, makeSubscribe, mapAsyncIterator } from '@envelop/core';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

type ValidateSubscriptionArgsFn = typeof validateSubscriptionArgs;

// graphql-js 17 requires validating subscription args via `validateSubscriptionArgs` before calling
// `createSourceEventStream`, and dropped the positional-args overload that graphql-js 15/16 support.
// `validateSubscriptionArgs` doesn't exist prior to 17, and a static import of it would crash real ESM
// consumers running graphql-js 15/16 (missing named exports fail at module-link time there), so it's
// resolved dynamically once here and the presence check happens at runtime instead.
const validateSubscriptionArgsPromise: Promise<ValidateSubscriptionArgsFn | undefined> = import(
  'graphql'
).then(
  graphqlModule =>
    (graphqlModule as { validateSubscriptionArgs?: ValidateSubscriptionArgsFn })
      .validateSubscriptionArgs,
);

function getSourceEventStream(
  args: ExecutionArgs,
  validateSubscriptionArgs: ValidateSubscriptionArgsFn | undefined,
): ReturnType<typeof createSourceEventStream> {
  if (validateSubscriptionArgs) {
    const validatedArgs = validateSubscriptionArgs(args);
    if (!('schema' in validatedArgs)) {
      return { errors: validatedArgs };
    }
    return createSourceEventStream(validatedArgs);
  }

  // graphql-js 15/16's `createSourceEventStream` only has the legacy positional-args signature,
  // which the installed (v17) type definitions no longer describe.
  const legacyCreateSourceEventStream = createSourceEventStream as unknown as (
    schema: ExecutionArgs['schema'],
    document: ExecutionArgs['document'],
    rootValue: ExecutionArgs['rootValue'],
    contextValue: ExecutionArgs['contextValue'],
    variableValues: ExecutionArgs['variableValues'],
    operationName: ExecutionArgs['operationName'],
    subscribeFieldResolver: ExecutionArgs['subscribeFieldResolver'],
  ) => ReturnType<typeof createSourceEventStream>;

  return legacyCreateSourceEventStream(
    args.schema,
    args.document,
    args.rootValue,
    args.contextValue,
    args.variableValues ?? undefined,
    args.operationName,
    args.subscribeFieldResolver,
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
              return resultOrStream;
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
