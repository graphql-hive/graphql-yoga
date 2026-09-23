import { createGraphQLError } from '@graphql-tools/utils';
import type { Plugin } from '../types.js';

export function isValidMethodForGraphQL(
  method: string,
  allowQueryMethod = true,
): method is 'GET' | 'POST' | 'QUERY' {
  return method === 'GET' || method === 'POST' || (allowQueryMethod && method === 'QUERY');
}

export interface CheckMethodForGraphQLOptions {
  /**
   * Whether to allow the `QUERY` HTTP method, as described in the
   * `graphql-over-http` spec proposal.
   *
   * @see https://github.com/graphql/graphql-over-http/pull/411
   *
   * @default true
   */
  queryMethod?: boolean | undefined;
}

export function useCheckMethodForGraphQL(options?: CheckMethodForGraphQLOptions): Plugin {
  const allowQueryMethod = options?.queryMethod !== false;
  const allowedMethods = allowQueryMethod ? 'GET, POST, QUERY' : 'GET, POST';
  const message = allowQueryMethod
    ? 'GraphQL only supports GET, POST and QUERY requests.'
    : 'GraphQL only supports GET and POST requests.';
  return {
    onRequestParse({ request }) {
      if (!isValidMethodForGraphQL(request.method, allowQueryMethod)) {
        throw createGraphQLError(message, {
          extensions: {
            http: {
              status: 405,
              headers: {
                Allow: allowedMethods,
              },
            },
            code: 'BAD_REQUEST',
          },
        });
      }
    },
  };
}
