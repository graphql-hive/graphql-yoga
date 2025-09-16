import { getOperationAST } from 'graphql';
import { HandlerOptions } from 'graphql-sse';
import { createHandler, RequestContext } from 'graphql-sse/lib/use/fetch';
import { Plugin, YogaInitialContext } from 'graphql-yoga';
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
            const enveloped = yoga.getEnveloped({
              ...ctxForReq.get(req.raw),
              request: req.raw,
              params,
            });

            const document = enveloped.parse(params.query);

            const errors = enveloped.validate(enveloped.schema, document);

            if (errors.length > 0) {
              return { errors };
            }

            return handleMaybePromise(
              () => enveloped.contextFactory(),
              contextValue => {
                const executionArgs = {
                  schema: enveloped.schema,
                  document,
                  contextValue,
                  variableValues: params.variables,
                  operationName: params.operationName,
                };

                const operation = getOperationAST(document, params.operationName);

                const executeFn =
                  operation?.operation === 'subscription' ? enveloped.subscribe : enveloped.execute;

                return executeFn(executionArgs);
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
