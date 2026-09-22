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
   * Ignored when `headerName` is available in the request headers
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

export const defaultGenerateRequestId: GenerateRequestIdFn<any> = ({ fetchAPI }) =>
  fetchAPI.crypto.randomUUID();
export const defaultRequestIdHeader: string = 'x-request-id';

/**
 * Correlates everything happening while handling a request under a single request id.
 *
 * The id is taken from the `x-request-id` header of the incoming request, or generated when
 * the header is absent (or carries an unusable value - see {@link getRequestId}). It is then
 * added to the server context's `log`ger as the `requestId` attribute, and set on the outgoing
 * response's headers.
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
      const requestId = getRequestId(request.headers.get(headerName), () =>
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
