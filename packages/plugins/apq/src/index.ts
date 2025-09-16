import { createGraphQLError, createLRUCache, Plugin, PromiseOrValue } from 'graphql-yoga';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

export function hashSHA256(
  text: string,
  api: {
    crypto: Crypto;
    TextEncoder: (typeof globalThis)['TextEncoder'];
  } = globalThis,
) {
  const inputUint8Array = new api.TextEncoder().encode(text);
  return handleMaybePromise(
    () => api.crypto.subtle.digest({ name: 'SHA-256' }, inputUint8Array),
    arrayBuf => {
      const outputUint8Array = new Uint8Array(arrayBuf);

      let hash = '';
      for (const byte of outputUint8Array) {
        const hex = byte.toString(16);
        hash += '00'.slice(0, Math.max(0, 2 - hex.length)) + hex;
      }

      return hash;
    },
  );
}

export interface APQStoreOptions {
  max?: number;
  ttl?: number;
}

export function createInMemoryAPQStore(options: APQStoreOptions = {}): APQStore {
  return createLRUCache<string>({
    max: options.max ?? 1000,
    ttl: options.ttl ?? 36_000,
  });
}

export interface APQOptions {
  store?: APQStore;
  hash?: (
    str: string,
    api: { crypto: Crypto; TextEncoder: typeof TextEncoder },
  ) => PromiseOrValue<string>;
  responseConfig?: {
    /**
     * If set true, status code of the response (if the query
     * is not found or mismatched) will be 200.
     */
    forceStatusCodeOk?: boolean;
  };
}

export interface APQStore {
  get(key: string): PromiseOrValue<string | null | undefined>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set(key: string, query: string): PromiseOrValue<any>;
}

export interface APQExtension {
  version: 1;
  sha256Hash: string;
}

function isAPQExtension(input: unknown): input is APQExtension {
  return (
    input != null &&
    typeof input === 'object' &&
    'version' in input &&
    input?.version === 1 &&
    'sha256Hash' in input &&
    typeof input?.sha256Hash === 'string'
  );
}

function decodeAPQExtension(
  input: Record<string, unknown> | null | undefined,
): null | APQExtension {
  if (isAPQExtension(input)) {
    return input as APQExtension;
  }
  return null;
}

export function useAPQ(options: APQOptions = {}): Plugin {
  const { store = createInMemoryAPQStore(), hash = hashSHA256, responseConfig = {} } = options;

  return {
    onParams({ params, setParams, fetchAPI }) {
      const persistedQueryData = decodeAPQExtension(params.extensions?.['persistedQuery']);

      if (persistedQueryData === null) {
        return;
      }

      if (params.query == null) {
        return handleMaybePromise(
          () => store.get(persistedQueryData.sha256Hash),
          persistedQuery => {
            if (persistedQuery == null) {
              throw createGraphQLError('PersistedQueryNotFound', {
                extensions: {
                  http: {
                    status: responseConfig.forceStatusCodeOk ? 200 : 404,
                  },
                  code: 'PERSISTED_QUERY_NOT_FOUND',
                },
              });
            }
            setParams({
              ...params,
              query: persistedQuery,
            });
          },
        );
      }
      return handleMaybePromise(
        () => hash(params.query!, fetchAPI),
        expectedHash => {
          if (persistedQueryData.sha256Hash !== expectedHash) {
            throw createGraphQLError('PersistedQueryMismatch', {
              extensions: {
                http: {
                  status: responseConfig.forceStatusCodeOk ? 200 : 400,
                },
                code: 'PERSISTED_QUERY_MISMATCH',
              },
            });
          }
          return store.set(persistedQueryData.sha256Hash, params.query!);
        },
      );
    },
  };
}
