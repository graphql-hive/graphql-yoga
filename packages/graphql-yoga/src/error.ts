import { GraphQLError } from 'graphql';
import { createGraphQLError } from '@graphql-tools/utils';
import type { YogaLogger } from '@graphql-yoga/logger';
import type { ResultProcessorInput } from './plugins/types.js';
import type { GraphQLHTTPExtensions, YogaMaskedErrorOpts } from './types.js';

// HTTP status codes mapping as per node:http
// TODO: assess usage and necessity for this
const STATUS_CODES: Record<string, string> = {
  '100': 'Continue',
  '101': 'Switching Protocols',
  '102': 'Processing',
  '103': 'Early Hints',
  '200': 'OK',
  '201': 'Created',
  '202': 'Accepted',
  '203': 'Non-Authoritative Information',
  '204': 'No Content',
  '205': 'Reset Content',
  '206': 'Partial Content',
  '207': 'Multi-Status',
  '208': 'Already Reported',
  '226': 'IM Used',
  '300': 'Multiple Choices',
  '301': 'Moved Permanently',
  '302': 'Found',
  '303': 'See Other',
  '304': 'Not Modified',
  '305': 'Use Proxy',
  '306': '(Unused)',
  '307': 'Temporary Redirect',
  '308': 'Permanent Redirect',
  '400': 'Bad Request',
  '401': 'Unauthorized',
  '402': 'Payment Required',
  '403': 'Forbidden',
  '404': 'Not Found',
  '405': 'Method Not Allowed',
  '406': 'Not Acceptable',
  '407': 'Proxy Authentication Required',
  '408': 'Request Timeout',
  '409': 'Conflict',
  '410': 'Gone',
  '411': 'Length Required',
  '412': 'Precondition Failed',
  '413': 'Payload Too Large',
  '414': 'URI Too Long',
  '415': 'Unsupported Media Type',
  '416': 'Range Not Satisfiable',
  '417': 'Expectation Failed',
  '418': "I'm a Teapot",
  '421': 'Misdirected Request',
  '422': 'Unprocessable Entity',
  '423': 'Locked',
  '424': 'Failed Dependency',
  '425': 'Too Early',
  '426': 'Upgrade Required',
  '428': 'Precondition Required',
  '429': 'Too Many Requests',
  '431': 'Request Header Fields Too Large',
  '451': 'Unavailable For Legal Reasons',
  '500': 'Internal Server Error',
  '501': 'Not Implemented',
  '502': 'Bad Gateway',
  '503': 'Service Unavailable',
  '504': 'Gateway Timeout',
  '505': 'HTTP Version Not Supported',
  '506': 'Variant Also Negotiates',
  '507': 'Insufficient Storage',
  '508': 'Loop Detected',
  '509': 'Bandwidth Limit Exceeded',
  '510': 'Not Extended',
  '511': 'Network Authentication Required',
};

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
    statusText: STATUS_CODES[status.toString()],
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
