import { GraphQLError } from 'graphql';
import { Logger } from '@graphql-hive/logger';
import {
  HTTPError,
  InvalidContentLengthError,
  RequestBodyTooLargeError,
} from '@whatwg-node/server';
import { getRequestLog } from './logger.js';
import type { ResultProcessorInput } from './plugins/types.js';
import type {
  FetchAPI,
  GraphQLHTTPExtensions,
  YogaInitialContext,
  YogaMaskedErrorOpts,
} from './types.js';

declare module 'graphql' {
  interface GraphQLError {
    /**
     * Optional schema coordinate (e.g. "MyType.myField") associated with this error.
     * Experimental; populated when useErrorCoordinate / schemaCoordinateInErrors is enabled.
     */
    readonly coordinate?: string;
  }
  interface GraphQLErrorExtensions {
    http?: GraphQLHTTPExtensions;
    unexpected?: boolean;
  }
}

/**
 * Attach experimental schema `coordinate` to a GraphQLError.
 * graphql-js GraphQLErrorOptions does not know about coordinate yet, so this
 * uses defineProperty (same approach as `@graphql-tools/utils` locatedError).
 *
 * Prefer reading with `getSchemaCoordinate` from `@graphql-tools/utils`.
 */
export function withSchemaCoordinate(
  error: GraphQLError,
  coordinate: string | undefined,
): GraphQLError {
  if (coordinate != null && error.coordinate == null) {
    Object.defineProperties(error, {
      coordinate: { value: coordinate, enumerable: true, configurable: true },
    });
  }
  return error;
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

export function isAbortError(error: unknown): error is DOMException {
  return (
    typeof error === 'object' &&
    error?.constructor?.name === 'DOMException' &&
    ((error as DOMException).name === 'AbortError' ||
      (error as DOMException).name === 'TimeoutError')
  );
}

export function isRequestBodyLimitError(
  error: unknown,
): error is RequestBodyTooLargeError | InvalidContentLengthError {
  return error instanceof RequestBodyTooLargeError || error instanceof InvalidContentLengthError;
}

function headersInitToRecord(headers: HeadersInit): Record<string, string> {
  return Object.fromEntries(new Headers(headers).entries());
}

function graphQLErrorFromBodyLimitError(
  error: RequestBodyTooLargeError | InvalidContentLengthError,
): GraphQLError {
  const headers = headersInitToRecord(error.headers);
  if (error instanceof RequestBodyTooLargeError) {
    return new GraphQLError(error.message, {
      originalError: error,
      extensions: {
        http: {
          status: 413,
          ...(Object.keys(headers).length > 0 ? { headers } : {}),
        },
        code: 'REQUEST_ENTITY_TOO_LARGE',
      },
    });
  }
  return new GraphQLError(error.message, {
    originalError: error,
    extensions: {
      http: {
        status: 400,
        ...(Object.keys(headers).length > 0 ? { headers } : {}),
      },
      code: 'BAD_REQUEST',
    },
  });
}

// Passed as `responseFromError` to `@whatwg-node/server`'s `useLimitRequestBodySize` so the
// early (Content-Length based) rejection responds with a GraphQL-shaped error body instead of
// that plugin's plain-text default.
export function responseFromBodyLimitError(
  error: HTTPError,
  fetchAPI: Pick<FetchAPI, 'Response'>,
): Response {
  if (!isRequestBodyLimitError(error)) {
    throw error;
  }
  return new fetchAPI.Response(
    JSON.stringify({ errors: [graphQLErrorFromBodyLimitError(error)] }),
    {
      status: error.status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        ...error.headers,
      },
    },
  );
}

// Used only when a caller passes a context without a `.log`
const fallbackLog = new Logger();

export function handleError(
  error: unknown,
  maskedErrorsOpts: YogaMaskedErrorOpts | null,
  context: Partial<YogaInitialContext>,
): GraphQLError[] {
  const log = getRequestLog(context, fallbackLog);
  const errors = new Set<GraphQLError>();
  if (isAggregateError(error)) {
    for (const singleError of error.errors) {
      const handledErrors = handleError(singleError, maskedErrorsOpts, context);
      for (const handledError of handledErrors) {
        errors.add(handledError);
      }
    }
  } else if (isAbortError(error)) {
    log.debug('Request aborted');
  } else if (isRequestBodyLimitError(error)) {
    errors.add(graphQLErrorFromBodyLimitError(error));
  } else if (maskedErrorsOpts) {
    const maskedError = maskedErrorsOpts.maskError(
      error,
      maskedErrorsOpts.errorMessage,
      maskedErrorsOpts.isDev,
      context,
    );

    errors.add(
      isGraphQLError(maskedError)
        ? maskedError
        : new GraphQLError(maskedError.message, {
            originalError: maskedError,
          }),
    );
  } else if (isGraphQLError(error)) {
    errors.add(error);
  } else if (error instanceof Error) {
    errors.add(
      new GraphQLError(error.message, {
        originalError: error,
      }),
    );
  } else if (typeof error === 'string') {
    errors.add(
      new GraphQLError(error, {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          unexpected: true,
        },
      }),
    );
  } else if (hasToString(error)) {
    errors.add(
      new GraphQLError(error.toString(), {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          unexpected: true,
        },
      }),
    );
  } else {
    log.error({ err: error });
    errors.add(
      new GraphQLError('Unexpected error.', {
        extensions: {
          unexpected: true,
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
