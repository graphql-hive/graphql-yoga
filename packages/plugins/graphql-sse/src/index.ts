import { GraphQLError } from 'graphql';
import type { HandlerOptions } from 'graphql-sse';
import type { RequestContext } from 'graphql-sse/lib/use/fetch';
import { createHandler } from 'graphql-sse/lib/use/fetch';
import type { Plugin, YogaInitialContext } from 'graphql-yoga';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

export interface GraphQLSSEPluginOptions
  extends Omit<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    HandlerOptions<Request, RequestContext, any>,
    'validate' | 'execute' | 'subscribe' | 'schema' | 'onSubscribe'
  > {
  /**
   * Endpoint location where GraphQL over SSE will be served.
   *
   * @default '/graphql/stream'
   */
  endpoint?: string;
}

/**
 * Get [GraphQL over Server-Sent Events Protocol](https://github.com/enisdenjo/graphql-sse/blob/master/PROTOCOL.md) integration with GraphQL Yoga by simply installing this plugin!
 *
 * Note that the endpoint defaults to `/graphql/stream`, this is where your [graphql-sse](https://github.com/enisdenjo/graphql-sse) client should connect.
 */
export function useGraphQLSSE(options: GraphQLSSEPluginOptions = {}): Plugin<YogaInitialContext> {
  const { endpoint = '/graphql/stream', ...handlerOptions } = options;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctxForReq = new WeakMap<Request, any>();
  let handler!: (request: Request) => Promise<Response>;
  return {
    onYogaInit({ yoga }) {
      handler = createHandler(
        {
          ...handlerOptions,
          onSubscribe(req, params) {
            // Route through `getResultForParams` (rather than calling `getEnveloped`'s
            // `parse`/`validate`/`execute` directly) so that Yoga's `onParams` hooks run first.
            // Plugins such as `usePersistedOperations` enforce their allowlist exclusively in
            // `onParams`;
            const context = ctxForReq.get(req.raw) ?? {};
            return handleMaybePromise(
              () => yoga.getResultForParams({ params, request: req.raw }, context),
              result => {
                if (!result) {
                  return { data: null, errors: [new GraphQLError('Unexpected empty result.')] };
                }
                // Errors raised before execution (syntax, validation, variable coercion) come back
                // without a `data` key, which graphql-sse would not recognize as an `ExecutionResult`.
                if (!('data' in result) && 'errors' in result) {
                  return { data: null, ...result };
                }
                return result;
              },
              error => {
                // `onParams` hooks reject by throwing (e.g. persisted-operations' "PersistedQueryOnly"),
                // same as a parse/validate error would. Shape it as a normal GraphQL error result
                // instead of letting it crash the handler. `data: null` is required here: unlike
                // the HTTP pipeline, graphql-sse's own result detection only recognizes an object
                // as an `ExecutionResult` (vs. mistaking it for raw `ExecutionArgs`) when it has a
                // `data` key.
                if (error instanceof GraphQLError) {
                  return { data: null, errors: [error] };
                }
                throw error;
              },
            );
          },
        },
        yoga.fetchAPI,
      );
    },
    onRequest({ request, endResponse, serverContext }) {
      const [path, _search] = request.url.split('?');
      if (path?.endsWith(endpoint)) {
        ctxForReq.set(request, serverContext);
        return handleMaybePromise(() => handler(request), endResponse);
      }
    },
  };
}
