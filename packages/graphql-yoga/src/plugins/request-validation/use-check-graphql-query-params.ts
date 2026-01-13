import { createGraphQLError } from '@graphql-tools/utils';
import type { GraphQLParams, Plugin } from '@graphql-yoga/types';

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
        code: 'BAD_REQUEST',
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
          code: 'BAD_REQUEST',
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
          code: 'BAD_REQUEST',
        },
      },
    );
  }

  assertInvalidParams(params, extraParamNames);

  if (params['query'] == null) {
    throw createGraphQLError('Must provide query string.', {
      extensions: {
        http: {
          spec: true,
          status: 400,
          headers: {
            Allow: 'GET, POST',
          },
        },
        code: 'BAD_REQUEST',
      },
    });
  }

  const queryType = extendedTypeof(params['query']);
  if (queryType !== 'string') {
    throw createGraphQLError(`Expected "query" param to be a string, but given ${queryType}.`, {
      extensions: {
        http: {
          status: 400,
          headers: {
            Allow: 'GET, POST',
          },
        },
        code: 'BAD_REQUEST',
      },
    });
  }

  const variablesParamType = extendedTypeof(params['variables']);
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
          code: 'BAD_REQUEST',
        },
      },
    );
  }

  const extensionsParamType = extendedTypeof(params['extensions']);
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
          code: 'BAD_REQUEST',
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
