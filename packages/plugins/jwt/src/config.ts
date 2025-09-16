import { type PromiseOrValue } from 'graphql-yoga';
import { VerifyOptions } from 'jsonwebtoken';
import { extractFromHeader } from './utils.js';

type AtleastOneItem<T> = [T, ...T[]];

export type ExtractTokenFunctionParams = {
  request: Request;
  url: URL;
  serverContext: Record<string, unknown>;
};

export type ExtractTokenFunction = (
  params: ExtractTokenFunctionParams,
) => PromiseOrValue<undefined | { token: string; prefix?: string }>;

export type GetSigningKeyFunction = (kid?: string) => Promise<string> | string;

export type JwtPluginOptions = (
  | {
      /**
       * List of configurations for the signin-key providers. You can configure multiple signin-key providers to allow for key rotation, fallbacks, etc.
       *
       * In addition, you can use the `remote` variant and configure [`jwks-rsa`'s JWKS client](https://github.com/auth0/node-jwks-rsa/tree/master).
       *
       * The plugin will try to fetch the keys from the providers in the order they are defined in this array.
       *
       * If the first provider fails to fetch the keys, the plugin will try the next provider in the list.
       *
       */
      signingKeyProviders: AtleastOneItem<GetSigningKeyFunction>;
      singingKeyProviders?: never;
    }
  | {
      /**
       * @deprecated: please use `signingKeyProviders` instead.
       */

      singingKeyProviders: AtleastOneItem<GetSigningKeyFunction>;
      signingKeyProviders?: never;
    }
) & {
  /**
   * List of locations to look for the token in the incoming request.
   *
   * By defualt, the plugin will look for the token in the `Authorization` header with the `Bearer` prefix.
   *
   * The plugin will try to extract the token from the locations in the order they are defined in this array.
   *
   * If the token is found in one of the locations, the plugin will stop looking for the token in the other locations.
   *
   * If the token is not found in any of the locations, the plugin will mark the authentication as failed.
   *
   * Can be used with `rejectUnauthenticatedRequests: { missingToken: true }` to reject requests without a token.
   *
   */
  tokenLookupLocations?: AtleastOneItem<ExtractTokenFunction>;
  /**
   * List of token verification options (algorithms, issuer, audience), to be used to verify the token.
   *
   * For additional documentation, please refer to [`jsonwebtoken#VerifyOptions`](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/jsonwebtoken/index.d.ts#L58-L77).
   *
   * By defualt, only the `RS256` and `HS256` algorithms are configured as validations.
   */
  tokenVerification?: VerifyOptions;
  /**
   * Whether to reject requests/operations that does not meet criteria.
   *
   * If set to `reject: { missingToken: true }`, the plugin will reject requests without a token (based on the `tokenLookupLocations`).
   *
   * If set to `reject: { invalidToken: true }`, the plugin will reject requests with an invalid token, or tokens that does not meet the verification options (`tokenVerification`).
   *
   * @default { missingToken: true, invalidToken: true }
   */
  reject?: {
    missingToken?: boolean;
    invalidToken?: boolean;
  };
  /**
   * Configuration for the context extension feature, which allows you to extend the request context with the decoded JWT payload or the payload of the fully validated token.
   *
   * This can be useful if you want to access the token or the token payload in your resolvers, or to pass it to other plugins or to the upstream GraphQL Subgraph/HTTP service.
   *
   * If set to `true`, the decoded JWT data will be added to the context under the field name `jwt`.
   *
   * If set to an object, you can customize the field name by setting the `fieldName` property.
   *
   * You may access this field by using `context.<fieldName>` in your resolvers.
   *
   * @default "jwt"
   */
  extendContext?: string | boolean;
};

export function normalizeConfig(input: JwtPluginOptions) {
  // TODO: remove this on next major version.
  if (input.singingKeyProviders) {
    if (input.signingKeyProviders) {
      throw new TypeError(
        'You are using both deprecated `singingKeyProviders` and its new replacement `signingKeyProviders` configuration. Please use only `signingKeyProviders`',
      );
    }
    (input.signingKeyProviders as unknown) = input.singingKeyProviders;
  }

  if (!input.signingKeyProviders) {
    throw new TypeError(
      'You must provide at least one signing key provider. Please verify your `signingKeyProviders` configuration.',
    );
  }

  const extendContextFieldName: string | null =
    input.extendContext === false
      ? null
      : input.extendContext === undefined || input.extendContext === true
        ? 'jwt'
        : input.extendContext;

  const tokenLookupLocations: ExtractTokenFunction[] = input.tokenLookupLocations ?? [];

  if (tokenLookupLocations.length === 0) {
    tokenLookupLocations.push(
      extractFromHeader({
        name: 'Authorization',
        prefix: 'Bearer',
      }),
    );
  }

  return {
    signingKeyProviders: input.signingKeyProviders,
    tokenLookupLocations,
    tokenVerification: input.tokenVerification ?? {
      algorithms: ['RS256', 'HS256'],
    },
    reject: {
      missingToken: true,
      invalidToken: true,
      ...input.reject,
    },
    extendContextFieldName,
  };
}
