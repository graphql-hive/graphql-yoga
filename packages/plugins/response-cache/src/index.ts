import { ExecutionResult, print } from 'graphql';
import { Maybe, Plugin, PromiseOrValue, YogaInitialContext, YogaLogger } from 'graphql-yoga';
import { getDocumentString } from '@envelop/core';
import {
  defaultBuildResponseCacheKey,
  BuildResponseCacheKeyFunction as EnvelopBuildResponseCacheKeyFunction,
  Cache as EnvelopCache,
  createInMemoryCache as envelopCreateInMemoryCache,
  ResponseCacheExtensions as EnvelopResponseCacheExtensions,
  GetDocumentStringFunction,
  resultWithMetadata,
  useResponseCache as useEnvelopResponseCache,
  UseResponseCacheParameter as UseEnvelopResponseCacheParameter,
} from '@envelop/response-cache';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

export { cacheControlDirective, hashSHA256 } from '@envelop/response-cache';

export type BuildResponseCacheKeyFunction = (
  params: Parameters<EnvelopBuildResponseCacheKeyFunction>[0] & {
    request: Request;
  },
) => ReturnType<EnvelopBuildResponseCacheKeyFunction>;

export type UseResponseCacheParameter<TContext = YogaInitialContext> = Omit<
  UseEnvelopResponseCacheParameter,
  'getDocumentString' | 'session' | 'cache' | 'enabled' | 'buildResponseCacheKey'
> & {
  cache?: Cache;
  session: (request: Request, context: TContext) => PromiseOrValue<Maybe<string>>;
  enabled?: (request: Request, context: TContext) => boolean;
  buildResponseCacheKey?: BuildResponseCacheKeyFunction;
};

const operationIdByContext = new WeakMap<YogaInitialContext, string>();
const sessionByRequest = new WeakMap<Request, Maybe<string>>();

function sessionFactoryForEnvelop({ request }: YogaInitialContext) {
  return sessionByRequest.get(request);
}

const cacheKeyFactoryForEnvelop: EnvelopBuildResponseCacheKeyFunction =
  function cacheKeyFactoryForEnvelop({ context }) {
    const operationId = operationIdByContext.get(context as YogaInitialContext);
    if (operationId == null) {
      throw new Error(
        '[useResponseCache] This plugin is not configured correctly. Make sure you use this plugin with GraphQL Yoga',
      );
    }

    return operationId;
  };

const getDocumentStringForEnvelop: GetDocumentStringFunction = executionArgs => {
  const context = executionArgs.contextValue as YogaInitialContext;
  return context.params.query || getDocumentString(executionArgs.document, print);
};

export interface ResponseCachePluginExtensions {
  http?: {
    headers?: Record<string, string>;
  };
  responseCache?: EnvelopResponseCacheExtensions;
  [key: string]: unknown;
}

export interface Cache extends EnvelopCache {
  get(
    key: string,
  ): PromiseOrValue<Maybe<ExecutionResult<Record<string, unknown>, ResponseCachePluginExtensions>>>;
}

export function useResponseCache<TContext = YogaInitialContext>(
  options: UseResponseCacheParameter<TContext>,
): Plugin {
  const buildResponseCacheKey: BuildResponseCacheKeyFunction =
    options?.buildResponseCacheKey || defaultBuildResponseCacheKey;
  const cache = options.cache ?? createInMemoryCache();
  const enabled = options.enabled ?? (() => true);
  let logger: YogaLogger;
  return {
    onYogaInit({ yoga }) {
      logger = yoga.logger;
    },
    onPluginInit({ addPlugin }) {
      addPlugin(
        useEnvelopResponseCache({
          ...options,
          enabled: (context: YogaInitialContext) => enabled(context.request, context as TContext),
          cache,
          getDocumentString: getDocumentStringForEnvelop,
          session: sessionFactoryForEnvelop,
          buildResponseCacheKey: cacheKeyFactoryForEnvelop,
          shouldCacheResult({ cacheKey, result }) {
            let shouldCache: boolean;
            if (options.shouldCacheResult) {
              shouldCache = options.shouldCacheResult({ cacheKey, result });
            } else {
              shouldCache = !result.errors?.length;
              if (!shouldCache) {
                logger.debug(
                  '[useResponseCache] Decided not to cache the response because it contains errors',
                );
              }
            }

            if (shouldCache) {
              const extensions = (result.extensions ||= {}) as ResponseCachePluginExtensions;
              const httpExtensions = (extensions.http ||= {});
              const headers = (httpExtensions.headers ||= {});
              headers['ETag'] = cacheKey;
              headers['Last-Modified'] = new Date().toUTCString();
            }

            return shouldCache;
          },
        }),
      );
    },
    onRequest({ request, serverContext, fetchAPI, endResponse }) {
      if (enabled(request, serverContext as TContext)) {
        const operationId = request.headers.get('If-None-Match');
        if (operationId) {
          return handleMaybePromise(
            () => cache.get(operationId),
            cachedResponse => {
              if (cachedResponse) {
                const lastModifiedFromClient = request.headers.get('If-Modified-Since');
                const lastModifiedFromCache =
                  cachedResponse.extensions?.http?.headers?.['Last-Modified'];
                if (
                  // This should be in the extensions already but we check it here to make sure
                  lastModifiedFromCache != null &&
                  // If the client doesn't send If-Modified-Since header, we assume the cache is valid
                  (lastModifiedFromClient == null ||
                    new Date(lastModifiedFromClient).getTime() >=
                      new Date(lastModifiedFromCache).getTime())
                ) {
                  const okResponse = new fetchAPI.Response(null, {
                    status: 304,
                    headers: {
                      ETag: operationId,
                    },
                  });
                  endResponse(okResponse);
                }
              }
            },
          );
        }
      }
    },
    onParams({ params, request, context, setResult }) {
      return handleMaybePromise(
        () => options.session(request, context as TContext),
        sessionId =>
          handleMaybePromise(
            () =>
              buildResponseCacheKey({
                documentString: params.query || '',
                variableValues: params.variables,
                operationName: params.operationName,
                sessionId,
                request,
                context,
              }),
            operationId => {
              operationIdByContext.set(context as YogaInitialContext, operationId);
              sessionByRequest.set(request, sessionId);
              if (enabled(request, context as TContext)) {
                return handleMaybePromise(
                  () => cache.get(operationId),
                  cachedResponse => {
                    if (cachedResponse) {
                      const responseWithSymbol = {
                        ...cachedResponse,
                        [Symbol.for('servedFromResponseCache')]: true,
                      };
                      if (options.includeExtensionMetadata) {
                        setResult(resultWithMetadata(responseWithSymbol, { hit: true }));
                      } else {
                        setResult(responseWithSymbol);
                      }
                      return;
                    }
                  },
                );
              }
            },
          ),
      );
    },
  };
}

export const createInMemoryCache = envelopCreateInMemoryCache as (
  ...args: Parameters<typeof envelopCreateInMemoryCache>
) => Cache;
