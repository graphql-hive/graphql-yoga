import { createGraphQLError } from '@graphql-tools/utils';
import type { HTTPError } from '@whatwg-node/server';
import {
  InvalidContentLengthError,
  RequestBodyTooLargeError,
  useLimitRequestBodySize as useLimitRequestBodySizeHTTP,
} from '@whatwg-node/server';
import type { FetchAPI } from '../../types.js';
import type { Plugin } from '../types.js';

function graphqlErrorFromHTTPError(error: HTTPError) {
  const code =
    error instanceof RequestBodyTooLargeError || error.status === 413
      ? 'REQUEST_ENTITY_TOO_LARGE'
      : error instanceof InvalidContentLengthError || error.status === 400
        ? 'BAD_REQUEST'
        : 'BAD_REQUEST';
  return createGraphQLError(error.message, {
    extensions: {
      http: {
        status: error.status,
        ...(error.headers ? { headers: error.headers } : {}),
      },
      code,
    },
  });
}

function responseFromError(error: HTTPError, fetchAPI: FetchAPI): Response {
  const gqlError = graphqlErrorFromHTTPError(error);
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
  return useLimitRequestBodySizeHTTP(limit, { responseFromError }) as Plugin;
}

export { RequestBodyTooLargeError, InvalidContentLengthError, graphqlErrorFromHTTPError };
