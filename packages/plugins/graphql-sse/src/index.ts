import type { DocumentNode } from 'graphql';
import { getOperationAST, GraphQLError } from 'graphql';
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

// graphql-sse only recognizes an object as an execution result when it has a `data` key.
function errorResult(errors: readonly GraphQLError[]) {
  return { data: null, errors };
}

function isErrorOnlyResult(result: unknown): result is { errors: readonly GraphQLError[] } {
  return (
    typeof result === 'object' &&
    result !== null &&
    !(Symbol.asyncIterator in result) &&
    !('data' in result) &&
    'errors' in result &&
    Array.isArray(result.errors)
  );
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

            let document: DocumentNode;
            try {
              document = enveloped.parse(params.query);
            } catch (error) {
              return errorResult([
                error instanceof GraphQLError
                  ? error
                  : new GraphQLError(error instanceof Error ? error.message : String(error), {
                      originalError: error instanceof Error ? error : undefined,
                    }),
              ]);
            }

            const errors = enveloped.validate(enveloped.schema, document);

            if (errors.length > 0) {
              return errorResult(errors);
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

                return handleMaybePromise(
                  () => executeFn(executionArgs),
                  // Errors raised before execution (e.g. variable coercion) are
                  // returned without a `data` key, which graphql-sse does not
                  // recognize as an execution result.
                  result => (isErrorOnlyResult(result) ? errorResult(result.errors) : result),
                );
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
