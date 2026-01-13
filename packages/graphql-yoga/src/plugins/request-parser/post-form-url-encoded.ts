import { GraphQLParams } from '@graphql-yoga/types';
import { isContentTypeMatch, parseURLSearchParams } from './utils.js';

export function isPOSTFormUrlEncodedRequest(request: Request) {
  return (
    request.method === 'POST' && isContentTypeMatch(request, 'application/x-www-form-urlencoded')
  );
}

export function parsePOSTFormUrlEncodedRequest(request: Request): Promise<GraphQLParams> {
  return request.text().then(parseURLSearchParams);
}
