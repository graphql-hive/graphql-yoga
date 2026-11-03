import { useLimitRequestBodySize as useWhatwgLimitRequestBodySize } from '@whatwg-node/server';
import { responseFromBodyLimitError } from '../../error.js';
import type { Plugin } from '../types.js';

// Must run after all request parsers (built-in and user-provided) have registered, so
// `requestParser` reflects whichever one was ultimately selected. The size-limited request is
// only ever passed to that parser, never assigned back to the outer `request`, so
// `context.request`/plugin hooks keep seeing the exact `Request` object the caller passed in.
export function useLimitRequestBodySize(limit: number | false): Plugin {
  if (limit === false) {
    return {};
  }

  // Reuses `@whatwg-node/server`'s Content-Length validation and per-chunk byte counting
  // (and its fuller Request reconstruction - cache/credentials/integrity/keepalive/mode/
  // redirect/referrer/referrerPolicy - that a hand-rolled copy here previously dropped),
  // instead of forking that logic. It's built as an `onRequest` plugin, so it's invoked
  // directly below rather than registered as one, to keep its `setRequest` call scoped to
  // the request parser instead of the outer request that becomes `context.request`.
  const limiter = useWhatwgLimitRequestBodySize(limit, {
    responseFromError: responseFromBodyLimitError,
  });

  return {
    onRequestParse({
      request,
      requestParser,
      setRequestParser,
      fetchAPI,
      endResponse,
      serverContext,
      url,
    }) {
      if (requestParser == null) {
        return;
      }

      let wrappedRequest = request;

      // `useLimitRequestBodySize`'s `onRequest` only reads `request`/`setRequest`/`fetchAPI`/
      // `endResponse`; `requestHandler`/`setRequestHandler` are omitted and the payload is cast
      // since we're calling this hook directly instead of registering it as a plugin.
      // `fetchAPI` is the per-request instance from Yoga (native for a native Request), so
      // piping through `fetchAPI.TransformStream` does not cross realms.
      limiter.onRequest?.({
        request,
        setRequest(newRequest: Request) {
          wrappedRequest = newRequest;
        },
        endResponse,
        fetchAPI,
        serverContext,
        url,
        // unused by the limiter but required to satisfy the payload type
        setRequestHandler: () => {},
        requestHandler: () => new fetchAPI.Response(),
      });

      const originalParser = requestParser;
      setRequestParser(req => originalParser(req === request ? wrappedRequest : req));
    },
  };
}
