import { ExecutionResult, GraphQLError } from 'graphql';
import { createGraphQLError, getSchemaCoordinate } from '@graphql-tools/utils';
import { isGraphQLError } from '../../error.js';
import { MaybeArray } from '../../types.js';
import { ExecutionResultWithSerializer } from '../types.js';
import { stringifyWithDocument } from './stringify-with-document/stringify-with-document.js';
import { CLOSE_BRACKET, COMMA, OPEN_BRACKET } from './stringify-with-document/consts.js';
import { executionArgsByResult } from '../use-result-processor.js';

// JSON stringifier that adjusts the result error extensions while serialising
export function jsonStringifyResultWithoutInternals(
  result: MaybeArray<ExecutionResultWithSerializer>,
) {
  if (Array.isArray(result)) {
    let buf = OPEN_BRACKET;
    for (let i = 0; i < result.length; i++) {
      if (i > 0) {
        buf += COMMA;
      }
      buf += jsonStringifySingleResultWithoutInternals(result[i]!);
    }
    buf += CLOSE_BRACKET;
    return buf;
  }
  return jsonStringifySingleResultWithoutInternals(result);
}

function jsonStringifySingleResultWithoutInternals(result: ExecutionResultWithSerializer) {
  if (result.stringify) {
    const sanitizedResult = omitInternalsFromResultErrors(result);
    return result.stringify(sanitizedResult);
  }
  if (result.incremental == null && result.hasNext == null) {
    const executionArgs = executionArgsByResult.get(result);
    if (executionArgs) {
      return stringifyWithDocument(result, executionArgs);
    }
  }
  const sanitizedResult = omitInternalsFromResultErrors(result);
  return JSON.stringify(sanitizedResult);
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

export function omitInternalsFromError<E extends GraphQLError | Error | undefined>(err: E): E {
  if (isGraphQLError(err)) {
    const serializedError =
      'toJSON' in err && typeof err.toJSON === 'function' ? err.toJSON() : Object(err);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TS should check for unused vars instead
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
