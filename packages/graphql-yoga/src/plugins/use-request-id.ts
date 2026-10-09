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
   * Ignored when the host integration already assigned an id to the native request object (see
   * {@link getHostRequestId}), or when `trustHeader` is enabled and `headerName` is available in
   * the request headers.
   */
  generateRequestId?: GenerateRequestIdFn<TContext>;
  /**
   * Header name to use for request ID
   *
   * Default: `x-request-id`
   */
  headerName?: string;
  /**
   * Use the incoming request's `headerName` header as the request id, when present.
   *
   * Turn this off when the server is directly reachable by clients, rather than only through a
   * proxy or gateway that sets the header itself - otherwise any client can pick its own request
   * id (and have it correlated across your logs as if it were trusted), including one already in
   * use for another request.
   *
   * Has no effect when the host integration already assigned an id to the native request object
   * (see {@link getHostRequestId}), which always takes precedence so Yoga's logs agree with the
   * host's own.
   *
   * @default true
   */
  trustHeader?: boolean;
}

export type GenerateRequestIdFn<TContext> = (payload: GenerateRequestIdPayload<TContext>) => string;

export const defaultGenerateRequestId: GenerateRequestIdFn<any> = () =>
  globalThis.crypto.randomUUID();
export const defaultRequestIdHeader: string = 'x-request-id';

export function getRequestIdHeaderName<TContext>(opts?: RequestIdOptions<TContext>): string {
  return opts?.headerName || defaultRequestIdHeader;
}

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
 * A request id the host integration already set on the native request object (see
 * {@link getHostRequestId}) is preferred first, so Yoga's logs always agree with the host's own;
 * otherwise, if `trustHeader` is enabled (the default), the `x-request-id` header of the
 * incoming request is used if present and usable (see {@link getRequestId}); otherwise, one is
 * generated. It is then added to the server context's `log`ger as the `requestId` attribute, and
 * set on the outgoing response's headers.
 */
export function useRequestId<TServerContext extends Record<string, any>>(
  opts?: RequestIdOptions<TServerContext>,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
): Plugin<{}, TServerContext> {
  const requestIdByRequest = new WeakMap<Request, string>();
  const headerName = getRequestIdHeaderName(opts);
  const trustHeader = opts?.trustHeader ?? true;
  const generateRequestId = opts?.generateRequestId || defaultGenerateRequestId;
  return {
    onRequest({ request, fetchAPI, serverContext }) {
      const generate = () =>
        generateRequestId({
          request,
          fetchAPI,
          context: serverContext as unknown as TServerContext,
        });

      let requestId = getHostRequestId(serverContext);
      requestId ??= trustHeader
        ? getRequestId(request.headers.get(headerName), generate)
        : generate();
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
