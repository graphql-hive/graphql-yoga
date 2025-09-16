import { GraphQLError } from 'graphql';
import type { FetchAPI, Plugin, YogaLogger } from 'graphql-yoga';
import jsonwebtoken, { type Jwt, type JwtPayload, type VerifyOptions } from 'jsonwebtoken';
import { handleMaybePromise, MaybePromise } from '@whatwg-node/promise-helpers';
import { ExtractTokenFunctionParams, normalizeConfig, type JwtPluginOptions } from './config.js';
import { badRequestError, unauthorizedError } from './utils.js';

export type JWTExtendContextFields = {
  payload: JwtPayload;
  token: {
    value: string;
    prefix?: string;
  };
};

type PluginPayload = {
  payload: JwtPayload;
  token: {
    value: string;
    prefix?: string;
  };
};

export function useJWT(options: JwtPluginOptions): Plugin<{
  jwt?: JWTExtendContextFields;
}> {
  let logger: YogaLogger;
  const normalizedOptions = normalizeConfig(options);
  const payloadByContext = new WeakMap<object, PluginPayload>();
  const payloadByRequest = new WeakMap<Request, PluginPayload>();
  const validatedRequestAndContextSet = new WeakSet<object>();

  function handleError(e: unknown) {
    // User-facing errors should be handled based on the configuration.
    // These errors are handled based on the value of "reject.invalidToken" config.
    if (e instanceof GraphQLError) {
      if (normalizedOptions.reject.invalidToken) {
        throw e;
      }

      return null;
    }

    // Server/internal errors should be thrown, so they can be handled by the error handler and be masked.
    throw e;
  }

  const lookupToken = (payload: ExtractTokenFunctionParams) => {
    const iterator = normalizedOptions.tokenLookupLocations[Symbol.iterator]();
    function iterate(): MaybePromise<{
      token: string;
      prefix?: string;
    } | null> {
      const { done, value } = iterator.next();
      if (done) {
        return null;
      }
      if (!value) {
        return iterate();
      }
      return handleMaybePromise(
        () => value(payload),
        result => {
          if (result?.token) {
            return result;
          }
          return iterate();
        },
        handleError,
      );
    }
    return iterate();
  };

  const getSigningKey = (kid?: string) => {
    const iterator = normalizedOptions.signingKeyProviders[Symbol.iterator]();
    function iterate(): MaybePromise<string | null> {
      const { done, value } = iterator.next();
      if (done) {
        return null;
      }
      if (!value) {
        return iterate();
      }
      return handleMaybePromise(
        () => value(kid),
        key => {
          if (key) {
            return key;
          }
          return iterate();
        },
        e => {
          logger.error(`Failed to fetch signing key from signing provided:`, e);
          return iterate();
        },
      );
    }
    return iterate();
  };

  const lookupAndValidate = (payload: ExtractTokenFunctionParams) => {
    // Mark the context and request as validated, so we don't process them again.
    if (payload.serverContext) {
      if (validatedRequestAndContextSet.has(payload.serverContext)) {
        return;
      }
      validatedRequestAndContextSet.add(payload.serverContext);
    }
    if (payload.request) {
      if (validatedRequestAndContextSet.has(payload.request)) {
        return;
      }
      validatedRequestAndContextSet.add(payload.request);
    }

    // Try to find token in request, and reject the request if needed.
    return handleMaybePromise(
      () => lookupToken(payload),
      lookupResult => {
        if (!lookupResult) {
          // If token is missing, we can reject the request based on the configuration.
          if (normalizedOptions.reject.missingToken) {
            logger.debug(`Token is missing in incoming HTTP request, JWT plugin failed to locate.`);
            throw unauthorizedError(`Unauthenticated`);
          }

          return;
        }

        // Decode the token first, in order to get the key id to use.
        let decodedToken: Jwt | null;
        try {
          decodedToken = jsonwebtoken.decode(lookupResult.token, { complete: true });
        } catch (e) {
          logger.warn(`Failed to decode JWT authentication token: `, e);
          if (normalizedOptions.reject.invalidToken) {
            throw badRequestError(`Invalid authentication token provided`);
          }
          return null;
        }

        if (!decodedToken) {
          logger.warn(
            `Failed to extract payload from incoming token, please make sure the token is a valid JWT.`,
          );
          if (normalizedOptions.reject.invalidToken) {
            throw badRequestError(`Invalid authentication token provided`);
          }
          return null;
        }

        // Fetch the signing key based on the key id.
        return handleMaybePromise(
          () => getSigningKey(decodedToken?.header.kid),
          signingKey => {
            if (!signingKey) {
              logger.warn(
                `Signing key is not available for the key id: ${decodedToken?.header.kid}. Please make sure signing key providers are configured correctly.`,
              );

              throw Error(`Authentication is not available at the moment.`);
            }

            // Verify the token with the signing key.
            return handleMaybePromise(
              () =>
                verify(logger, lookupResult.token, signingKey, normalizedOptions.tokenVerification),
              verified => {
                if (!verified) {
                  logger.debug(`Token failed to verify, JWT plugin failed to authenticate.`);
                  throw unauthorizedError(`Unauthenticated`);
                }

                if (verified) {
                  // Link the verified payload with the request (see `onContextBuilding` for the reading part)
                  const pluginPayload: PluginPayload = {
                    payload: verified,
                    token: {
                      value: lookupResult.token,
                      prefix: lookupResult.prefix,
                    },
                  };
                  if (payload.request) {
                    payloadByRequest.set(payload.request, pluginPayload);
                  } else {
                    payloadByContext.set(payload.serverContext, pluginPayload);
                  }
                }
              },
              handleError,
            );
          },
          handleError,
        );
      },
      handleError,
    );
  };

  function ensureContext({
    request,
    url,
    serverContext,
    extendContext,
  }: {
    request: Request;
    url: URL;
    serverContext: Record<string, unknown>;
    extendContext: (newContext: Record<string, unknown>) => void;
  }) {
    if (normalizedOptions.extendContextFieldName === null) {
      return;
    }

    if (serverContext[normalizedOptions.extendContextFieldName]) {
      return;
    }

    // Ensure the request has been validated before extending the context.
    return handleMaybePromise(
      () =>
        lookupAndValidate({
          request,
          url,
          serverContext,
        }),
      () => {
        // Then check the result
        const result = request
          ? payloadByRequest.get(request)
          : payloadByContext.get(serverContext);

        if (result && normalizedOptions.extendContextFieldName) {
          extendContext({
            [normalizedOptions.extendContextFieldName]: {
              payload: result.payload,
              token: result.token,
            },
          });
        }
      },
    );
  }

  let fetchAPI: FetchAPI;
  return {
    onYogaInit({ yoga }) {
      logger = yoga.logger;
      fetchAPI = yoga.fetchAPI;
    },
    onRequestParse({ request, url, serverContext }) {
      return ensureContext({
        request,
        url,
        serverContext,
        extendContext: newContext => {
          Object.assign(serverContext, newContext);
        },
      });
    },
    onContextBuilding({ context, extendContext }) {
      const request = context.request;
      return ensureContext({
        request,
        get url() {
          return request && new fetchAPI.URL(request.url);
        },
        serverContext: context,
        extendContext,
      });
    },
  };
}

function verify(
  logger: YogaLogger,
  token: string,
  signingKey: string,
  options: VerifyOptions | undefined,
) {
  return new Promise((resolve, reject) => {
    jsonwebtoken.verify(token, signingKey, options, (err, result) => {
      if (err) {
        logger.warn(`Failed to verify authentication token: `, err);
        reject(unauthorizedError('Unauthenticated'));
      } else {
        resolve(result as JwtPayload);
      }
    });
  });
}
