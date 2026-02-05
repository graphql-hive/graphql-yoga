import { KVNamespace } from '@cloudflare/workers-types';
import type { CacheEntityRecord } from '@envelop/response-cache';
import { buildEntityKey } from './cache-key.js';

export function invalidate(
  entities: Iterable<CacheEntityRecord>,
  KV: KVNamespace,
  keyPrefix?: string,
): Promise<void> {
  const kvPromises: Promise<unknown>[] = []; // Collecting all the KV operations so we can await them all at once
  const entityInvalidationPromises: Promise<unknown>[] = []; // Parallelize invalidation of each entity

  for (const entity of entities) {
    entityInvalidationPromises.push(invalidateCacheEntityRecord(entity, kvPromises, KV, keyPrefix));
  }
  return Promise.allSettled([...entityInvalidationPromises, ...kvPromises]).then(() => undefined);
}

export async function invalidateCacheEntityRecord(
  entity: CacheEntityRecord,
  /** Collect all inner promises to batch await all async operations outside the function */
  kvPromiseCollection: Promise<unknown>[],
  KV: KVNamespace,
  keyPrefix?: string,
) {
  const entityKey = buildEntityKey(entity.typename, entity.id, keyPrefix);

  for await (const kvKey of getAllKvKeysForPrefix(entityKey, KV)) {
    if (kvKey.metadata?.operationKey) {
      kvPromiseCollection.push(KV.delete(kvKey.metadata?.operationKey));
      kvPromiseCollection.push(KV.delete(kvKey.name));
    }
  }
}

export async function* getAllKvKeysForPrefix(prefix: string, KV: KVNamespace) {
  let keyListComplete = false;
  let cursor: string | undefined;

  do {
    const kvListResponse = await KV.list<{ operationKey: string }>({
      prefix,
      cursor,
    });
    keyListComplete = kvListResponse.list_complete;

    if (!kvListResponse.list_complete) {
      cursor = kvListResponse.cursor;
    }

    for (const keyResult of kvListResponse.keys) {
      yield keyResult;
    }
  } while (!keyListComplete);
}
