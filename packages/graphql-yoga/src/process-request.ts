import { getOperationAST } from 'graphql';
import type { GetEnvelopedFn } from '@envelop/core';
import type { ExecutionArgs } from '@graphql-tools/executor';
import type { MaybePromise } from '@whatwg-node/promise-helpers';
import { handleMaybePromise, iterateAsync } from '@whatwg-node/promise-helpers';
import type { ServerAdapterInitialContext } from '@whatwg-node/server';
import type { OnResultProcess, ResultProcessor, ResultProcessorInput } from './plugins/types.js';
import type { FetchAPI, GraphQLParams } from './types.js';

export function processResult<TServerContext>({
  request,
  result,
  fetchAPI,
  onResultProcessHooks,
  serverContext,
}: {
  request: Request;
  result: ResultProcessorInput;
  fetchAPI: FetchAPI;
  /**
   * Response Hooks
   */
  onResultProcessHooks: OnResultProcess<TServerContext>[];
  serverContext: TServerContext & ServerAdapterInitialContext;
}): MaybePromise<Response> {
  let resultProcessor: ResultProcessor | undefined;

  const acceptableMediaTypes: string[] = [];
  let acceptedMediaType = '*/*';

  return handleMaybePromise(
    () =>
      iterateAsync(onResultProcessHooks, onResultProcessHook =>
        onResultProcessHook({
          request,
          acceptableMediaTypes,
          result,
          setResult(newResult) {
            result = newResult;
          },
          resultProcessor,
          setResultProcessor(newResultProcessor, newAcceptedMimeType) {
            resultProcessor = newResultProcessor;
            acceptedMediaType = newAcceptedMimeType;
          },
          serverContext,
        }),
      ),
    () => {
      // If no result processor found for this result, return an error
      if (!resultProcessor) {
        return new fetchAPI.Response(null, {
          status: 406,
          statusText: 'Not Acceptable',
          headers: {
            accept: acceptableMediaTypes.join('; charset=utf-8, '),
          },
        });
      }

      return resultProcessor(result, fetchAPI, acceptedMediaType);
    },
  );
}

export function processRequest({
  params,
  enveloped,
}: {
  params: GraphQLParams;
  enveloped: ReturnType<GetEnvelopedFn<unknown>>;
}) {
  // Parse GraphQLParams

  const document = enveloped.parse(params.query!);

  // Validate parsed Document Node
  const errors = enveloped.validate(enveloped.schema, document);

  if (errors.length > 0) {
    return { errors };
  }

  // Build the context for the execution
  return handleMaybePromise(
    () => enveloped.contextFactory(),
    contextValue => {
      const executionArgs: ExecutionArgs = {
        schema: enveloped.schema,
        document,
        contextValue,
        variableValues: params.variables,
        operationName: params.operationName,
      };

      // Get the actual operation
      const operation = getOperationAST(document, params.operationName);

      // Choose the right executor
      const executeFn =
        operation?.operation === 'subscription' ? enveloped.subscribe : enveloped.execute;

      // Get the result to be processed
      return executeFn(executionArgs);
    },
  );
}
