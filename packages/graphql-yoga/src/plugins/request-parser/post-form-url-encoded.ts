import type { GraphQLParams } from '../../types.js';
import { isBodyBasedRequest, isContentTypeMatch, parseURLSearchParams } from './utils.js';

export function isPOSTFormUrlEncodedRequest(request: Request) {
  return (
    isBodyBasedRequest(request) && isContentTypeMatch(request, 'application/x-www-form-urlencoded')
  );
}

export function parsePOSTFormUrlEncodedRequest(request: Request): Promise<GraphQLParams> {
  return request.text().then(parseURLSearchParams);
}
