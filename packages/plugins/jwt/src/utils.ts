import { createGraphQLError } from 'graphql-yoga';
import { JwksClient, type Options as JwksClientOptions } from 'jwks-rsa';
import { GetSigningKeyFunction, type ExtractTokenFunction } from './config.js';
import '@whatwg-node/server-plugin-cookies';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

export function extractFromHeader(options: {
  name: string;
  prefix?: string;
}): ExtractTokenFunction {
  return ({ request }) => {
    if (!request) {
      return;
    }

    const header = request.headers.get(options.name);

    if (header == null) {
      return;
    }

    if (!options.prefix) {
      const parts = header.split(' ').map(s => s.trim());
      const [prefix, token] = parts.length === 1 ? [undefined, parts[0]] : parts;

      if (!token) {
        throw badRequestError(`Authentication header was set, but token is missing.`);
      }

      return {
        prefix,
        token,
      };
    }

    const [prefix, token] = header.split(' ').map(s => s.trim());

    if (prefix !== options.prefix) {
      throw badRequestError(`Invalid JWT authentication token prefix.`);
    }

    if (!token) {
      throw badRequestError(`Authentication header was set, but token is missing.`);
    }

    return {
      prefix,
      token,
    };
  };
}

export function extractFromCookie(options: { name: string }): ExtractTokenFunction {
  return ({ request }) => {
    if (!request) {
      return;
    }
    const cookieStore = request.cookieStore;

    if (!cookieStore) {
      throw new Error(
        'Cookie store is not available on request. Please make sure to configure the cookie plugin.',
      );
    }

    return handleMaybePromise(
      () => cookieStore.get(options.name),
      cookie => {
        if (!cookie) {
          return;
        }

        return {
          prefix: undefined,
          token: cookie.value,
        };
      },
    );
  };
}

export function extractFromConnectionParams(options: { name: string }): ExtractTokenFunction {
  return ({ serverContext }) => {
    if (
      typeof serverContext?.['connectionParams'] === 'object' &&
      serverContext['connectionParams'] != null &&
      options.name in serverContext['connectionParams'] &&
      typeof serverContext['connectionParams'] === 'object' &&
      serverContext['connectionParams'] != null &&
      options.name in serverContext['connectionParams']
    ) {
      // @ts-expect-error - TS doesn't understand the type guard above
      const token = serverContext['connectionParams'][options.name];
      if (typeof token === 'string') {
        return {
          prefix: undefined,
          token,
        };
      }
    }
    return;
  };
}

export function badRequestError(
  message: string,
  options?: Parameters<typeof createGraphQLError>[1],
) {
  return createGraphQLError(message, {
    extensions: {
      http: {
        status: 400,
      },
    },
    ...options,
  });
}

export function unauthorizedError(
  message: string,
  options?: Parameters<typeof createGraphQLError>[1],
) {
  return createGraphQLError(message, {
    extensions: {
      http: {
        status: 401,
      },
    },
    ...options,
  });
}

export function createInlineSigningKeyProvider(signingKey: string): GetSigningKeyFunction {
  return () => signingKey;
}

export function createRemoteJwksSigningKeyProvider(
  jwksClientOptions: JwksClientOptions,
): GetSigningKeyFunction {
  const client = new JwksClient(jwksClientOptions);

  return kid => client.getSigningKey(kid)?.then(r => r.getPublicKey());
}
