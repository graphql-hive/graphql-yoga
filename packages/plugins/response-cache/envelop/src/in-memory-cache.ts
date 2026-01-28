import { LRUCache } from 'lru-cache';
import type { Cache } from './cache.js';

export type BuildEntityId = (typename: string, id: number | string) => string;

export type InMemoryCacheParameter = {
  /**
   * Maximum amount of items in the cache. Defaults to `Infinity`.
   */
  max?: number;
  /**
   * Customize how the cache entity id is built.
   * By default the typename is concatenated with the id e.g. `User:1`
   */
  buildEntityId?: BuildEntityId;
};

export const createInMemoryCache = (params?: InMemoryCacheParameter): Cache => {
  const buildEntityId = params?.buildEntityId ?? defaultBuildEntityId;
  const cachedResponses = new LRUCache<string, any>({
    max: params?.max ?? 1000,
    allowStale: false,
    noDisposeOnSet: true,
    dispose(responseId) {
      purgeResponse(responseId, false);
    },
  });

  const entityToResponseIds = new Map<string, Set<string>>();
  const responseIdToEntityIds = new Map<string, Set<string>>();

  function purgeResponse(responseId: string, shouldRemove = true) {
    const entityIds = responseIdToEntityIds.get(responseId);
    // get entities related to the response
    if (entityIds !== undefined) {
      for (const entityId of entityIds) {
        // remove the response mapping from the entity
        entityToResponseIds.get(entityId)?.delete(responseId);
      }
      // remove all the entity mappings from the response
      responseIdToEntityIds.delete(responseId);
    }

    if (shouldRemove) {
      // remove the response from the cache
      cachedResponses.delete(responseId);
    }
  }

  function purgeEntity(entity: string) {
    const responseIds = entityToResponseIds.get(entity);

    if (responseIds !== undefined) {
      for (const responseId of responseIds) {
        purgeResponse(responseId);
      }
    }
  }

  return {
    set(responseId, result, collectedEntities, ttl) {
      cachedResponses.set(responseId, result, { ttl });
      const entityIds = new Set<string>();
      responseIdToEntityIds.set(responseId, entityIds);

      for (const { typename, id } of collectedEntities) {
        let operationIds = entityToResponseIds.get(typename);
        if (operationIds == null) {
          operationIds = new Set<string>();
          entityToResponseIds.set(typename, operationIds);
        }

        // typename => operation
        operationIds.add(responseId);
        // operation => typename
        entityIds.add(typename);

        if (id !== undefined) {
          const entityId = buildEntityId(typename, id);
          let responseIds = entityToResponseIds.get(entityId);
          if (responseIds == null) {
            responseIds = new Set();
            entityToResponseIds.set(entityId, responseIds);
          }

          // typename:id => operation
          responseIds.add(responseId);
          // operation => typename:id
          entityIds.add(entityId);
        }
      }
    },
    get(responseId) {
      return cachedResponses.get(responseId) ?? null;
    },
    invalidate(entitiesToRemove) {
      for (const { typename, id } of entitiesToRemove) {
        purgeEntity(id != null ? buildEntityId(typename, id) : typename);
      }
    },
  };
};

export const defaultBuildEntityId: BuildEntityId = (typename, id) => `${typename}:${id}`;
