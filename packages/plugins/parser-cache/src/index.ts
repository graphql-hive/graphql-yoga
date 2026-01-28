import { DocumentNode, Source } from 'graphql';
import { LRUCache } from 'lru-cache';
import type { Plugin } from '@envelop/core';

interface Cache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
}

export type DocumentCache = Cache<DocumentNode>;
export type ErrorCache = Cache<Error>;

export type ParserCacheOptions = {
  documentCache?: DocumentCache;
  errorCache?: ErrorCache;
};

const DEFAULT_MAX = 1000;
const DEFAULT_TTL = 3600000;

export const useParserCache = (pluginOptions: ParserCacheOptions = {}): Plugin => {
  const documentCache =
    typeof pluginOptions.documentCache !== 'undefined'
      ? pluginOptions.documentCache
      : new LRUCache<string, DocumentNode>({ max: DEFAULT_MAX, ttl: DEFAULT_TTL });
  const errorCache =
    typeof pluginOptions.errorCache !== 'undefined'
      ? pluginOptions.errorCache
      : new LRUCache<string, Error>({ max: DEFAULT_MAX, ttl: DEFAULT_TTL });

  return {
    onParse({ params, setParsedDocument }) {
      const { source } = params;
      const key = source instanceof Source ? source.body : source;

      const cachedError = errorCache.get(key);

      if (cachedError !== undefined) {
        throw cachedError;
      }

      const cachedDocument = documentCache.get(key);

      if (cachedDocument !== undefined) {
        setParsedDocument(cachedDocument);
      }

      return ({ result }) => {
        if (result instanceof Error) {
          errorCache.set(key, result);
        } else if (result !== null) {
          documentCache.set(key, result);
        }
      };
    },
  };
};
