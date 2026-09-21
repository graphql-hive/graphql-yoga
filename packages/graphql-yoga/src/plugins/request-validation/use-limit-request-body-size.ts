import { createGraphQLError } from '@graphql-tools/utils';
import {
  InvalidContentLengthError,
  RequestBodyTooLargeError,
  useLimitRequestBodySize as useLimitRequestBodySizeHTTP,
} from '@whatwg-node/server';
import type { FetchAPI } from '../../types.js';
import type { Plugin } from '../types.js';

function graphqlErrorFromBodyLimitError(
  error: RequestBodyTooLargeError | InvalidContentLengthError,
) {
  if (error instanceof RequestBodyTooLargeError) {
    return createGraphQLError(error.message, {
      extensions: {
        http: {
          status: 413,
          ...(error.headers ? { headers: error.headers } : {}),
        },
        code: 'REQUEST_ENTITY_TOO_LARGE',
      },
    });
  }
  return createGraphQLError(error.message, {
    extensions: {
      http: {
        status: 400,
        ...(error.headers ? { headers: error.headers } : {}),
      },
      code: 'BAD_REQUEST',
    },
  });
}

function responseFromError(
  error: RequestBodyTooLargeError | InvalidContentLengthError,
  fetchAPI: FetchAPI,
): Response {
  const gqlError = graphqlErrorFromBodyLimitError(error);
  return new fetchAPI.Response(JSON.stringify({ errors: [gqlError] }), {
    status: error.status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...error.headers,
    },
  });
}

/**
 * Limits incoming HTTP request body size via `@whatwg-node/server`'s plugin,
 * mapping early rejects to GraphQL error JSON with `extensions.http.status`.
 */
export function useLimitRequestBodySize(limit: number | false): Plugin {
  if (limit === false) {
    return {};
  }
  return useLimitRequestBodySizeHTTP(limit, {
    responseFromError: (error, fetchAPI) => {
      if (
        !(error instanceof RequestBodyTooLargeError || error instanceof InvalidContentLengthError)
      ) {
        return new fetchAPI.Response(error.message, {
          status: error.status,
          headers: error.headers,
        });
      }
      return responseFromError(error, fetchAPI);
    },
  }) as Plugin;
}

export { RequestBodyTooLargeError, InvalidContentLengthError };
