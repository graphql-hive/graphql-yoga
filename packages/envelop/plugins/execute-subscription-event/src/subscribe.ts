import type { ExecutionArgs, ExecutionResult, GraphQLError, GraphQLFieldResolver } from 'graphql';
import { createSourceEventStream } from 'graphql';
import type { ExecuteFunction, SubscribeFunction } from '@envelop/core';
import { isAsyncIterable, makeSubscribe, mapAsyncIterator } from '@envelop/core';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

// GraphQL backporting support
type MaybePromise<T> = T | Promise<T>;

type ValidateSubscriptionArgsFn = (
  args: ExecutionArgs,
) => ReadonlyArray<GraphQLError> | ExecutionArgs;

type ExecutionArgsWithSubscribeFieldResolver = ExecutionArgs & {
  subscribeFieldResolver?: GraphQLFieldResolver<any, any> | null;
};

type LegacyCreateSourceEventStream = (
  schema: ExecutionArgs['schema'],
  document: ExecutionArgs['document'],
  rootValue: ExecutionArgs['rootValue'],
  contextValue: ExecutionArgs['contextValue'],
  variableValues: ExecutionArgs['variableValues'],
  operationName: ExecutionArgs['operationName'],
  subscribeFieldResolver: GraphQLFieldResolver<any, any> | null | undefined,
) => MaybePromise<AsyncIterable<unknown> | ExecutionResult>;

const validateSubscriptionArgsPromise: Promise<ValidateSubscriptionArgsFn | undefined> = import(
  'graphql'
).then(
  graphqlModule =>
    (graphqlModule as { validateSubscriptionArgs?: ValidateSubscriptionArgsFn })
      .validateSubscriptionArgs,
);

function getSourceEventStream(
  args: ExecutionArgsWithSubscribeFieldResolver,
  validateSubscriptionArgs: ValidateSubscriptionArgsFn | undefined,
): MaybePromise<AsyncIterable<unknown> | ExecutionResult> {
  if (validateSubscriptionArgs) {
    const validatedArgs = validateSubscriptionArgs(args);
    if (!('schema' in validatedArgs)) {
      return { errors: validatedArgs };
    }
    // Cast away the installed graphql version's own overloads here for backwards compatability
    const createSourceEventStreamWithValidatedArgs = createSourceEventStream as unknown as (
      args: ExecutionArgs,
    ) => MaybePromise<AsyncIterable<unknown> | ExecutionResult>;
    return createSourceEventStreamWithValidatedArgs(validatedArgs);
  }

  const legacyCreateSourceEventStream =
    createSourceEventStream as unknown as LegacyCreateSourceEventStream;

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
      (validateSubscriptionArgs: ValidateSubscriptionArgsFn | undefined) =>
        handleMaybePromise(
          () => getSourceEventStream(args, validateSubscriptionArgs),
          (resultOrStream: Awaited<ReturnType<typeof getSourceEventStream>>) => {
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
