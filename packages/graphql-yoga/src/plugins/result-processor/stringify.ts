import { GraphQLError } from 'graphql';
import { getSchemaCoordinate } from '@graphql-tools/utils';
import { isGraphQLError, withSchemaCoordinate } from '../../error.js';
import type { MaybeArray } from '../../types.js';
import type { ExecutionResultWithSerializer } from '../types.js';

const textDecoder = new TextDecoder();

// Serializers may return the UTF-8 encoded JSON text; decode where a string is needed.
export function serializedResultToString(serialized: string | Uint8Array): string {
  return typeof serialized === 'string' ? serialized : textDecoder.decode(serialized);
}

function stringifyOne(result: ExecutionResultWithSerializer): string | Uint8Array {
  const sanitizedResult = omitInternalsFromResultErrors(result);
  const stringifier = result.stringify || JSON.stringify;
  return stringifier(sanitizedResult);
}

// JSON stringifier that adjusts the result error extensions while serialising.
// A single result is returned as the serializer produced it (string or bytes).
export function jsonStringifyResultWithoutInternals(
  result: MaybeArray<ExecutionResultWithSerializer>,
): string | Uint8Array {
  if (Array.isArray(result)) {
    return `[${result.map(r => serializedResultToString(stringifyOne(r))).join(',')}]`;
  }
  return stringifyOne(result);
}
export function omitInternalsFromResultErrors(
  result: ExecutionResultWithSerializer,
): ExecutionResultWithSerializer {
  if (result.errors?.length || result.extensions?.http) {
    const newResult = { ...result } as ExecutionResultWithSerializer;
    newResult.errors &&= newResult.errors.map(omitInternalsFromError);
    if (newResult.extensions) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TS should check for unused vars instead
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TS should check for unused vars instead
    const { http, unexpected, ...extensions } = serializedError.extensions || {};
    return withSchemaCoordinate(
      new GraphQLError(err.message, {
        nodes: err.nodes,
        source: err.source,
        positions: err.positions,
        path: err.path,
        originalError: omitInternalsFromError(err.originalError || undefined),
        extensions: Object.keys(extensions).length ? extensions : undefined,
      }),
      getSchemaCoordinate(err),
    ) as E;
  }
  return err;
}
