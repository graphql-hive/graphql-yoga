import type { GraphQLParams } from '../../types.js';
import { isContentTypeMatch, isPostLikeRequest } from './utils.js';

export function isPOSTGraphQLStringRequest(request: Request, allowQueryMethod = false) {
  return (
    isPostLikeRequest(request, allowQueryMethod) &&
    isContentTypeMatch(request, 'application/graphql')
  );
}

export function parsePOSTGraphQLStringRequest(request: Request): Promise<GraphQLParams> {
  return request.text().then(query => ({ query }));
}
