import { createInMemoryCache } from '../src/in-memory-cache.js';

/**
 * `entityToResponseIds` has no getter on the public `Cache` interface, so these tests recover it
 * by temporarily subclassing the global `Map` while `createInMemoryCache` runs — this also
 * captures `responseIdToEntityIds` and whatever `lru-cache` builds internally — then, once a
 * known entity key has been `set`, picking out whichever captured `Map` actually holds it.
 */
function createInMemoryCacheWithMapSpy(...args: Parameters<typeof createInMemoryCache>) {
  const maps: Map<unknown, unknown>[] = [];
  const OriginalMap = global.Map;

  class SpiedMap extends OriginalMap {
    constructor() {
      super();
      maps.push(this);
    }
  }
  global.Map = SpiedMap as unknown as typeof Map;

  let cache: ReturnType<typeof createInMemoryCache>;
  try {
    cache = createInMemoryCache(...args);
  } finally {
    global.Map = OriginalMap;
  }

  return {
    cache,
    findEntityMap: (knownEntityKey: string) =>
      maps.find(map => map.has(knownEntityKey)) as Map<string, Set<string>>,
  };
}

describe('createInMemoryCache', () => {
  it('does not leak an empty entity Set after invalidating the last response referencing it (#4561)', () => {
    const { cache, findEntityMap } = createInMemoryCacheWithMapSpy();

    cache.set('op1', { data: {} }, [{ typename: 'User', id: 1 }], Infinity);
    const entityToResponseIds = findEntityMap('User:1');
    expect(entityToResponseIds.has('User:1')).toBe(true);

    cache.invalidate([{ typename: 'User', id: 1 }]);

    expect(entityToResponseIds.has('User:1')).toBe(false);
  });

  it('does not leak an empty entity Set when the LRU cache evicts a response (#4561)', () => {
    const { cache, findEntityMap } = createInMemoryCacheWithMapSpy({ max: 1 });

    cache.set('op1', { data: {} }, [{ typename: 'User', id: 1 }], Infinity);
    const entityToResponseIds = findEntityMap('User:1');
    expect(entityToResponseIds.has('User:1')).toBe(true);

    // exceeding `max` evicts op1 from the LRU, which triggers `dispose` -> `purgeResponse(id, false)`
    cache.set('op2', { data: {} }, [{ typename: 'Post', id: 2 }], Infinity);

    expect(entityToResponseIds.has('User:1')).toBe(false);
    expect(entityToResponseIds.has('Post:2')).toBe(true);
  });
});
