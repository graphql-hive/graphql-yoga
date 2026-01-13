import type { DocumentNode, ExecutionResult, GraphQLSchema, validate } from 'graphql';
import type { GetEnvelopedFn, PromiseOrValue } from '@envelop/core';
import type { LogLevel, YogaLogger } from '@graphql-yoga/logger';
import { createFetch } from '@whatwg-node/fetch';
import type { MaybePromise } from '@whatwg-node/promise-helpers';
import type {
  ServerAdapterBaseObject,
  ServerAdapterInitialContext,
  ServerAdapterOptions,
  useCORS,
} from '@whatwg-node/server';
import type { GraphiQLOptions, GraphiQLOptionsOrFactory } from './graphiql';
import type { ParamsHandler, Plugin } from './plugins';

/**
 * Configuration options for the server
 */
export type YogaServerOptions<TServerContext, TUserContext> = Omit<
  ServerAdapterOptions<TServerContext>,
  'plugins'
> & {
  /**
   * Enable/disable logging or provide a custom logger.
   * @default true
   */
  logging?: boolean | YogaLogger | LogLevel | undefined;
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
    | Array<Plugin<TUserContext & TServerContext & YogaInitialContext> | Plugin | {}>
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

export interface YogaServer<
  TServerContext extends Record<string, any>,
  TUserContext extends Record<string, any>,
> extends ServerAdapterBaseObject<TServerContext> {
  readonly getEnveloped: GetEnvelopedFn<TUserContext & TServerContext & YogaInitialContext>;
  logger: YogaLogger;
  readonly graphqlEndpoint: string;
  fetchAPI: FetchAPI;
  readonly version: string;

  handleParams: ParamsHandler<TServerContext>;

  getResultForParams(
    payload: { params: GraphQLParams; request: Request },
    context: TServerContext,
  ): MaybePromise<ExecutionResult | AsyncIterable<ExecutionResult> | undefined>;

  parseRequest(
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
  >;
}

export type GraphQLSchemaWithContext<TContext> = GraphQLSchema & {
  _context?: TContext;
};

export interface GraphQLParams<
  TVariables = Record<string, any>,
  TExtensions = Record<string, any>,
> {
  operationName?: string;
  query?: string;
  variables?: TVariables;
  extensions?: TExtensions;
}

export interface YogaInitialContext extends ServerAdapterInitialContext {
  /**
   * GraphQL Parameters
   */
  params: GraphQLParams;
  /**
   * An object describing the HTTP request.
   */
  request: Request;
}

export type CORSOptions =
  | {
      origin?: string[] | string;
      methods?: string[];
      allowedHeaders?: string[];
      exposedHeaders?: string[];
      credentials?: boolean;
      maxAge?: number;
    }
  | false;

declare global {
  // TODO: Is this still necessary ?
  // interface ReadableStream<R = any> {
  //   [Symbol.asyncIterator]: () => AsyncIterator<R>;
  // }
}

export type FetchAPI = ReturnType<typeof createFetch>;

export interface FetchEvent extends Event {
  request: Request;
  respondWith(response: PromiseOrValue<Response>): void;
}

export type YogaMaskedErrorOpts = {
  maskError: MaskError;
  errorMessage: string;
  isDev?: boolean;
};

export type MaskError = (error: unknown, message: string, isDev?: boolean) => Error;

export type MaybeArray<T> = T | T[];

export interface GraphQLHTTPExtensions {
  spec?: boolean;
  status?: number;
  headers?: Record<string, string>;
}

export type YogaSchemaDefinition<TServerContext, TUserContext> =
  | PromiseOrValue<GraphQLSchemaWithContext<TServerContext & YogaInitialContext & TUserContext>>
  | ((
      context: TServerContext & { request: YogaInitialContext['request'] },
    ) => PromiseOrValue<
      GraphQLSchemaWithContext<TServerContext & YogaInitialContext & TUserContext>
    >);

export interface LandingPageRendererOpts {
  request: Request;
  fetchAPI: FetchAPI;
  url: URL;
  graphqlEndpoint: string;
  // Not sure why the global `URLPattern` causes errors with the ponyfill typings
  // So instead we use this which points to the same type
  urlPattern: InstanceType<FetchAPI['URLPattern']>;
}

export type LandingPageRenderer = (opts: LandingPageRendererOpts) => PromiseOrValue<Response>;

interface Cache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
}

export interface ParserAndValidationCacheOptions {
  documentCache?: Cache<DocumentNode>;
  errorCache?: Cache<unknown>;
  validationCache?: boolean | Cache<typeof validate>;
}
