import type { ExecutionResult } from 'graphql';
import type { Maybe, PromiseOrValue } from '@envelop/core';

export type CacheEntityRecord = {
  typename: string;
  id?: number | string;
};

/**
 * Interface for implementing a cache that will be used for `useResponseCache`.
 */
export type Cache = {
  /** set a cache response */
  set(
    /** id/hash of the operation */
    id: string,
    /** the result that should be cached */
    data: ExecutionResult,
    /** array of entity records that were collected during execution */
    entities: Iterable<CacheEntityRecord>,
    /** how long the operation should be cached */
    ttl: number,
  ): PromiseOrValue<void>;
  /** get a cached response */
  get(id: string): PromiseOrValue<Maybe<ExecutionResult>>;
  /** invalidate operations via typename or id */
  invalidate(entities: Iterable<CacheEntityRecord>): PromiseOrValue<void>;
};
