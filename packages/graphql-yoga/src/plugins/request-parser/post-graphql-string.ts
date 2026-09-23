import type { GraphQLParams } from '../../types.js';
import { isContentTypeMatch } from './utils.js';

export function isPOSTGraphQLStringRequest(request: Request, allowQueryMethod = false) {
  return (
    (request.method === 'POST' || (allowQueryMethod && request.method === 'QUERY')) &&
    isContentTypeMatch(request, 'application/graphql')
  );
}

export function parsePOSTGraphQLStringRequest(request: Request): Promise<GraphQLParams> {
  return request.text().then(query => ({ query }));
}
