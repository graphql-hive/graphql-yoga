/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ExecutionResult } from 'graphql';
import { parse, specifiedRules, validate } from 'graphql';
import type { GetEnvelopedFn, PromiseOrValue } from '@envelop/core';
import {
  envelop,
  handleStreamOrSingleExecutionResult,
  isAsyncIterable,
  useEngine,
  useExtendContext,
  useMaskedErrors,
} from '@envelop/core';
import { chain, getInstrumented } from '@envelop/instrumentation';
import { type Logger, type LogLevel } from '@graphql-hive/logger';
import { normalizedExecutor } from '@graphql-tools/executor';
import * as defaultFetchAPI from '@whatwg-node/fetch';
import type { MaybePromise } from '@whatwg-node/promise-helpers';
import {
  fakePromise,
  handleMaybePromise,
  iterateAsync,
  iterateAsyncVoid,
  mapAsyncIterator,
  unfakePromise,
} from '@whatwg-node/promise-helpers';
import type {
  ServerAdapter,
  ServerAdapterBaseObject,
  ServerAdapterInitialContext,
  ServerAdapterOptions,
  ServerAdapterRequestHandler,
} from '@whatwg-node/server';
import { createServerAdapter, useCORS } from '@whatwg-node/server';
import { handleError, isAbortError } from './error.js';
import { createLoggerFromLogging, getRequestLog } from './logger.js';
import { useAllowedRequestHeaders, useAllowedResponseHeaders } from './plugins/allowed-headers.js';
import { isGETRequest, parseGETRequest } from './plugins/request-parser/get.js';
import {
  isPOSTFormUrlEncodedRequest,
  parsePOSTFormUrlEncodedRequest,
} from './plugins/request-parser/post-form-url-encoded.js';
import {
  isPOSTGraphQLStringRequest,
  parsePOSTGraphQLStringRequest,
} from './plugins/request-parser/post-graphql-string.js';
import { isPOSTJsonRequest, parsePOSTJsonRequest } from './plugins/request-parser/post-json.js';
import {
  isPOSTMultipartRequest,
  parsePOSTMultipartRequest,
} from './plugins/request-parser/post-multipart.js';
import { useCheckGraphQLQueryParams } from './plugins/request-validation/use-check-graphql-query-params.js';
import { useCheckMethodForGraphQL } from './plugins/request-validation/use-check-method-for-graphql.js';
import { useHTTPValidationError } from './plugins/request-validation/use-http-validation-error.js';
import { useLimitBatching } from './plugins/request-validation/use-limit-batching.js';
import { useLimitRequestBodySize } from './plugins/request-validation/use-limit-request-body-size.js';
import { usePreventMutationViaGET } from './plugins/request-validation/use-prevent-mutation-via-get.js';
import type {
  Instrumentation,
  OnExecutionResultHook,
  OnParamsHook,
  OnRequestParseDoneHook,
  OnRequestParseHook,
  OnResultProcess,
  ParamsHandler,
  Plugin,
  RequestParser,
  ResultProcessorInput,
} from './plugins/types.js';
import { useConfigInServerContext } from './plugins/use-config-in-server-context.js';
import type { GraphiQLOptions, GraphiQLOptionsOrFactory } from './plugins/use-graphiql.js';
import { useGraphiQL } from './plugins/use-graphiql.js';
import { useHealthCheck } from './plugins/use-health-check.js';
import type { ParserAndValidationCacheOptions } from './plugins/use-parser-and-validation-cache.js';
import { useParserAndValidationCache } from './plugins/use-parser-and-validation-cache.js';
import type { RequestIdOptions } from './plugins/use-request-id.js';
import { useRequestId } from './plugins/use-request-id.js';
import { useRequestParser } from './plugins/use-request-parser.js';
import { useResultProcessors } from './plugins/use-result-processor.js';
import type { YogaSchemaDefinition } from './plugins/use-schema.js';
import { useSchema } from './plugins/use-schema.js';
import type { LandingPageRenderer } from './plugins/use-unhandled-route.js';
import { useUnhandledRoute } from './plugins/use-unhandled-route.js';
import { processRequest as processGraphQLParams, processResult } from './process-request.js';
import type {
  FetchAPI,
  GraphQLParams,
  MaskError,
  YogaConfigContext,
  YogaInitialContext,
  YogaMaskedErrorOpts,
} from './types.js';
import { isResponse } from './utils/is-response.js';
import { maskError } from './utils/mask-error.js';

/**
 * Configuration options for the server
 */
export type YogaServerOptions<TServerContext, TUserContext> = Omit<
  ServerAdapterOptions<TServerContext>,
  'plugins'
> & {
  /**
   * Enable, disable or implement a custom logger for logging.
   *
   * @default true
   *
   * @see https://the-guild.dev/graphql/yoga-server/docs/features/logging-and-debugging
   */
  logging?: boolean | Logger | LogLevel | undefined;
  /**
   * Enable, disable or configure the request id.
   *
   * The request id is taken from the `x-request-id` header of the incoming request, or generated
   * when the header is absent. It is added to the `log`ger available in the context as the
   * `requestId` attribute, and set on the outgoing response's headers.
   *
   * @default true
   */
  requestId?: boolean | RequestIdOptions<TServerContext> | undefined;
  /**
   * Prevent leaking unexpected errors to the client. We highly recommend enabling this in production.
   * If you throw `EnvelopError`/`GraphQLError` within your GraphQL resolvers then that error will be sent back to the client.
   *
   * You can lean more about this here:
   * @see https://the-guild.dev/graphql/yoga-server/docs/features/error-masking
   *
   * @default true
   */
  maskedErrors?: boolean | Partial<YogaMaskedErrorOpts> | undefined;
  /**
   * Context
   */
  context?:
    | ((
        initialContext: YogaInitialContext & TServerContext,
      ) => Promise<TUserContext> | TUserContext)
    | Promise<TUserContext>
    | TUserContext
    | undefined;

  cors?: Parameters<typeof useCORS>[0] | undefined;

  /**
   * GraphQL endpoint
   * So you need to define it explicitly if GraphQL API lives in a different path other than `/graphql`
   *
   * @default "/graphql"
   */
  graphqlEndpoint?: string | undefined;

  /**
   * Readiness check endpoint
   *
   * @default "/health"
   */
  healthCheckEndpoint?: string | undefined;

  /**
   * Whether the landing page should be shown.
   */
  landingPage?: boolean | LandingPageRenderer | undefined;

  /**
   * GraphiQL options
   *
   * @default true
   */
  graphiql?: GraphiQLOptionsOrFactory<TServerContext> | undefined;

  renderGraphiQL?: ((options: GraphiQLOptions) => PromiseOrValue<BodyInit>) | undefined;

  schema?: YogaSchemaDefinition<TServerContext, TUserContext> | undefined;

  /**
   * Envelop Plugins
   * @see https://envelop.dev/plugins
   */
  plugins?:
    | Array<
        | Plugin<TUserContext & TServerContext & YogaInitialContext>
        | Plugin
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        | {}
      >
    | undefined;

  parserAndValidationCache?: boolean | ParserAndValidationCacheOptions | undefined;
  fetchAPI?: Partial<Record<keyof FetchAPI, any>> | undefined;
  /**
   * GraphQL Multipart Request spec support
   *
   * @see https://github.com/jaydenseric/graphql-multipart-request-spec
   *
   * @default true
   */
  multipart?: boolean | undefined;
  id?: string | undefined;
  /**
   * Limit the size (in bytes) of the incoming HTTP request body that will be read by the
   * built-in request parsers (JSON, GraphQL string, url-encoded and multipart).
   *
   * Requests whose `Content-Length` exceeds this value are rejected with an HTTP 413 response
   * before the body is read. The limit is also enforced while streaming the body, so requests
   * with a missing, incorrect, or chunked-transfer-encoded body are covered too.
   *
   * Set to `false` to disable the limit. This is not recommended unless an upstream reverse
   * proxy already enforces a body-size limit (e.g. nginx's `client_max_body_size`).
   *
   * @default 25_000_000 (25 MB)
   */
  maxRequestBodySize?: number | false | undefined;
  /**
   * Batching RFC Support configuration
   *
   * @see https://github.com/graphql/graphql-over-http/blob/main/rfcs/Batching.md
   *
   * @default false
   */
  batching?: BatchingOptions | undefined;

  /**
   * By default, GraphQL Yoga does not allow parameters in the request body except `query`, `variables`, `extensions`, and `operationName`.
   *
   * This option allows you to specify additional parameters that are allowed in the request body.
   *
   * @default []
   *
   * @example ['doc_id', 'id']
   */
  extraParamNames?: string[] | undefined;

  /**
   * Allowed headers. Headers not part of this list will be striped out.
   */
  allowedHeaders?: {
    /** Allowed headers for outgoing responses */
    response?: string[] | undefined;
    /** Allowed headers for ingoing requests */
    request?: string[] | undefined;
  };
};

export type BatchingOptions =
  | boolean
  | {
      /**
       * You can limit the number of batched operations per request.
       *
       * @default 10
       */
      limit?: number;
    };

/**
 * Counts the GraphQL errors carried by a result, for the per-request summary log.
 * Returns `undefined` for a streaming result (subscription/SSE), whose errors (if any) surface
 * progressively while the response streams rather than being known up front.
 */
function countErrors(result: ResultProcessorInput): number | undefined {
  if (isAsyncIterable(result)) {
    return undefined;
  }
  const results = Array.isArray(result) ? result : [result];
  return results.reduce((count, result) => count + (result.errors?.length ?? 0), 0);
}

/**
 * Base class that can be extended to create a GraphQL server with any HTTP server framework.
 * @internal
 */

export class YogaServer<
  TServerContext extends Record<string, any>,
  TUserContext extends Record<string, any>,
> implements ServerAdapterBaseObject<TServerContext>
{
  /**
   * Instance of envelop
   */
  public readonly getEnveloped: GetEnvelopedFn<TUserContext & TServerContext & YogaInitialContext>;
  public log: Logger;
  public fetchAPI: FetchAPI;
  protected plugins: Array<
    Plugin<TUserContext & TServerContext & YogaInitialContext, TServerContext, TUserContext>
  >;
  private instrumentation:
    | Instrumentation<TUserContext & TServerContext & YogaInitialContext>
    | undefined;
  private onRequestParseHooks: OnRequestParseHook<TServerContext>[];
  private onParamsHooks: OnParamsHook<TServerContext>[];
  private onExecutionResultHooks: OnExecutionResultHook<TServerContext>[];
  private onResultProcessHooks: OnResultProcess<TServerContext>[];
  private maskedErrorsOpts: YogaMaskedErrorOpts | null;
  private id: string;
  /** Operation type resolved for a given params object, read back for the per-request summary log. */
  private operationTypeByParams = new WeakMap<GraphQLParams, string | undefined>();

  // @ts-expect-error - This is set by `this.graphqlEndpoint` setter in the constructor, but TypeScript doesn't recognize it.
  private _graphqlEndpoint: string;
  private _graphqlEndpointURLPattern: URLPattern | undefined;

  readonly version = '__YOGA_VERSION__';

  constructor(options?: YogaServerOptions<TServerContext, TUserContext>) {
    this.id = options?.id ?? 'yoga';

    this.fetchAPI = {
      ...defaultFetchAPI,
    };
    if (options?.fetchAPI) {
      for (const key in options.fetchAPI) {
        if (options.fetchAPI[key as keyof FetchAPI]) {
          this.fetchAPI[key as keyof FetchAPI] = options.fetchAPI[key as keyof FetchAPI];
        }
      }
    }

    this.log = createLoggerFromLogging(options?.logging);
    const configContext: YogaConfigContext = { log: this.log };

    const maskErrorFn: MaskError =
      (typeof options?.maskedErrors === 'object' && options.maskedErrors.maskError) || maskError;

    const maskedErrorSet = new WeakSet();

    this.maskedErrorsOpts =
      options?.maskedErrors === false
        ? null
        : {
            errorMessage: 'Unexpected error.',
            ...(typeof options?.maskedErrors === 'object' ? options.maskedErrors : {}),
            maskError: (error, message) => {
              if (maskedErrorSet.has(error as Error)) {
                return error as Error;
              }
              const newError = maskErrorFn(error, message, this.maskedErrorsOpts?.isDev);

              if (newError !== error) {
                const requestLog = this.maskedErrorsOpts?._requestLogger ?? this.log;
                requestLog.error({ err: error });
              }

              maskedErrorSet.add(newError);

              return newError;
            },
          };

    const maskedErrors = this.maskedErrorsOpts == null ? null : this.maskedErrorsOpts;

    let batchingLimit = 0;
    if (options?.batching) {
      if (typeof options.batching === 'boolean') {
        batchingLimit = 10;
      } else {
        batchingLimit = options.batching.limit ?? 10;
      }
    }

    this.graphqlEndpoint = options?.graphqlEndpoint || '/graphql';

    this.plugins = [
      useEngine({
        parse,
        validate,
        execute: normalizedExecutor,
        subscribe: normalizedExecutor,
        specifiedRules,
      }),
      // Make the config (and therefore the logger) available in the server context of every
      // request. Registered first so that everything after it can rely on `log` being there.
      useConfigInServerContext({ configContext }),
      // Use the schema provided by the user
      !!options?.schema && useSchema(options.schema),
      options?.allowedHeaders?.request != null &&
        useAllowedRequestHeaders(options.allowedHeaders.request),
      // Scope the logger of each request to its request id. Registered after the request headers
      // have been filtered, so that a request id is only taken from an allowed header, but before
      // the plugins that log while short-circuiting a request (health checks, GraphiQL).
      options?.requestId !== false &&
        useRequestId<TServerContext>(
          typeof options?.requestId === 'object' ? options.requestId : undefined,
        ),
      options?.context != null &&
        useExtendContext(initialContext => {
          if (options?.context) {
            if (typeof options.context === 'function') {
              return options.context(initialContext);
            }
            return options.context;
          }
          return {};
        }),
      // Middlewares before processing the incoming HTTP request
      useHealthCheck({
        id: this.id,
        log: this.log,
        endpoint: options?.healthCheckEndpoint,
      }),
      options?.cors !== false && useCORS(options?.cors),
      options?.graphiql !== false &&
        useGraphiQL({
          getGraphQLEndpoint: () => this._graphqlEndpoint,
          getGraphQLEndpointURLPattern: () => this.getUrlPatternForGraphQLEndpoint(),
          options: options?.graphiql,
          render: options?.renderGraphiQL,
          log: this.log,
        }),
      // Middlewares before the GraphQL execution
      useRequestParser({
        match: isGETRequest,
        parse: parseGETRequest,
      }),
      useRequestParser({
        match: isPOSTJsonRequest,
        parse: parsePOSTJsonRequest,
      }),
      options?.multipart !== false &&
        useRequestParser({
          match: isPOSTMultipartRequest,
          parse: parsePOSTMultipartRequest,
        }),

      useRequestParser({
        match: isPOSTGraphQLStringRequest,
        parse: parsePOSTGraphQLStringRequest,
      }),
      useRequestParser({
        match: isPOSTFormUrlEncodedRequest,
        parse: parsePOSTFormUrlEncodedRequest,
      }),
      // Middlewares after the GraphQL execution
      useResultProcessors(),

      ...(options?.plugins ?? []),

      // Must run after the request parsers above (including any registered by user plugins)
      // so it wraps whichever parser ends up selected.
      useLimitRequestBodySize(
        options?.maxRequestBodySize === false ? false : (options?.maxRequestBodySize ?? 25_000_000),
      ),

      options?.parserAndValidationCache !== false &&
        useParserAndValidationCache(
          !options?.parserAndValidationCache || options?.parserAndValidationCache === true
            ? {}
            : options?.parserAndValidationCache,
        ),
      useLimitBatching(batchingLimit),
      useCheckGraphQLQueryParams(options?.extraParamNames),
      useUnhandledRoute({
        getGraphQLEndpoint: () => this.graphqlEndpoint,
        getGraphQLEndpointURLPattern: () => this.getUrlPatternForGraphQLEndpoint(),
        showLandingPage: options?.landingPage !== false,
        landingPageRenderer:
          typeof options?.landingPage === 'function' ? options.landingPage : undefined,
      }),
      // We check the method after user-land plugins because the plugin might support more methods (like graphql-sse).
      useCheckMethodForGraphQL(),
      // We make sure that the user doesn't send a mutation with GET
      usePreventMutationViaGET(),
      // Always throw AbortError instead of masking it, and stash this operation's logger for the
      // next `maskError` call(s), since `useMaskedErrors` (registered right after) invokes
      // `maskError` directly with no context of its own. For streamed/subscribed results we
      // re-stash the logger via `onNext`, immediately before each chunk, rather than once up
      // front in `onExecuteDone`/`onSubscribeResult` - `_requestLogger` is a single field shared
      // across all in-flight requests, and a long-lived stream would otherwise leave it stale
      // (and liable to be clobbered by another request) for its entire lifetime.
      maskedErrors !== null && {
        onExecute: ({ args }) => ({
          onExecuteDone: payload =>
            handleStreamOrSingleExecutionResult(payload, () => {
              this.maskedErrorsOpts!._requestLogger = args.contextValue.log;
            }),
        }),
        onSubscribe: ({ args }) => ({
          onSubscribeError({ error }) {
            if (isAbortError(error)) {
              throw error;
            }
          },
          onSubscribeResult: payload =>
            handleStreamOrSingleExecutionResult(payload, () => {
              this.maskedErrorsOpts!._requestLogger = args.contextValue.log;
            }),
        }),
      },
      maskedErrors !== null && useMaskedErrors(maskedErrors),
      options?.allowedHeaders?.response != null &&
        useAllowedResponseHeaders(options.allowedHeaders.response),
      // We handle validation errors at the end
      useHTTPValidationError(),
    ];

    this.getEnveloped = envelop({
      plugins: this.plugins,
    }) as unknown as GetEnvelopedFn<TUserContext & TServerContext & YogaInitialContext>;

    this.plugins = this.getEnveloped._plugins as Plugin<
      TUserContext & TServerContext & YogaInitialContext,
      TServerContext,
      TUserContext
    >[];

    this.onRequestParseHooks = [];
    this.onParamsHooks = [];
    this.onExecutionResultHooks = [];
    this.onResultProcessHooks = [];
    for (const plugin of this.plugins) {
      if (plugin) {
        if (plugin.onYogaInit) {
          plugin.onYogaInit({
            yoga: this,
          });
        }
        if (plugin.onRequestParse) {
          this.onRequestParseHooks.push(plugin.onRequestParse);
        }
        if (plugin.onParams) {
          this.onParamsHooks.push(plugin.onParams);
        }
        if (plugin.onExecutionResult) {
          this.onExecutionResultHooks.push(plugin.onExecutionResult);
        }
        if (plugin.onResultProcess) {
          this.onResultProcessHooks.push(plugin.onResultProcess);
        }
        if (plugin.instrumentation) {
          this.instrumentation = this.instrumentation
            ? chain(this.instrumentation, plugin.instrumentation)
            : plugin.instrumentation;
        }
      }
    }
  }

  get graphqlEndpoint() {
    return this._graphqlEndpoint;
  }

  set graphqlEndpoint(endpoint: string) {
    this._graphqlEndpoint = endpoint;
    this._graphqlEndpointURLPattern = undefined;
  }

  private getUrlPatternForGraphQLEndpoint() {
    this._graphqlEndpointURLPattern ??= new this.fetchAPI.URLPattern({
      pathname: this._graphqlEndpoint,
    });
    return this._graphqlEndpointURLPattern;
  }

  private getLog(serverContext: Partial<YogaConfigContext> | undefined): Logger {
    return getRequestLog(serverContext, this.log);
  }

  handleParams: ParamsHandler<TServerContext> = ({ request, context, params }) => {
    const additionalContext =
      context['request'] === request
        ? {
            params,
          }
        : {
            request,
            params,
          };

    Object.assign(context, additionalContext);

    const enveloped = this.getEnveloped(context);
    const log = getRequestLog(context, this.log);

    log.debug(
      () => ({
        path: new this.fetchAPI.URL(request.url, 'http://localhost').pathname,
        operationName: params.operationName,
        variablesCount: params.variables ? Object.keys(params.variables).length : 0,
        variables: params.variables,
      }),
      'Processing GraphQL Parameters',
    );
    return handleMaybePromise(
      () =>
        handleMaybePromise(
          () =>
            processGraphQLParams({
              params,
              enveloped,
              log,
              onOperationType: operationType =>
                this.operationTypeByParams.set(params, operationType),
            }),
          result => {
            log.debug(`Processing GraphQL Parameters done.`);
            return result;
          },
          error => {
            const errors = handleError(error, this.maskedErrorsOpts, log);

            return {
              errors,
            };
          },
        ),
      result => {
        if (isAsyncIterable(result)) {
          result = mapAsyncIterator(
            result,
            v => v,
            (error: Error) => {
              if (error.name === 'AbortError') {
                log.debug(`Request aborted`);
                throw error;
              }

              const errors = handleError(error, this.maskedErrorsOpts, log);
              return {
                errors,
              };
            },
          );
        }
        return result;
      },
    );
  };

  getResultForParams = (
    {
      params,
      request,
    }: {
      params: GraphQLParams;
      request: Request;
    },
    context: TServerContext,
  ): PromiseOrValue<ExecutionResult | AsyncIterable<ExecutionResult> | undefined> => {
    let result: ExecutionResult | AsyncIterable<ExecutionResult> | undefined;
    let paramsHandler = this.handleParams;

    return handleMaybePromise(
      () =>
        iterateAsync(this.onParamsHooks, onParamsHook =>
          onParamsHook({
            params,
            request,
            setParams(newParams) {
              params = newParams;
            },
            paramsHandler,
            setParamsHandler(newHandler) {
              paramsHandler = newHandler;
            },
            setResult(newResult) {
              result = newResult;
            },
            fetchAPI: this.fetchAPI,
            context,
          }),
        ),
      () =>
        handleMaybePromise(
          () =>
            result ||
            paramsHandler({
              request,
              params,
              context: context as TServerContext & YogaInitialContext,
            }),
          result =>
            handleMaybePromise(
              () =>
                iterateAsync(this.onExecutionResultHooks, onExecutionResult =>
                  onExecutionResult({
                    result,
                    setResult(newResult) {
                      result = newResult;
                    },
                    request,
                    context: context as TServerContext & YogaInitialContext,
                  }),
                ),
              () => result,
            ),
        ),
    );
  };

  parseRequest = (
    request: Request,
    serverContext: TServerContext & ServerAdapterInitialContext,
  ): MaybePromise<
    | {
        requestParserResult:
          | GraphQLParams<Record<string, any>, Record<string, any>>
          | GraphQLParams<Record<string, any>, Record<string, any>>[];
        response?: never;
      }
    | { requestParserResult?: never; response: Response }
  > => {
    let url = new Proxy({} as URL, {
      get: (_target, prop, _receiver) => {
        url = new this.fetchAPI.URL(request.url, 'http://localhost');
        return Reflect.get(url, prop, url);
      },
    }) as URL;

    let requestParser: RequestParser | undefined;
    let response: Response | undefined;
    const onRequestParseDoneList: OnRequestParseDoneHook[] = [];

    return handleMaybePromise(
      () =>
        iterateAsync(
          this.onRequestParseHooks,
          (onRequestParse, endEarly) =>
            handleMaybePromise(
              () =>
                onRequestParse({
                  request,
                  url,
                  requestParser,
                  serverContext,
                  setRequestParser(parser: RequestParser) {
                    requestParser = parser;
                  },
                  // Short-circuit the request parsing if a response is sent in `onRequestParse`
                  endResponse(res) {
                    response = res;
                    endEarly();
                  },
                  fetchAPI: this.fetchAPI,
                }),
              requestParseHookResult => requestParseHookResult?.onRequestParseDone,
            ),
          onRequestParseDoneList,
        ),
      () => {
        if (response) {
          return { response };
        }
        this.getLog(serverContext).debug(`Parsing request to extract GraphQL parameters`);

        if (!requestParser) {
          return {
            response: new this.fetchAPI.Response(null, {
              status: 415,
              statusText: 'Unsupported Media Type',
            }),
          };
        }

        return handleMaybePromise(
          () => requestParser!(request),
          requestParserFnResult => {
            if (isResponse(requestParserFnResult)) {
              return {
                response: requestParserFnResult,
              };
            }
            let requestParserResult = requestParserFnResult;
            return handleMaybePromise(
              () =>
                iterateAsyncVoid(onRequestParseDoneList, onRequestParseDone =>
                  onRequestParseDone({
                    requestParserResult,
                    setRequestParserResult(newParams: GraphQLParams | GraphQLParams[]) {
                      requestParserResult = newParams;
                    },
                  }),
                ),
              () => ({
                requestParserResult,
              }),
            );
          },
        );
      },
    );
  };

  handle: ServerAdapterRequestHandler<TServerContext> = (
    request: Request,
    serverContext: TServerContext & ServerAdapterInitialContext,
  ) => {
    // `useConfigInServerContext` and `useRequestId` have put the request-scoped logger in the
    // server context by now, so everything logged for this request is correlated by its id
    const log = this.getLog(serverContext);
    const start = performance.now();

    const instrumented = this.instrumentation && getInstrumented({ request });

    const parseRequest = this.instrumentation?.requestParse
      ? instrumented!.asyncFn(this.instrumentation?.requestParse, this.parseRequest)
      : this.parseRequest;

    let requestParserResult: GraphQLParams | GraphQLParams[] | undefined;
    let errorCount: number | undefined;

    return unfakePromise(
      fakePromise()
        .then(() => parseRequest(request, serverContext))
        .then(parseResult => {
          requestParserResult = parseResult.requestParserResult;
          const { response, requestParserResult: parserResult } = parseResult;
          if (response) {
            return response;
          }
          const getResultForParams = this.instrumentation?.operation
            ? (payload: { request: Request; params: GraphQLParams }, context: any) => {
                const instrumented = getInstrumented({ context, request: payload.request });
                const tracedHandler = instrumented.asyncFn(
                  this.instrumentation?.operation,
                  this.getResultForParams,
                );
                return tracedHandler(payload, context);
              }
            : this.getResultForParams;
          return handleMaybePromise(
            () =>
              (Array.isArray(parserResult)
                ? Promise.all(
                    parserResult.map(params =>
                      fakePromise()
                        .then(() =>
                          getResultForParams(
                            {
                              params,
                              request,
                            },
                            Object.create(serverContext),
                          ),
                        )
                        // eslint-disable-next-line promise/no-nesting
                        .catch(error => {
                          const errors = handleError(error, this.maskedErrorsOpts, log);

                          return {
                            errors,
                          };
                        }),
                    ),
                  )
                : getResultForParams(
                    {
                      params: parserResult,
                      request,
                    },
                    serverContext,
                  )) as ResultProcessorInput,
            result => {
              errorCount = countErrors(result);
              const tracedProcessResult = this.instrumentation?.resultProcess
                ? instrumented!.asyncFn(
                    this.instrumentation.resultProcess,
                    processResult<TServerContext>,
                  )
                : processResult<TServerContext>;

              return tracedProcessResult({
                request,
                result,
                fetchAPI: this.fetchAPI,
                onResultProcessHooks: this.onResultProcessHooks,
                log,
                serverContext,
              });
            },
          );
        })
        .catch(error => {
          const errors = handleError(error, this.maskedErrorsOpts, log);
          errorCount = errors.length;

          const result = {
            errors,
          };

          return processResult({
            request,
            result,
            fetchAPI: this.fetchAPI,
            onResultProcessHooks: this.onResultProcessHooks,
            log,
            serverContext,
          });
        })
        .then(response => {
          log.info(
            () => ({
              method: request.method,
              path: new this.fetchAPI.URL(request.url, 'http://localhost').pathname,
              operationName: Array.isArray(requestParserResult)
                ? undefined
                : requestParserResult?.operationName,
              operationType: Array.isArray(requestParserResult)
                ? undefined
                : requestParserResult && this.operationTypeByParams.get(requestParserResult),
              batchedOperations: Array.isArray(requestParserResult)
                ? requestParserResult.length
                : undefined,
              status: response.status,
              errorCount,
              durationMs: Math.round(performance.now() - start),
            }),
            'Request processed',
          );
          return response;
        }),
    );
  };
}

/* eslint-disable */
export type YogaServerInstance<
  TServerContext extends Record<string, any>,
  TUserContext extends Record<string, any>,
> = ServerAdapter<TServerContext, YogaServer<TServerContext, TUserContext>>;

export function createYoga<
  TServerContext extends Record<string, any> = {},
  TUserContext extends Record<string, any> = {},
>(
  options: YogaServerOptions<TServerContext, TUserContext>,
): YogaServerInstance<TServerContext, TUserContext> {
  const server = new YogaServer<TServerContext, TUserContext>(options);
  return createServerAdapter<TServerContext, YogaServer<TServerContext, TUserContext>>(server, {
    fetchAPI: server.fetchAPI,
    plugins: server['plugins'],
    disposeOnProcessTerminate: options.disposeOnProcessTerminate,
  });
}
