import { GraphQLError } from 'graphql';
import type { Plugin } from '../types.js';

export function isValidMethodForGraphQL(method: string): method is 'GET' | 'POST' | 'QUERY' {
  return method === 'GET' || method === 'POST' || method === 'QUERY';
}

export function useCheckMethodForGraphQL(): Plugin {
  return {
    onRequestParse({ request }) {
      if (!isValidMethodForGraphQL(request.method)) {
        throw new GraphQLError('GraphQL only supports GET, POST and QUERY requests.', {
          extensions: {
            http: {
              status: 405,
              headers: {
                Allow: 'GET, POST, QUERY',
              },
            },
            code: 'BAD_REQUEST',
          },
        });
      }
    },
  };
}
