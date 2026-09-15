import { createGraphQLError } from '@graphql-tools/utils';
import type { FetchAPI } from '../../types.js';
import type { Plugin } from '../types.js';

function createRequestBodyTooLargeError(limit: number) {
  return createGraphQLError(`Request body must not be larger than ${limit} bytes.`, {
    extensions: {
      http: {
        status: 413,
      },
      code: 'REQUEST_ENTITY_TOO_LARGE',
    },
  });
}

// Covers requests with a missing/incorrect Content-Length (e.g. chunked transfer-encoding).
export function limitRequestBodySize(request: Request, limit: number, fetchAPI: FetchAPI): Request {
  const body = request.body;
  if (!body) {
    return request;
  }

  let bytesRead = 0;
  const limitedBody = body.pipeThrough(
    new fetchAPI.TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        bytesRead += chunk.byteLength;
        if (bytesRead > limit) {
          controller.error(createRequestBodyTooLargeError(limit));
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
    // Required by some runtimes for streamed bodies; missing from `fetchAPI.Request`'s types.
    duplex: 'half',
  } as RequestInit);
}

// Must run after the built-in request parsers have registered, so `requestParser` is already set.
export function useLimitRequestBodySize(limit: number | false): Plugin {
  if (limit === false) {
    return {};
  }
  return {
    onRequestParse({ request, requestParser, setRequestParser, fetchAPI }) {
      const contentLength = request.headers.get('content-length');
      if (contentLength != null) {
        const declaredSize = Number(contentLength);
        if (Number.isFinite(declaredSize) && declaredSize > limit) {
          throw createRequestBodyTooLargeError(limit);
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
