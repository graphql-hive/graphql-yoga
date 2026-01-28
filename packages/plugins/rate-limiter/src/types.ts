import { Store } from './store.js';

/**
 * Two keys that define the identity for the call to a given
 * field resolver with a given context.
 */
export interface Identity {
  /**
   * The return value from `identifyContext`
   */
  readonly contextIdentity: string;
  /**
   * Returns value from `getFieldIdentity`
   */
  readonly fieldIdentity: string;
}

/**
 *
 */
export interface Options {
  readonly windowMs: number;
  readonly max: number;
  readonly callCount?: number;
}

/**
 * GraphQLRateLimitDirectiveArgs: The directive parameters.
 *
 * myField(id: String): Field @rateLimit(message: "Stop!", window: 100000, max: 10, identityArgs: ["id"])
 */
export interface GraphQLRateLimitDirectiveArgs {
  /**
   * Error message used when/if the RateLimit error is thrown
   */
  readonly message?: string;
  /**
   * Window duration in millis.
   */
  readonly window?: string;
  /**
   * Max number of calls within the `window` duration.
   */
  readonly max?: number;
  /**
   * Values to build into the key used to identify the resolve call.
   */
  readonly identityArgs?: readonly string[];
  /**
   * Limit by the length of an input array
   */
  readonly arrayLengthField?: string;
  /**
   * Prevents registering the current request to the store.
   * This can be useful for example when you only wanna rate limit on failed attempts.
   */
  readonly readOnly?: boolean;
  /**
   * Prevents rejected requests (due to limit reach) from being counted.
   */
  readonly uncountRejected?: boolean;
}

/**
 * Args passed to the format error callback.
 */
export interface FormatErrorInput {
  readonly fieldName: string;
  readonly contextIdentity: string;
  readonly max: number;
  readonly window: number;
  readonly fieldIdentity?: string;
}

/**
 * Config object type passed to the directive factory.
 */
export interface GraphQLRateLimitConfig {
  /**
   * Provide a store to hold info on client requests.
   *
   * Defaults to an inmemory store if not provided.
   */
  readonly store?: Store;
  /**
   * Return a string to identify the user or client.
   *
   * Example:
   * 	identifyContext: (context) => context.user.id;
   * 	identifyContext: (context) => context.req.ip;
   */
  readonly identifyContext?: (context: any) => string;
  /**
   * Custom error messages.
   */
  readonly formatError?: (input: FormatErrorInput) => string;

  readonly enableBatchRequestCache?: boolean;
}
