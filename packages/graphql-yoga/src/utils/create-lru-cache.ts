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
}
/**
 * @internal This is an internal utility, and you should use it with your own risk.
 * This utility can have breaking changes in the future.
 */
export function _createLRUCache<T extends {}>({
  max = DEFAULT_MAX,
  ttl = DEFAULT_TTL,
}: _LRUCacheOptions = {}) {
  return new LRU<string, T>({ max, ttl });
}
