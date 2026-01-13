import {
  Instrumentation as EnvelopInstrumentation,
  Plugin as EnvelopPlugin,
  OnExecuteHook,
  OnSubscribeHook,
  RegisterContextErrorHandler,
  SetSchemaFn,
  type PromiseOrValue,
} from '@envelop/core';
import { ExecutionResult } from '@graphql-tools/utils';
import { MaybePromise } from '@whatwg-node/promise-helpers';
import {
  ServerAdapterPlugin,
  type ServerAdapterInitialContext,
  type Instrumentation as ServerAdapterInstrumentation,
} from '@whatwg-node/server';
import {
  FetchAPI,
  GraphQLHTTPExtensions,
  GraphQLParams,
  MaybeArray,
  YogaInitialContext,
  YogaServer,
} from './yoga.js';

export type Plugin<
  PluginContext extends Record<string, any> = {},
  TServerContext extends Record<string, any> = {},
  TUserContext = {},
> = EnvelopPlugin<YogaInitialContext & PluginContext> &
  ServerAdapterPlugin<TServerContext> & {
    /**
     * onExecute hook that is invoked before the execute function is invoked.
     */
    onExecute?: OnExecuteHook<YogaInitialContext & PluginContext & TUserContext>;
    /**
     * onSubscribe hook that is invoked before the subscribe function is called.
     * Return a OnSubscribeHookResult for hooking into phase after the subscribe function has been called.
     */
    onSubscribe?: OnSubscribeHook<YogaInitialContext & PluginContext & TUserContext>;
    /**
     * Invoked when a plugin is initialized. You can use this hook to add other plugin you may depend on.
     */
    onPluginInit?: OnPluginInitHook<YogaInitialContext & PluginContext & TUserContext>;
  } & {
    /**
     * A Tracer instance that will wrap each phases of the request pipeline.
     * This should be used primarly as an observability tool (for monitoring, tracing, etc...).
     */
    instrumentation?: Instrumentation<YogaInitialContext & PluginContext & TUserContext>;
    /**
     * This hook is invoked at Yoga Server initialization, before it starts.
     * Here you can setup long running resources (like monitoring or caching clients)
     * or customize the Yoga instance.
     */
    onYogaInit?: OnYogaInitHook<TServerContext>;
    /**
     * This hook is invoked for any incoming GraphQL HTTP request and is invoked before attempting
     * to parse the GraphQL parameters. Here you can manipulate the request, set a custom request
     * parser or apply security measures such as checking for access tokens etc.
     */
    onRequestParse?: OnRequestParseHook<TServerContext>;
    /**
     * This hook is invoked for an incoming GraphQL request after the GraphQL parameters
     * (query, variables, extensions and operationName) have been ATTEMPTED to be parsed.
     *
     * Within this hook you can manipulate and customize the parameters or even implement a whole
     * new way of parsing the parameters.
     *
     * In addition to that you could also short-circuit and skip the GraphQL execution.
     */
    onParams?: OnParamsHook<TServerContext>;
    /**
     * This hook is invoked for each result produced for GraphQL operation, before it is processed
     * to be sent to client.
     *
     * In particular, if a request contains batched operations, this hook is called once of each
     * operation.
     *
     * Here, you can modify the result, to add monitoring or instrumentation extensions for example.
     */
    onExecutionResult?: OnExecutionResultHook<TServerContext>;
    /**
     * This hook is invoked after a GraphQL request has been processed and before the response is
     * forwarded to the client. Here you can customize what transport/response processor format
     * should be used for sending the result over the wire.
     */
    onResultProcess?: OnResultProcess<TServerContext>;
  };

export type Instrumentation<TContext extends Record<string, any>> =
  EnvelopInstrumentation<TContext> &
    ServerAdapterInstrumentation & {
      operation?: (
        payload: { context: TContext; request: Request },
        wrapped: () => PromiseOrValue<void>,
      ) => PromiseOrValue<void>;
      requestParse?: (
        payload: { request: Request },
        wrapped: () => MaybePromise<void>,
      ) => MaybePromise<void>;
      resultProcess?: (
        payload: { request: Request },
        wrapped: () => MaybePromise<void>,
      ) => MaybePromise<void>;
    };

export type OnYogaInitHook<TServerContext extends Record<string, any>> = (
  payload: OnYogaInitEventPayload<TServerContext>,
) => void;

export type OnYogaInitEventPayload<TServerContext extends Record<string, any>> = {
  yoga: YogaServer<TServerContext, any>;
};

export type OnRequestParseHook<TServerContext> = (
  payload: OnRequestParseEventPayload<TServerContext>,
) => PromiseOrValue<void | OnRequestParseHookResult>;

export type RequestParser = (
  request: Request,
) => PromiseOrValue<GraphQLParams> | PromiseOrValue<GraphQLParams[]>;

export interface OnRequestParseEventPayload<TServerContext> {
  request: Request;
  url: URL;
  requestParser: RequestParser | undefined;
  serverContext: TServerContext & ServerAdapterInitialContext;
  setRequestParser: (parser: RequestParser) => void;
}

export type OnRequestParseHookResult = {
  onRequestParseDone?: OnRequestParseDoneHook;
};

export type OnRequestParseDoneHook = (
  payload: OnRequestParseDoneEventPayload,
) => PromiseOrValue<void>;

export interface OnRequestParseDoneEventPayload {
  requestParserResult: GraphQLParams | GraphQLParams[];
  setRequestParserResult: (params: GraphQLParams | GraphQLParams[]) => void;
}

export type OnParamsHook<TServerContext> = (
  payload: OnParamsEventPayload<TServerContext>,
) => PromiseOrValue<void>;

export interface OnParamsEventPayload<TServerContext = Record<string, unknown>> {
  request: Request;

  params: GraphQLParams;
  setParams: (params: GraphQLParams) => void;
  paramsHandler: ParamsHandler<TServerContext>;

  setParamsHandler: (handler: ParamsHandler<TServerContext>) => void;

  setResult: (result: ExecutionResult | AsyncIterable<ExecutionResult>) => void;

  fetchAPI: FetchAPI;
  context: TServerContext;
}

export interface ParamsHandlerPayload<TServerContext> {
  request: Request;
  params: GraphQLParams;
  context: TServerContext & ServerAdapterInitialContext & YogaInitialContext;
}

export type ParamsHandler<TServerContext> = (
  payload: ParamsHandlerPayload<TServerContext>,
) => PromiseOrValue<ExecutionResult | AsyncIterable<ExecutionResult>>;

export type OnResultProcess<TServerContext> = (
  payload: OnResultProcessEventPayload<TServerContext>,
) => PromiseOrValue<void>;

export type ExecutionResultWithSerializer<TData = any, TExtensions = any> = ExecutionResult<
  TData,
  TExtensions
> & {
  stringify?: (result: ExecutionResult<TData, TExtensions>) => string;
};

export type OnExecutionResultHook<TServerContext> = (
  payload: OnExecutionResultEventPayload<TServerContext>,
) => PromiseOrValue<void>;

export interface OnExecutionResultEventPayload<TServerContext> {
  request: Request;
  result: ExecutionResultWithSerializer | AsyncIterable<ExecutionResultWithSerializer> | undefined;
  setResult(
    result: ExecutionResultWithSerializer | AsyncIterable<ExecutionResultWithSerializer>,
  ): void;
  context: TServerContext & ServerAdapterInitialContext & YogaInitialContext;
}

export type ResultProcessorInput =
  | MaybeArray<ExecutionResultWithSerializer>
  | AsyncIterable<ExecutionResultWithSerializer<any, { http?: GraphQLHTTPExtensions }>>;

export type ResultProcessor = (
  result: ResultProcessorInput,
  fetchAPI: FetchAPI,
  acceptedMediaType: string,
) => PromiseOrValue<Response>;

export interface OnResultProcessEventPayload<TServerContext> {
  request: Request;
  result: ResultProcessorInput;
  setResult(result: ResultProcessorInput): void;
  resultProcessor?: ResultProcessor;
  acceptableMediaTypes: string[];
  setResultProcessor(resultProcessor: ResultProcessor, acceptedMediaType: string): void;
  serverContext: TServerContext & ServerAdapterInitialContext;
}

/**
 * Payload forwarded to the onPluginInit hook.
 */
export type OnPluginInitEventPayload<PluginContext extends Record<string, any>> = {
  /**
   * Register a new plugin.
   */
  addPlugin: (newPlugin: Plugin<PluginContext>) => void;
  /**
   * A list of all currently active plugins.
   */
  plugins: Plugin<PluginContext>[];
  /**
   * Set the GraphQL schema.
   */
  setSchema: SetSchemaFn;
  /**
   * Register an error handler used for context creation.
   */
  registerContextErrorHandler: RegisterContextErrorHandler;
};

/**
 * Invoked when a plugin is initialized.
 */
export type OnPluginInitHook<ContextType extends Record<string, any>> = (
  options: OnPluginInitEventPayload<ContextType>,
) => void;
