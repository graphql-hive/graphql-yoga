import type { GraphQLParams } from '../../types.js';
import { isContentTypeMatch, parseURLSearchParams } from './utils.js';

export function isPOSTFormUrlEncodedRequest(request: Request, allowQueryMethod = false) {
  return (
    (request.method === 'POST' || (allowQueryMethod && request.method === 'QUERY')) &&
    isContentTypeMatch(request, 'application/x-www-form-urlencoded')
  );
}

export function parsePOSTFormUrlEncodedRequest(request: Request): Promise<GraphQLParams> {
  return request.text().then(parseURLSearchParams);
}
