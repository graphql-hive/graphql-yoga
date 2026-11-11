import type { GraphQLParams } from '../../types.js';
import { isBodyBasedRequest, isContentTypeMatch } from './utils.js';

export function isPOSTGraphQLStringRequest(request: Request) {
  return isBodyBasedRequest(request) && isContentTypeMatch(request, 'application/graphql');
}

export function parsePOSTGraphQLStringRequest(request: Request): Promise<GraphQLParams> {
  return request.text().then(query => ({ query }));
}
