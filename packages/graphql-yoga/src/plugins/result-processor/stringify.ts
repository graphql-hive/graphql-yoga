import { GraphQLError } from 'graphql';
import { createGraphQLError, getSchemaCoordinate } from '@graphql-tools/utils';
import { isGraphQLError } from '../../error.js';
import { MaybeArray } from '../../types.js';
import { ExecutionResultWithSerializer } from '../types.js';

// JSON stringifier that adjusts the result error extensions while serialising
export function jsonStringifyResultWithoutInternals(
  result: MaybeArray<ExecutionResultWithSerializer>,
) {
  if (Array.isArray(result)) {
    return `[${result
      .map(r => {
        const sanitizedResult = omitInternalsFromResultErrors(r);
        const stringifier = r.stringify || JSON.stringify;
        return stringifier(sanitizedResult);
      })
      .join(',')}]`;
  }
  const sanitizedResult = omitInternalsFromResultErrors(result);
  const stringifier = result.stringify || JSON.stringify;
  return stringifier(sanitizedResult);
}
export function omitInternalsFromResultErrors(
  result: ExecutionResultWithSerializer,
): ExecutionResultWithSerializer {
  if (result.errors?.length || result.extensions?.http) {
    const newResult = { ...result } as ExecutionResultWithSerializer;
    newResult.errors &&= newResult.errors.map(omitInternalsFromError);
    if (newResult.extensions) {
      const { http, ...extensions } = result.extensions;
      newResult.extensions = Object.keys(extensions).length ? extensions : undefined;
    }
    return newResult;
  }
  return result;
}

function omitInternalsFromError<E extends GraphQLError | Error | undefined>(err: E): E {
  if (isGraphQLError(err)) {
    const serializedError =
      'toJSON' in err && typeof err.toJSON === 'function' ? err.toJSON() : Object(err);
    const { http, unexpected, ...extensions } = serializedError.extensions || {};
    return createGraphQLError(err.message, {
      nodes: err.nodes,
      source: err.source,
      positions: err.positions,
      path: err.path,
      originalError: omitInternalsFromError(err.originalError || undefined),
      extensions: Object.keys(extensions).length ? extensions : undefined,
      coordinate: getSchemaCoordinate(err),
    }) as E;
  }
  return err;
}
