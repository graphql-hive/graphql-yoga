import { GraphQLParams } from '@graphql-yoga/types';
import { isContentTypeMatch } from './utils.js';

export function isPOSTGraphQLStringRequest(request: Request) {
  return request.method === 'POST' && isContentTypeMatch(request, 'application/graphql');
}

export function parsePOSTGraphQLStringRequest(request: Request): Promise<GraphQLParams> {
  return request.text().then(query => ({ query }));
}
