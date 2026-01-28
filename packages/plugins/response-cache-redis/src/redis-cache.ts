import Redis from 'ioredis';
import type { Cache } from '@envelop/response-cache';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

export type BuildRedisEntityId = (typename: string, id: number | string) => string;
export type BuildRedisOperationResultCacheKey = (responseId: string) => string;

export type RedisCacheParameter = {
  /**
   * Redis instance
   * @see Redis https://github.com/luin/ioredis
   */
  redis: Redis;
  /**
   * Customize how the cache entity id is built.
   * By default the typename is concatenated with the id e.g. `User:1`
   */
  buildRedisEntityId?: BuildRedisEntityId;
  /**
   * Customize how the cache key that stores the operations associated with the response is built.
   * By default `operations` is concatenated with the responseId e.g. `operations:arZm3tCKgGmpu+a5slrpSH9vjSQ=`
   */
  buildRedisOperationResultCacheKey?: BuildRedisOperationResultCacheKey;
};

export const createRedisCache = (params: RedisCacheParameter): Cache => {
  const store = params.redis;

  const buildRedisEntityId = params?.buildRedisEntityId ?? defaultBuildRedisEntityId;
  const buildRedisOperationResultCacheKey =
    params?.buildRedisOperationResultCacheKey ?? defaultBuildRedisOperationResultCacheKey;

  async function buildEntityInvalidationsKeys(entity: string): Promise<string[]> {
    const keysToInvalidate: string[] = [entity];

    // find the responseIds for the entity
    const responseIds = await store.smembers(entity);
    // and add each response to be invalidated since they contained the entity data
    responseIds.forEach(responseId => {
      keysToInvalidate.push(responseId);
      keysToInvalidate.push(buildRedisOperationResultCacheKey(responseId));
    });

    // if invalidating an entity like Comment, then also invalidate Comment:1, Comment:2, etc
    if (!entity.includes(':')) {
      const entityKeys = await store.keys(`${entity}:*`);
      for (const entityKey of entityKeys) {
        // and invalidate any responses in each of those entity keys
        const entityResponseIds = await store.smembers(entityKey);
        // if invalidating an entity check for associated operations containing that entity
        // and invalidate each response since they contained the entity data
        entityResponseIds.forEach(responseId => {
          keysToInvalidate.push(responseId);
          keysToInvalidate.push(buildRedisOperationResultCacheKey(responseId));
        });

        // then the entityKeys like Comment:1, Comment:2 etc to be invalidated
        keysToInvalidate.push(entityKey);
      }
    }

    return keysToInvalidate;
  }

  return {
    set(responseId, result, collectedEntities, ttl) {
      const pipeline = store.pipeline();

      if (ttl === Infinity) {
        pipeline.set(responseId, JSON.stringify(result));
      } else {
        // set the ttl in milliseconds
        pipeline.set(responseId, JSON.stringify(result), 'PX', ttl);
      }

      const responseKey = buildRedisOperationResultCacheKey(responseId);

      for (const { typename, id } of collectedEntities) {
        // Adds a key for the typename => response
        pipeline.sadd(typename, responseId);
        // Adds a key for the operation => typename
        pipeline.sadd(responseKey, typename);

        if (id) {
          const entityId = buildRedisEntityId(typename, id);
          // Adds a key for the typename:id => response
          pipeline.sadd(entityId, responseId);
          // Adds a key for the operation => typename:id
          pipeline.sadd(responseKey, entityId);
        }
      }

      return pipeline.exec().then(() => undefined);
    },
    get(responseId) {
      return handleMaybePromise(
        () => store.get(responseId),
        (result: any) => (result ? JSON.parse(result) : undefined),
      );
    },
    async invalidate(entitiesToRemove) {
      const invalidationKeys: string[][] = [];

      for (const { typename, id } of entitiesToRemove) {
        invalidationKeys.push(
          await buildEntityInvalidationsKeys(
            id != null ? buildRedisEntityId(typename, id) : typename,
          ),
        );
      }

      const keys = invalidationKeys.flat();
      if (keys.length > 0) {
        await store.del(keys);
      }
    },
  };
};

export const defaultBuildRedisEntityId: BuildRedisEntityId = (typename, id) => `${typename}:${id}`;
export const defaultBuildRedisOperationResultCacheKey: BuildRedisOperationResultCacheKey =
  responseId => `operations:${responseId}`;
