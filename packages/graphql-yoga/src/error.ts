import { GraphQLError } from 'graphql';
import { createGraphQLError } from '@graphql-tools/utils';
import type { YogaLogger } from '@graphql-yoga/logger';
import type { ResultProcessorInput } from './plugins/types.js';
import type { GraphQLHTTPExtensions, YogaMaskedErrorOpts } from './types.js';

declare module 'graphql' {
  interface GraphQLErrorExtensions {
    http?: GraphQLHTTPExtensions;
    unexpected?: boolean;
  }
}

function isAggregateError(obj: unknown): obj is AggregateError {
  return obj != null && typeof obj === 'object' && 'errors' in obj;
}

function hasToString(obj: unknown): obj is { toString(): string } {
  return obj != null && typeof obj.toString === 'function';
}

export function isGraphQLError(val: unknown): val is GraphQLError {
  return val instanceof GraphQLError;
}

export function isOriginalGraphQLError(
  val: unknown,
): val is GraphQLError & { originalError: GraphQLError } {
  if (val instanceof GraphQLError) {
    if (val.originalError != null) {
      return isOriginalGraphQLError(val.originalError);
    }
    return true;
  }
  return false;
}

/**
 * Will replace all graphql's `NonErrorThrown` wraps with their `thrownValue` property.
 *
 * It wont mutate the original error, but will return a new one with all `NonErrorThrown` removed.
 *
 * @see https://github.com/graphql/graphql-js/blob/ba4b411385507929b6c4c7905eb04b3e6bd1e93c/src/jsutils/toError.ts#L12-L20
 */
export function flattenNonErrorThrownValues(err: GraphQLError): GraphQLError;
export function flattenNonErrorThrownValues(err: Error): Error;
export function flattenNonErrorThrownValues(err: unknown): unknown;
export function flattenNonErrorThrownValues(err: unknown): unknown {
  // we create a new error to avoid mutating the original one
  let flattenedErr = err;
  if (isGraphQLError(err) && err.originalError) {
    flattenedErr = createGraphQLError(err.message, {
      extensions: err.extensions,
      nodes: err.nodes,
      source: err.source,
      positions: err.positions,
      path: err.path,
      originalError: flattenNonErrorThrownValues(err.originalError),
    });
  }
  if (err instanceof Error && err.name === 'NonErrorThrown' && 'thrownValue' in err) {
    flattenedErr = flattenNonErrorThrownValues(err.thrownValue);
  }
  return flattenedErr;
}

export function isAbortError(error: unknown): error is DOMException {
  return (
    typeof error === 'object' &&
    error?.constructor?.name === 'DOMException' &&
    ((error as DOMException).name === 'AbortError' ||
      (error as DOMException).name === 'TimeoutError')
  );
}

export function handleError(
  error: unknown,
  maskedErrorsOpts: YogaMaskedErrorOpts | null,
  logger: YogaLogger,
): GraphQLError[] {
  const errors = new Set<GraphQLError>();
  if (isAggregateError(error)) {
    for (const singleError of error.errors) {
      const handledErrors = handleError(singleError, maskedErrorsOpts, logger);
      for (const handledError of handledErrors) {
        errors.add(handledError);
      }
    }
  } else if (isAbortError(error)) {
    logger.debug('Request aborted');
  } else if (maskedErrorsOpts) {
    const maskedError = maskedErrorsOpts.maskError(
      error,
      maskedErrorsOpts.errorMessage,
      maskedErrorsOpts.isDev,
    );

    if (maskedError !== error) {
      logger.error(error);
    }

    errors.add(
      isGraphQLError(maskedError)
        ? maskedError
        : createGraphQLError(maskedError.message, {
            originalError: maskedError,
          }),
    );
  } else if (isGraphQLError(error)) {
    errors.add(error);
  } else if (error instanceof Error) {
    errors.add(
      createGraphQLError(error.message, {
        originalError: error,
      }),
    );
  } else if (typeof error === 'string') {
    errors.add(
      createGraphQLError(error, {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          unexpected: true,
        },
      }),
    );
  } else if (hasToString(error)) {
    errors.add(
      createGraphQLError(error.toString(), {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          unexpected: true,
        },
      }),
    );
  } else {
    logger.error(error);
    errors.add(
      createGraphQLError('Unexpected error.', {
        extensions: {
          http: {
            unexpected: true,
          },
        },
      }),
    );
  }
  return Array.from(errors);
}
export function getResponseInitByRespectingErrors(
  result: ResultProcessorInput,
  headers: Record<string, string> = {},
  isApplicationJson = false,
) {
  let status: number | undefined;
  let unexpectedErrorExists = false;

  if ('extensions' in result && result.extensions?.http) {
    if (result.extensions.http.headers) {
      Object.assign(headers, result.extensions.http.headers);
    }
    if (result.extensions.http.status) {
      status = result.extensions.http.status;
    }
  }

  if ('errors' in result && result.errors?.length) {
    for (const error of result.errors) {
      if (error.extensions?.['http']) {
        if (error.extensions['http'].headers) {
          Object.assign(headers, error.extensions['http'].headers);
        }
        if (isApplicationJson && error.extensions['http'].spec) {
          continue;
        }
        if (
          error.extensions['http'].status &&
          (!status || error.extensions['http'].status > status)
        ) {
          status = error.extensions['http'].status;
        }
      } else if (!isOriginalGraphQLError(error) || error.extensions?.['unexpected']) {
        unexpectedErrorExists = true;
      }
    }
  } else {
    status ||= 200;
  }

  if (!status) {
    if (unexpectedErrorExists && !('data' in result)) {
      status = 500;
    } else {
      status = 200;
    }
  }

  return {
    status,
    headers,
  };
}
export function areGraphQLErrors(obj: unknown): obj is readonly GraphQLError[] {
  return (
    Array.isArray(obj) &&
    obj.length > 0 &&
    // if one item in the array is a GraphQLError, we're good
    obj.some(isGraphQLError)
  );
}
