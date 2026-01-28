import get from 'lodash.get';
import ms from 'ms';
import { handleMaybePromise, MaybePromise } from '@whatwg-node/promise-helpers';
import { getNoOpCache, getWeakMapCache } from './batch-request-cache.js';
import { InMemoryStore } from './in-memory-store.js';
import type {
  FormatErrorInput,
  GraphQLRateLimitConfig,
  GraphQLRateLimitDirectiveArgs,
  Identity,
} from './types.js';

// Default field options
const DEFAULT_WINDOW = 60 * 1000;
const DEFAULT_MAX = 5;
const DEFAULT_FIELD_IDENTITY_ARGS: readonly string[] = [];

/**
 * Returns a string key for the given field + args. With no identityArgs are provided, just the fieldName
 * will be used for the key. If an array of resolveArgs are provided, the values of those will be built
 * into the key.
 *
 * Example:
 * 	(fieldName = 'books', identityArgs: ['id', 'title'], resolveArgs: { id: 1, title: 'Foo', subTitle: 'Bar' })
 *  	=> books:1:Foo
 *
 * @param fieldName
 * @param identityArgs
 * @param resolveArgs
 */
const getFieldIdentity = (
  fieldName: string,
  identityArgs: readonly string[],
  resolveArgs: unknown,
): string => {
  const argsKey = identityArgs.map(arg => get(resolveArgs, arg));
  return [fieldName, ...argsKey].join(':');
};

/**
 * This is the core rate limiting logic function, APIs (directive, sheild etc.)
 * can wrap this or it can be used directly in resolvers.
 * @param userConfig - global (usually app-wide) rate limiting config
 */
const getGraphQLRateLimiter = (
  // Main config (e.g. the config passed to the createRateLimitDirective func)
  userConfig: GraphQLRateLimitConfig,
): ((
  fieldName: string,
  {
    args,
    context,
  }: {
    args: Record<string, any>;
    context: any;
  },
  {
    arrayLengthField,
    identityArgs,
    max,
    window,
    message,
    uncountRejected,
  }: GraphQLRateLimitDirectiveArgs,
) => MaybePromise<string | undefined>) => {
  // Default directive config
  const defaultConfig = {
    enableBatchRequestCache: false,
    formatError: ({ fieldName }: FormatErrorInput) => {
      return `You are trying to access '${fieldName}' too often`;
    },
    // Required
    identifyContext: () => {
      throw new Error('You must implement a createRateLimitDirective.config.identifyContext');
    },
    store: new InMemoryStore(),
  };

  const { enableBatchRequestCache, identifyContext, formatError, store } = {
    ...defaultConfig,
    ...userConfig,
  };

  const batchRequestCache = enableBatchRequestCache ? getWeakMapCache() : getNoOpCache();

  /**
   * Field level rate limiter function that returns the error message or undefined
   * @param args - pass the resolver args as an object
   * @param config - field level config
   */
  const rateLimiter = (
    fieldName: string,
    // Resolver args
    {
      args,
      context,
    }: {
      args: Record<string, any>;
      context: any;
    },
    // Field level config (e.g. the directive parameters)
    {
      arrayLengthField,
      identityArgs,
      max,
      window,
      message,
      readOnly,
      uncountRejected,
    }: GraphQLRateLimitDirectiveArgs,
  ): MaybePromise<string | undefined> => {
    // Identify the user or client on the context
    const contextIdentity = identifyContext(context);
    // User defined window in ms that this field can be accessed for before the call is expired
    const windowMs = (window ? ms(window as ms.StringValue) : DEFAULT_WINDOW) as number;
    // String key for this field
    const fieldIdentity = getFieldIdentity(
      fieldName,
      identityArgs || DEFAULT_FIELD_IDENTITY_ARGS,
      args,
    );

    // User configured maximum calls to this field
    const maxCalls = max || DEFAULT_MAX;
    // Call count could be determined by the lenght of the array value, but most commonly 1
    const callCount = (arrayLengthField && get(args, [arrayLengthField, 'length'])) || 1;
    // Allinclusive 'identity' for this resolver call
    const identity: Identity = { contextIdentity, fieldIdentity };
    // Timestamp of this call to be save for future ref
    const timestamp = Date.now();
    // Create an array of callCount length, filled with the current timestamp
    const newTimestamps = [...new Array(callCount || 1)].map(() => timestamp);

    // We set these new timestamps in a temporary memory cache so we can enforce
    // ratelimits across queries batched in a single request.
    const batchedTimestamps = batchRequestCache.set({
      context,
      fieldIdentity,
      newTimestamps,
    });

    // Fetch timestamps from previous requests out of the store
    // and get all the timestamps that haven't expired
    return handleMaybePromise(
      () => store.getForIdentity(identity),
      accessTimestamps => {
        const filteredAccessTimestamps = accessTimestamps.filter(t => {
          return t + windowMs > Date.now();
        });
        // Flag indicating requests limit reached
        const limitReached = filteredAccessTimestamps.length + batchedTimestamps.length > maxCalls;

        // Confogure access timestamps to save according to uncountRejected setting
        const timestampsToStore: readonly any[] = [
          ...filteredAccessTimestamps,
          ...(!uncountRejected || !limitReached ? batchedTimestamps : []),
        ];

        // Save these access timestamps for future requests.
        return handleMaybePromise(
          () =>
            readOnly ? undefined : store.setForIdentity(identity, timestampsToStore, windowMs),
          () => {
            // Field level custom message or a global formatting function
            const errorMessage =
              message ||
              formatError({
                contextIdentity,
                fieldIdentity,
                fieldName,
                max: maxCalls,
                window: windowMs,
              });

            // Returns an error message or undefined if no error
            return limitReached ? errorMessage : undefined;
          },
        );
      },
    );
  };

  return rateLimiter;
};

export { getGraphQLRateLimiter, getFieldIdentity };
