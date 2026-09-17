import { createGraphQLError } from '@graphql-tools/utils';
import type { FetchAPI } from '../../types.js';
import type { Plugin } from '../types.js';

function createRequestBodyTooLargeError() {
  return createGraphQLError(`Request body too large`, {
    extensions: {
      http: {
        status: 413,
      },
      code: 'REQUEST_ENTITY_TOO_LARGE',
    },
  });
}

function createInvalidContentLengthError() {
  return createGraphQLError('Content-Length header is invalid.', {
    extensions: {
      http: {
        status: 400,
      },
      code: 'BAD_REQUEST',
    },
  });
}

// Only a single non-negative integer is a valid Content-Length. Anything else (non-numeric,
// negative, or multiple comma-joined values as seen in request-smuggling attempts) is rejected
// outright instead of being allowed to silently skip this check.
const CONTENT_LENGTH_RE = /^\d+$/;

// Covers requests with a missing/incorrect Content-Length (e.g. chunked transfer-encoding).
export function limitRequestBodySize(request: Request, limit: number, fetchAPI: FetchAPI): Request {
  const body = request.body;
  if (!body) {
    return request;
  }

  // Workaround until the next version of whatwg-node automatically normalizes the request body
  // Once the normalization implemented in whatwg-node, this workaround can be removed.
  // Since the request body is the native ReadableStream, it conflicts the ponyfill implementation of the TransformStream.
  // See https://github.com/graphql-hive/graphql-yoga/issues/4583
  const TransformStreamCtor =
    request.body instanceof ReadableStream ? globalThis.TransformStream : fetchAPI.TransformStream;

  let bytesRead = 0;
  const limitedBody = body.pipeThrough(
    new TransformStreamCtor<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        bytesRead += chunk.byteLength;
        if (bytesRead > limit) {
          controller.error(createRequestBodyTooLargeError());
          return;
        }
        controller.enqueue(chunk);
      },
    }),
  );

  return new fetchAPI.Request(request.url, {
    method: request.method,
    headers: request.headers,
    signal: request.signal,
    body: limitedBody,
    // @ts-expect-error Missing TypeScript types
    duplex: 'half',
  });
}

// Must run after all request parsers (built-in and user-provided) have registered, so
// `requestParser` reflects whichever one was ultimately selected.
export function useLimitRequestBodySize(limit: number | false): Plugin {
  if (limit === false) {
    return {};
  }
  return {
    onRequestParse({ request, requestParser, setRequestParser, fetchAPI }) {
      const contentLength = request.headers.get('content-length');
      if (contentLength != null) {
        if (!CONTENT_LENGTH_RE.test(contentLength)) {
          throw createInvalidContentLengthError();
        }
        if (Number(contentLength) > limit) {
          throw createRequestBodyTooLargeError();
        }
      }

      if (requestParser == null || request.body == null) {
        return;
      }

      const originalParser = requestParser;
      setRequestParser(req => originalParser(limitRequestBodySize(req, limit, fetchAPI)));
    },
  };
}
