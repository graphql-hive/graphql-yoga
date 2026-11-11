import type { GraphQLParams } from '../../types.js';
import { isContentTypeMatch, isPostLikeRequest, parseURLSearchParams } from './utils.js';

export function isPOSTFormUrlEncodedRequest(request: Request) {
  return (
    isPostLikeRequest(request) && isContentTypeMatch(request, 'application/x-www-form-urlencoded')
  );
}

export function parsePOSTFormUrlEncodedRequest(request: Request): Promise<GraphQLParams> {
  return request.text().then(parseURLSearchParams);
}
