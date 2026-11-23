/* eslint-disable @typescript-eslint/no-empty-object-type */
import { LRUCache as LRU } from 'lru-cache';

/**
 * @deprecated In the next major, `createLRUCache` will be renamed to `_createLRUCache`,
 * and the current `createLRUCache` will be removed.
 */
export const createLRUCache = _createLRUCache;

/**
 * @deprecated In the next major, `LRUCacheOptions` will be renamed to `_LRUCacheOptions`,
 * and the current `LRUCacheOptions` will be removed.
 */
export type LRUCacheOptions = _LRUCacheOptions;

/**
 * @deprecated In the next major, `LRUCache` will be renamed to `_LRUCache`,
 * and the current `LRUCache` will be removed.
 */
export type LRUCache<T extends {}> = _LRUCache<T>;

const DEFAULT_MAX = 1024;
const DEFAULT_TTL = 3_600_000;

/**
 * @internal This is an internal utility, and you should use it with your own risk.
 * This utility can have breaking changes in the future.
 */
export type _LRUCache<T extends {}> = LRU<string, T>;
/**
 * @internal This is an internal utility, and you should use it with your own risk.
 * This utility can have breaking changes in the future.
 */
export interface _LRUCacheOptions {
  max?: number;
  ttl?: number;
  /**
   * Maximum total length of all keys in the cache. When set, entries are sized by the
   * length of their key, entries whose key is longer than this are not stored, and the
   * least recently used entries are evicted to stay within the limit.
   */
  maxSize?: number;
}
/**
 * @internal This is an internal utility, and you should use it with your own risk.
 * This utility can have breaking changes in the future.
 */
export function _createLRUCache<T extends {}>({
  max = DEFAULT_MAX,
  ttl = DEFAULT_TTL,
  maxSize,
}: _LRUCacheOptions = {}) {
  if (maxSize) {
    // lru-cache rejects zero sizes, so the empty key counts as 1
    return new LRU<string, T>({ max, ttl, maxSize, sizeCalculation: (_, key) => key.length || 1 });
  }
  return new LRU<string, T>({ max, ttl });
}
