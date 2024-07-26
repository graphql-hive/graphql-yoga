import { Kind } from 'graphql';
import { createGraphQLError, isDocumentNode } from '@graphql-tools/utils';
import type { GraphQLParams } from '../../types.js';
import type { Plugin } from '../types.js';

const expectedParameters = new Set(['query', 'variables', 'operationName', 'extensions']);

export function assertInvalidParams(
  params: unknown,
  extraParamNames?: string[],
): asserts params is GraphQLParams {
  if (params == null || typeof params !== 'object') {
    throw createGraphQLError('Invalid "params" in the request body', {
      extensions: {
        http: {
          spec: true,
          status: 400,
        },
      },
    });
  }
  for (const paramKey in params) {
    if ((params as Record<string, unknown>)[paramKey] == null) {
      continue;
    }
    if (!expectedParameters.has(paramKey)) {
      if (extraParamNames?.includes(paramKey)) {
        continue;
      }
      throw createGraphQLError(`Unexpected parameter "${paramKey}" in the request body.`, {
        extensions: {
          http: {
            status: 400,
          },
        },
      });
    }
  }
}

export function checkGraphQLQueryParams(
  params: unknown,
  extraParamNames?: string[],
): GraphQLParams {
  if (!isObject(params)) {
    throw createGraphQLError(
      `Expected params to be an object but given ${extendedTypeof(params)}.`,
      {
        extensions: {
          http: {
            status: 400,
            headers: {
              Allow: 'GET, POST',
            },
          },
        },
      },
    );
  }

  assertInvalidParams(params, extraParamNames);

  if (params.query == null) {
    throw createGraphQLError('Must provide query string.', {
      extensions: {
        http: {
          spec: true,
          status: 400,
          headers: {
            Allow: 'GET, POST',
          },
        },
      },
    });
  }

  const queryType = extendedTypeof(params.query);
  if (queryType !== 'string') {
    throw createGraphQLError(`Expected "query" param to be a string, but given ${queryType}.`, {
      extensions: {
        http: {
          status: 400,
          headers: {
            Allow: 'GET, POST',
          },
        },
      },
    });
  }

  const variablesParamType = extendedTypeof(params.variables);
  if (!['object', 'null', 'undefined'].includes(variablesParamType)) {
    throw createGraphQLError(
      `Expected "variables" param to be empty or an object, but given ${variablesParamType}.`,
      {
        extensions: {
          http: {
            status: 400,
            headers: {
              Allow: 'GET, POST',
            },
          },
        },
      },
    );
  }

  const extensionsParamType = extendedTypeof(params.extensions);
  if (!['object', 'null', 'undefined'].includes(extensionsParamType)) {
    throw createGraphQLError(
      `Expected "extensions" param to be empty or an object, but given ${extensionsParamType}.`,
      {
        extensions: {
          http: {
            status: 400,
            headers: {
              Allow: 'GET, POST',
            },
          },
        },
      },
    );
  }

  return params;
}

export function isValidGraphQLParams(params: unknown): params is GraphQLParams {
  try {
    checkGraphQLQueryParams(params);
    return true;
  } catch {
    return false;
  }
}

export function useCheckGraphQLQueryParams(extraParamNames?: string[]): Plugin {
  return {
    onParams({ params }) {
      checkGraphQLQueryParams(params, extraParamNames);
    },
    onParse() {
      return ({
        result,
        context: {
          request,
          params: { operationName },
        },
      }) => {
        // Run only if this is a Yoga request
        // the `request` might be missing when using graphql-ws for example
        // in which case throwing an error would abruptly close the socket
        if (!request || !isDocumentNode(result)) {
          return;
        }

        let message: string | undefined;

        const operations = result.definitions.filter(
          definition => definition.kind === Kind.OPERATION_DEFINITION,
        );

        if (operationName) {
          const operationExists = operations.some(
            operation => operation.name?.value === operationName,
          );

          if (!operationExists) {
            if (operations.length === 1) {
              message = `Operation name "${operationName}" doesn't match the name defined in the query.`;
            } else {
              message = `Could not determine what operation to execute. There is no operation "${operationName}" in the query.`;
            }
          }
        } else if (operations.length > 1) {
          message =
            'Could not determine what operation to execute. The query contains multiple operations, an operation name must be provided';
        }

        if (message) {
          throw createGraphQLError(message, {
            extensions: {
              http: {
                status: 400,
              },
            },
          });
        }
      };
    },
  };
}

function extendedTypeof(
  val: unknown,
):
  | 'string'
  | 'number'
  | 'bigint'
  | 'boolean'
  | 'symbol'
  | 'undefined'
  | 'object'
  | 'function'
  | 'array'
  | 'null' {
  if (val === null) {
    return 'null';
  }
  if (Array.isArray(val)) {
    return 'array';
  }
  return typeof val;
}

function isObject(val: unknown): val is Record<PropertyKey, unknown> {
  return extendedTypeof(val) === 'object';
}
