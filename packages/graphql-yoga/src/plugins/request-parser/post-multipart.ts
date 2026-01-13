import { createGraphQLError } from '@graphql-tools/utils';
import { GraphQLParams } from '@graphql-yoga/types';
import { handleMaybePromise, MaybePromise } from '@whatwg-node/promise-helpers';
import { isContentTypeMatch } from './utils.js';

export function isPOSTMultipartRequest(request: Request): boolean {
  return request.method === 'POST' && isContentTypeMatch(request, 'multipart/form-data');
}

export function parsePOSTMultipartRequest(request: Request): MaybePromise<GraphQLParams> {
  return handleMaybePromise(
    () => request.formData(),
    (requestBody: FormData) => {
      const operationsStr = requestBody.get('operations');

      if (!operationsStr) {
        throw createGraphQLError('Missing multipart form field "operations"');
      }

      if (typeof operationsStr !== 'string') {
        throw createGraphQLError('Multipart form field "operations" must be a string');
      }

      let operations: GraphQLParams;

      try {
        operations = JSON.parse(operationsStr);
      } catch {
        throw createGraphQLError('Multipart form field "operations" must be a valid JSON string');
      }

      const mapStr = requestBody.get('map');

      if (mapStr != null) {
        if (typeof mapStr !== 'string') {
          throw createGraphQLError('Multipart form field "map" must be a string');
        }

        let map: Record<string, string[]>;

        try {
          map = JSON.parse(mapStr);
        } catch {
          throw createGraphQLError('Multipart form field "map" must be a valid JSON string');
        }
        for (const fileIndex in map) {
          const file = requestBody.get(fileIndex);
          const keys = map[fileIndex]!;
          for (const key of keys) {
            setObjectKeyPath(operations, key, file);
          }
        }
      }

      return operations;
    },
    e => {
      if (e instanceof Error && e.message.startsWith('File size limit exceeded: ')) {
        throw createGraphQLError(e.message, {
          extensions: {
            http: {
              status: 413,
            },
          },
        });
      }
      throw e;
    },
  );
}

function setObjectKeyPath(object: any, keyPath: string, value: any): void {
  const keys = keyPath.split('.');
  let current = object;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]!;
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return;
    }
    const isLastKey = i === keys.length - 1;
    if (isLastKey) {
      current[key] = value;
    } else {
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }
  }
}
