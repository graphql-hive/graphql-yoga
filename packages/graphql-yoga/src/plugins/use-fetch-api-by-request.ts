import type { FetchAPI } from '../types.js';
import type { Plugin } from './types.js';

const fetchAPIByRequest = new WeakMap<Request, FetchAPI>();

/**
 * Returns the Fetch API `@whatwg-node/server` selected for this `Request`
 * (native vs ponyfill), as recorded during Yoga's `onRequest` hook.
 *
 * Useful outside Yoga's own pipeline (e.g. Hive Gateway) when you need the
 * same Fetch API instance that matches the incoming request's realm, instead
 * of a process-wide default.
 */
export function getFetchAPIByRequest(request: Request): FetchAPI | undefined {
  return fetchAPIByRequest.get(request);
}

/**
 * Remembers the Fetch API that `@whatwg-node/server` selected for each incoming
 * request so {@link getFetchAPIByRequest} and Yoga's own hooks can reuse it
 * instead of the process-wide `yoga.fetchAPI` default.
 *
 * Register this after other `onRequest` plugins so the WeakMap key is the final
 * `Request` (after any `setRequest` calls) that `handle` will see.
 */
export function useFetchAPIByRequest(): Plugin {
  return {
    onRequest({ request, fetchAPI }) {
      fetchAPIByRequest.set(request, fetchAPI);
    },
  };
}
