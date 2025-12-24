/* eslint-disable no-console */

/* eslint-disable dot-notation */
import jwtPkg, { DecodeOptions, VerifyOptions } from 'jsonwebtoken';
import * as JwksRsa from 'jwks-rsa';
import { Plugin } from '@envelop/core';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

const { decode, verify } = jwtPkg;

export type Auth0PluginOptions = {
  domain: string;
  audience: VerifyOptions['audience'];

  preventUnauthenticatedAccess?: boolean;
  onError?: (error: Error) => void;

  extractTokenFn?: (context: unknown) => Promise<string> | string;
  jwksClientOptions?: JwksRsa.Options;
  jwtVerifyOptions?: VerifyOptions;
  jwtDecodeOptions?: DecodeOptions;
  extendContextField?: '_auth0' | string;
  tokenType?: string;
  headerName?: string;
};

export class UnauthenticatedError extends Error {}

export type UserPayload = {
  sub: string;
  [key: string]: any;
};

type BuildContext<TOptions extends Auth0PluginOptions> =
  TOptions['extendContextField'] extends string
    ? { [TName in TOptions['extendContextField'] as TOptions['extendContextField']]: UserPayload }
    : { _auth0: UserPayload };

export const useAuth0 = <TOptions extends Auth0PluginOptions>(
  options: TOptions,
): Plugin<BuildContext<TOptions>> => {
  const jkwsClient = new JwksRsa.JwksClient({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${options.domain}/.well-known/jwks.json`,
    ...options.jwksClientOptions,
  });

  const contextField = options.extendContextField || '_auth0';
  const tokenType = options.tokenType || 'Bearer';
  const headerName = options.headerName || 'authorization';

  const extractFn =
    options.extractTokenFn ||
    ((ctx: Record<string, any> = {}): string | null => {
      const req = ctx['req'] || ctx['request'] || {};
      const headers = req.headers || ctx['headers'] || null;

      if (!headers) {
        console.warn(
          `useAuth0 plugin unable to locate your request or headers on the execution context. Please make sure to pass that, or provide custom "extractTokenFn" function.`,
        );
      } else {
        let authHeader: string | null = null;
        if (headers[headerName] && typeof headers[headerName] === 'string') {
          authHeader = headers[headerName] || null;
        } else if (headers.get && headers.has && headers.has(headerName)) {
          authHeader = headers.get(headerName) || null;
        }
        if (authHeader === null) {
          return null;
        }

        const split = authHeader.split(' ');

        if (split.length !== 2) {
          throw new Error(`Invalid value provided for header "${headerName}"!`);
        } else {
          const [type, value] = split;

          if (type !== tokenType) {
            throw new Error(`Unsupported token type provided: "${type}"!`);
          } else {
            return value;
          }
        }
      }

      return null;
    });

  const verifyToken = (token: string) => {
    const decodedToken =
      (decode(token, { complete: true, ...options.jwtDecodeOptions }) as Record<
        string,
        { kid?: string }
      >) || {};

    if (decodedToken && decodedToken.header && decodedToken.header.kid) {
      return handleMaybePromise(
        () => jkwsClient.getSigningKey(decodedToken.header.kid),
        secret => {
          const signingKey = secret.getPublicKey();
          const decoded = verify(token, signingKey, {
            algorithms: ['RS256'],
            audience: options.audience,
            issuer: `https://${options.domain}/`,
            ...options.jwtVerifyOptions,
          }) as { sub: string };

          return decoded;
        },
      );
    }
    throw new Error(`Failed to decode authentication token!`);
  };

  return {
    onContextBuilding({ context, extendContext }) {
      return handleMaybePromise(
        () => extractFn(context),
        token => {
          if (token) {
            return handleMaybePromise(
              () => verifyToken(token),
              decodedPayload => {
                extendContext({
                  [contextField]: decodedPayload,
                } as BuildContext<TOptions>);
              },
            );
          } else if (options.preventUnauthenticatedAccess) {
            throw new UnauthenticatedError(`Unauthenticated!`);
          }
        },
        e => {
          if (options.onError) {
            options.onError(e as Error);
          } else {
            throw e;
          }
        },
      );
    },
  };
};
