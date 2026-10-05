/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FetchAPI, YogaConfigContext } from '../types.js';
import { getRequestId } from '../utils/request-id.js';
import type { Plugin } from './types.js';

export interface GenerateRequestIdPayload<TContext> {
  request: Request;
  fetchAPI: FetchAPI;
  context: TContext;
}

export interface RequestIdOptions<TContext> {
  /**
   * Function to generate a request ID
   *
   * Ignored when `headerName` is available in the request headers, or when the host
   * integration already assigned an id to the native request object (see
   * {@link getHostRequestId}).
   */
  generateRequestId?: GenerateRequestIdFn<TContext>;
  /**
   * Header name to use for request ID
   *
   * Default: `x-request-id`
   */
  headerName?: string;
}

export type GenerateRequestIdFn<TContext> = (payload: GenerateRequestIdPayload<TContext>) => string;

export const defaultGenerateRequestId: GenerateRequestIdFn<any> = () =>
  globalThis.crypto.randomUUID();
export const defaultRequestIdHeader: string = 'x-request-id';

/**
 * Reads a request id the host integration already assigned to the native request object it
 * passes through the server context (e.g. Fastify's `request.id`, or an Express/Koa
 * request-id middleware that sets `req.id`), before Yoga ever saw the request.
 *
 * This lets Yoga's own id generation defer to a host's existing correlation id instead of
 * minting an unrelated one of its own, without the host needing to disable `useRequestId` and
 * reimplement the logger scoping it provides.
 */
function getHostRequestId(serverContext: unknown): string | undefined {
  const req = (serverContext as { req?: { id?: unknown } } | null | undefined)?.req;
  return typeof req?.id === 'string' && req.id.length > 0 ? req.id : undefined;
}

/**
 * Correlates everything happening while handling a request under a single request id.
 *
 * The id is taken from the `x-request-id` header of the incoming request if present (and
 * usable - see {@link getRequestId}); otherwise, a request id the host integration already set
 * on the native request object (see {@link getHostRequestId}) is reused; otherwise, one is
 * generated. It is then added to the server context's `log`ger as the `requestId` attribute,
 * and set on the outgoing response's headers.
 */
export function useRequestId<TServerContext extends Record<string, any>>(
  opts?: RequestIdOptions<TServerContext>,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
): Plugin<{}, TServerContext> {
  const requestIdByRequest = new WeakMap<Request, string>();
  const headerName = opts?.headerName || defaultRequestIdHeader;
  const generateRequestId = opts?.generateRequestId || defaultGenerateRequestId;
  return {
    onRequest({ request, fetchAPI, serverContext }) {
      const requestId = getRequestId(
        request.headers.get(headerName),
        () =>
          getHostRequestId(serverContext) ??
          generateRequestId({
            request,
            fetchAPI,
            context: serverContext as unknown as TServerContext,
          }),
      );
      requestIdByRequest.set(request, requestId);
      // `useConfigInServerContext` runs before this plugin and puts the logger in the server
      // context. It can still be missing when this plugin is used on its own, in which case the
      // request id is only propagated through the headers.
      const configContext = serverContext as Partial<YogaConfigContext>;
      configContext.log &&= configContext.log.child({ requestId });
    },
    onResponse({ request, response }) {
      const requestId = requestIdByRequest.get(request);
      if (requestId) {
        response.headers.set(headerName, requestId);
      }
    },
  };
}
