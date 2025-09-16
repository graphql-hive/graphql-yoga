import { GraphQLError, ResponsePath } from 'graphql';
import {
  createGraphQLError,
  FetchAPI,
  isAsyncIterable,
  mapMaybePromise,
  Plugin,
  YogaInitialContext,
  YogaLogger,
} from 'graphql-yoga';
import { google, Trace } from '@apollo/usage-reporting-protobuf';
import { useOnResolve } from '@envelop/on-resolve';

export interface ApolloInlineRequestTraceContext {
  startHrTime: [number, number];
  traceStartTimestamp: google.protobuf.Timestamp;
  traces: Map<YogaInitialContext, ApolloInlineGraphqlTraceContext>;

  /**
   * graphql-js can continue to execute more fields indefinitely after
   * `execute()` resolves. That's because parallelism on a selection set
   * is implemented using `Promise.all`, and as soon as one field
   * throws an error, the combined Promise resolves, but there's no
   * "cancellation" of the rest of Promises/fields in `Promise.all`.
   */
  stopped: boolean;
}

export interface ApolloInlineGraphqlTraceContext {
  rootNode: Trace.Node;
  trace: Trace;
  nodes: Map<string, Trace.Node>;
}

export interface ApolloInlineTracePluginOptions {
  /**
   * Format errors before being sent for tracing. Beware that only the error
   * `message` and `extensions` can be changed.
   *
   * Return `null` to skip reporting error.
   */
  rewriteError?: (err: GraphQLError) => GraphQLError | null;
  /**
   * Allows to entirely disable tracing based on the HTTP request
   * @param request HTTP request from the execution context
   * @returns If true is returned (either as is or wrapped in Promise), traces for this request will
   *          not be generated.
   */
  ignoreRequest?: (request: Request) => Promise<boolean> | boolean;
}

/**
 * Produces Apollo's base64 trace protocol containing timing, resolution and
 * errors information.
 *
 * The output is placed in `extensions.ftv1` of the GraphQL result.
 *
 * The Apollo Gateway utilizes this data to construct the full trace and submit
 * it to Apollo's usage reporting ingress.
 */
export function useApolloInlineTrace(
  options: ApolloInlineTracePluginOptions = {},
): Plugin<YogaInitialContext> {
  const [instrumentation, ctxForReq] = useApolloInstrumentation({
    ignoreRequest: request => request.headers.get('apollo-federation-include-trace') !== 'ftv1',
    ...options,
  });

  let fetchAPI: FetchAPI;

  return {
    onYogaInit({ yoga }) {
      fetchAPI = yoga.fetchAPI;
    },
    onPluginInit({ addPlugin }) {
      addPlugin(instrumentation);
      addPlugin({
        onExecutionResult({ request, result, context, setResult }) {
          // TODO: should handle streaming results? how?
          if (!result || isAsyncIterable(result)) {
            return;
          }

          if (result.extensions?.ftv1 !== undefined) {
            throw new Error('The `ftv1` extension is already present');
          }

          const reqCtx = ctxForReq.get(request);
          if (!reqCtx) {
            return;
          }

          const ctx = reqCtx.traces.get(context);
          if (!ctx) {
            return;
          }

          const encodedUint8Array = Trace.encode(ctx.trace).finish();
          const base64 = fetchAPI.btoa(String.fromCharCode(...encodedUint8Array));
          setResult({
            ...result,
            extensions: {
              ...result.extensions,
              ftv1: base64,
            },
          });
        },
      });
    },
  };
}

/**
 * Instrument GraphQL request processing pipeline and creates Apollo compatible tracing data.
 *
 * This is meant as a helper, do not use it directly. Use `useApolloInlineTrace` or `useApolloUsageReport` instead.
 * @param options
 * @returns A tuple with the instrumentation plugin and a WeakMap containing the tracing data
 */
export function useApolloInstrumentation(options: ApolloInlineTracePluginOptions) {
  const ctxForReq = new WeakMap<Request, ApolloInlineRequestTraceContext>();
  let logger: YogaLogger;

  function createContext() {
    return {
      startHrTime: process.hrtime(),
      traceStartTimestamp: nowTimestamp(),
      traces: new Map(),
      stopped: false,
    };
  }

  function setNewContext(request: Request) {
    try {
      ctxForReq.set(request, createContext());
    } catch (err) {
      logger.error('Apollo inline error:', err);
    }
  }

  const plugin: Plugin = {
    onYogaInit({ yoga }) {
      logger = yoga.logger;
    },
    onPluginInit: ({ addPlugin }) => {
      addPlugin(
        useOnResolve(({ context, info }) => {
          const reqCtx = ctxForReq.get(context.request);
          if (!reqCtx) return;
          // result was already shipped (see ApolloInlineTraceContext.stopped)
          if (reqCtx.stopped) {
            return;
          }

          const ctx = reqCtx.traces.get(context);
          if (!ctx) {
            return;
          }

          const node = newTraceNode(ctx, info.path);
          node.type = info.returnType.toString();
          node.parentType = info.parentType.toString();
          node.startTime = hrTimeToDurationInNanos(process.hrtime(reqCtx.startHrTime));
          if (typeof info.path.key === 'string' && info.path.key !== info.fieldName) {
            // field was aliased, send the original field name too
            node.originalFieldName = info.fieldName;
          }

          return () => {
            node.endTime = hrTimeToDurationInNanos(process.hrtime(reqCtx.startHrTime));
          };
        }),
      );
    },
    onRequest({ request }): void | Promise<void> {
      if (options.ignoreRequest) {
        return mapMaybePromise(options.ignoreRequest(request), shouldIgnore => {
          if (!shouldIgnore) {
            setNewContext(request);
          }
        });
      }
      setNewContext(request);
    },
    onEnveloped({ context }) {
      if (!context) {
        return;
      }
      const reqCtx = ctxForReq.get(context.request);
      if (!reqCtx) return;

      const rootNode = new Trace.Node();
      const ctx = {
        rootNode,
        trace: new Trace({
          root: rootNode,
          fieldExecutionWeight: 1, // Why 1? See: https://github.com/apollographql/apollo-server/blob/9389da785567a56e989430962564afc71e93bd7f/packages/apollo-server-core/src/plugin/traceTreeBuilder.ts#L16-L23
          startTime: reqCtx.traceStartTimestamp,
        }),
        nodes: new Map([[responsePathToString(), rootNode]]),
      };
      reqCtx.traces.set(context, ctx);
    },
    onExecutionResult({ context, request, result }) {
      // TODO: should handle streaming results? how?
      if (result == null || isAsyncIterable(result)) {
        return;
      }

      const reqCtx = ctxForReq.get(request);
      const ctx = reqCtx?.traces.get(context);
      if (!reqCtx || !ctx || reqCtx.stopped) {
        return;
      }

      if (result.errors?.length && reqCtx && ctx) {
        handleErrors(reqCtx, ctx, result.errors, options.rewriteError);
      }
      ctx.trace.durationNs = hrTimeToDurationInNanos(process.hrtime(reqCtx.startHrTime));
      ctx.trace.endTime = nowTimestamp();
    },
    onResultProcess({ request, result }) {
      // TODO: should handle streaming results? how?
      if (isAsyncIterable(result)) return;

      const reqCtx = ctxForReq.get(request);
      if (!reqCtx) return;
      // onResultProcess will be called only once since we disallow async iterables
      if (reqCtx.stopped) {
        logger.debug('Trace stopped multiple times');
      }

      reqCtx.stopped = true;
    },
  };

  return [plugin, ctxForReq] as const;
}

/**
 * Converts an hrtime array (as returned from process.hrtime) to nanoseconds.
 *
 * The entire point of the hrtime data structure is that the JavaScript Number
 * type can't represent all int64 values without loss of precision.
 *
 * Reference: https://github.com/apollographql/apollo-server/blob/9389da785567a56e989430962564afc71e93bd7f/packages/apollo-server-core/src/plugin/traceTreeBuilder.ts#L269-L285
 */
function hrTimeToDurationInNanos(hrtime: [number, number]) {
  return hrtime[0] * 1e9 + hrtime[1];
}

/**
 * Current time from Date.now() as a google.protobuf.Timestamp.
 *
 * Reference: https://github.com/apollographql/apollo-server/blob/9389da785567a56e989430962564afc71e93bd7f/packages/apollo-server-core/src/plugin/traceTreeBuilder.ts#L315-L323
 */
function nowTimestamp(): google.protobuf.Timestamp {
  const totalMillis = Date.now();
  const millis = totalMillis % 1000;
  return new google.protobuf.Timestamp({
    seconds: (totalMillis - millis) / 1000,
    nanos: millis * 1e6,
  });
}

/**
 * Convert from the linked-list ResponsePath format to a dot-joined
 * string. Includes the full path (field names and array indices).
 *
 * Reference: https://github.com/apollographql/apollo-server/blob/9389da785567a56e989430962564afc71e93bd7f/packages/apollo-server-core/src/plugin/traceTreeBuilder.ts#L287-L303
 */
function responsePathToString(path?: ResponsePath): string {
  if (path === undefined) {
    return '';
  }

  // `responsePathAsArray` from `graphql-js/execution` created new arrays unnecessarily
  let res = String(path.key);

  while ((path = path.prev) !== undefined) {
    res = `${path.key}.${res}`;
  }

  return res;
}

function ensureParentTraceNode(
  ctx: ApolloInlineGraphqlTraceContext,
  path: ResponsePath,
): Trace.Node {
  const parentNode = ctx.nodes.get(responsePathToString(path.prev));
  if (parentNode) return parentNode;
  // path.prev isn't undefined because we set up the root path in ctx.nodes

  return newTraceNode(ctx, path.prev!);
}

function newTraceNode(ctx: ApolloInlineGraphqlTraceContext, path: ResponsePath) {
  const node = new Trace.Node();
  const id = path.key;
  if (typeof id === 'number') {
    node.index = id;
  } else {
    node.responseName = id;
  }
  ctx.nodes.set(responsePathToString(path), node);
  const parentNode = ensureParentTraceNode(ctx, path);
  parentNode.child.push(node);
  return node;
}

function handleErrors(
  reqCtx: ApolloInlineRequestTraceContext,
  ctx: ApolloInlineGraphqlTraceContext,
  errors: readonly GraphQLError[],
  rewriteError: ApolloInlineTracePluginOptions['rewriteError'],
) {
  if (reqCtx.stopped) {
    throw new Error('Handling errors after tracing was stopped');
  }

  for (const err of errors) {
    /**
     * This is an error from a federated service. We will already be reporting
     * it in the nested Trace in the query plan.
     *
     * Reference: https://github.com/apollographql/apollo-server/blob/9389da785567a56e989430962564afc71e93bd7f/packages/apollo-server-core/src/plugin/traceTreeBuilder.ts#L133-L141
     */
    if (err.extensions?.['serviceName']) {
      continue;
    }

    let errToReport = err;

    // errors can be rewritten through `rewriteError`
    if (rewriteError) {
      // clone error to avoid users mutating the original one
      const clonedErr = Object.assign(Object.create(Object.getPrototypeOf(err)), err);
      const rewrittenError = rewriteError(clonedErr);
      if (!rewrittenError) {
        // return nullish to skip reporting
        continue;
      }
      errToReport = rewrittenError;
    }

    // only message and extensions can be rewritten
    errToReport = createGraphQLError(errToReport.message, {
      extensions: errToReport.extensions || err.extensions,
      nodes: err.nodes,
      source: err.source,
      positions: err.positions,
      path: err.path,
      originalError: err.originalError,
    });

    // put errors on the root node by default
    let node = ctx.rootNode;

    if (Array.isArray(errToReport.path)) {
      const specificNode = getSpecificOrNearestNode(ctx.nodes, errToReport.path);
      if (specificNode) {
        node = specificNode;
      } else {
        throw new Error(`Could not find node with path ${errToReport.path.join('.')}`);
      }
    }

    node.error.push(
      new Trace.Error({
        message: errToReport.message,
        location: (errToReport.locations || []).map(
          ({ line, column }) => new Trace.Location({ line, column }),
        ),
        json: JSON.stringify(errToReport),
      }),
    );
  }
}

/**
 * If something fails at "non-nullable" GraphQL field in case of federated query, the error path might not be in trace nodes
 * but the error should be assigned to the nearest possible trace node.
 */
function getSpecificOrNearestNode(
  nodes: Map<string, Trace.Node>,
  path: (string | number)[],
): Trace.Node | undefined {
  // iterates through "path" backwards
  for (let i = path.length; i > 0; i--) {
    const pathString = path.slice(0, i).join('.');
    const node = nodes.get(pathString);
    if (node) {
      return node;
    }
  }

  return;
}
