import { createGraphQLError } from '@graphql-tools/utils';
import type { Plugin } from '../types.js';

export function isValidMethodForGraphQL(method: string): method is 'GET' | 'POST' {
  return method === 'GET' || method === 'POST';
}

export function useCheckMethodForGraphQL(): Plugin {
  return {
    onRequestParse({ request }) {
      if (!isValidMethodForGraphQL(request.method)) {
        throw createGraphQLError('GraphQL only supports GET and POST requests.', {
          extensions: {
            http: {
              status: 405,
              headers: {
                Allow: 'GET, POST',
              },
            },
            code: 'BAD_REQUEST',
          },
        });
      }
    },
  };
}
