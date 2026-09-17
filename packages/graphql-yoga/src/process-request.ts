import { getOperationAST } from 'graphql';
import type { GetEnvelopedFn } from '@envelop/core';
import { Logger } from '@graphql-hive/logger';
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
  logger,
  serverContext,
}: {
  request: Request;
  result: ResultProcessorInput;
  fetchAPI: FetchAPI;
  /**
   * Response Hooks
   */
  onResultProcessHooks: OnResultProcess<TServerContext>[];
  logger: Logger;
  serverContext: TServerContext & ServerAdapterInitialContext;
}): MaybePromise<Response> {
  let resultProcessor: ResultProcessor | undefined;

  const acceptableMediaTypes: string[] = [];
  let acceptedMediaType = '*/*';

  return handleMaybePromise(
    () =>
      iterateAsync(onResultProcessHooks, onResultProcessHook => {
        logger.debug('Running onResultProcess hook');
        return onResultProcessHook({
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
        });
      }),
    () => {
      // If no result processor found for this result, return an error
      if (!resultProcessor) {
        logger.debug(
          () => ({ accept: request.headers.get('accept'), acceptableMediaTypes }),
          'No result processor matched, responding 406',
        );
        const response = new fetchAPI.Response(null, {
          status: 406,
          statusText: 'Not Acceptable',
          headers: {
            accept: acceptableMediaTypes.join('; charset=utf-8, '),
          },
        });
        logger.debug(() => ({ status: response.status }), 'Sending response');
        return response;
      }

      logger.debug(() => ({ acceptedMediaType }), 'Result processor selected');
      return handleMaybePromise(
        () => resultProcessor!(result, fetchAPI, acceptedMediaType),
        response => {
          logger.debug(() => ({ status: response.status }), 'Sending response');
          return response;
        },
      );
    },
  );
}

export function processRequest({
  params,
  enveloped,
  logger,
}: {
  params: GraphQLParams;
  enveloped: ReturnType<GetEnvelopedFn<unknown>>;
  logger: Logger;
}) {
  // Parse GraphQLParams
  let document;
  try {
    document = enveloped.parse(params.query!);
  } catch (err) {
    logger.debug(() => ({ err }), 'Parsing failed');
    throw err;
  }

  // Get the actual operation
  const operation = getOperationAST(document, params.operationName);
  logger.debug(() => ({ operationType: operation?.operation }), 'Parsed GraphQL document');

  // Validate parsed Document Node
  const errors = enveloped.validate(enveloped.schema, document);

  if (errors.length > 0) {
    logger.debug(() => ({ errors }), 'Validation failed');
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

      // Choose the right executor
      const executeFn =
        operation?.operation === 'subscription' ? enveloped.subscribe : enveloped.execute;

      // Get the result to be processed
      return executeFn(executionArgs);
    },
  );
}
