import { GraphQLError, GraphQLErrorExtensions } from 'graphql';
import { createGraphQLError } from '@graphql-tools/utils';
import { GraphQLParams } from '@graphql-yoga/types';
import { handleMaybePromise, MaybePromise } from '@whatwg-node/promise-helpers';
import { isContentTypeMatch } from './utils.js';

export function isPOSTJsonRequest(request: Request) {
  return (
    request.method === 'POST' &&
    (isContentTypeMatch(request, 'application/json') ||
      isContentTypeMatch(request, 'application/graphql+json'))
  );
}

export function parsePOSTJsonRequest(request: Request): MaybePromise<GraphQLParams> {
  return handleMaybePromise(
    () => request.json(),
    (requestBody: GraphQLParams) => {
      if (requestBody == null) {
        throw createGraphQLError(`POST body is expected to be object but received ${requestBody}`, {
          extensions: {
            http: {
              status: 400,
            },
            code: 'BAD_REQUEST',
          },
        });
      }

      const requestBodyTypeof = typeof requestBody;
      if (requestBodyTypeof !== 'object') {
        throw createGraphQLError(
          `POST body is expected to be object but received ${requestBodyTypeof}`,
          {
            extensions: {
              http: {
                status: 400,
              },
              code: 'BAD_REQUEST',
            },
          },
        );
      }
      return requestBody;
    },
    err => {
      if (err instanceof GraphQLError) {
        throw err;
      }
      const extensions: GraphQLErrorExtensions = {
        http: {
          spec: true,
          status: 400,
        },
        code: 'BAD_REQUEST',
      };
      if (err instanceof Error) {
        extensions['originalError'] = {
          name: err.name,
          message: err.message,
        };
      }
      throw createGraphQLError('POST body sent invalid JSON.', {
        extensions,
      });
    },
  );
}
