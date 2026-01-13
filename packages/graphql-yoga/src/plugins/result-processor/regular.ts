import { isAsyncIterable } from '@graphql-tools/utils';
import { FetchAPI, ResultProcessorInput } from '@graphql-yoga/types';
import {
  areGraphQLErrors,
  getResponseInitByRespectingErrors,
  isGraphQLError,
} from '../../error.js';
import { jsonStringifyResultWithoutInternals } from './stringify.js';

export function processRegularResult(
  executionResult: ResultProcessorInput,
  fetchAPI: FetchAPI,
  acceptedHeader: string,
): Response {
  if (isAsyncIterable(executionResult)) {
    return new fetchAPI.Response(null, {
      status: 406,
      statusText: 'Not Acceptable',
      headers: {
        accept: 'application/json; charset=utf-8, application/graphql-response+json; charset=utf-8',
      },
    });
  }

  const headersInit = {
    'Content-Type': acceptedHeader + '; charset=utf-8',
  };

  const responseInit = getResponseInitByRespectingErrors(
    executionResult,
    headersInit,
    // prefer 200 only if accepting application/json and all errors are exclusively GraphQL errors
    acceptedHeader === 'application/json' &&
      !Array.isArray(executionResult) &&
      areGraphQLErrors(executionResult.errors) &&
      executionResult.errors.some(
        err =>
          !err.extensions?.['originalError'] || isGraphQLError(err.extensions['originalError']),
      ),
  );

  const responseBody = jsonStringifyResultWithoutInternals(executionResult);

  return new fetchAPI.Response(responseBody, responseInit);
}
