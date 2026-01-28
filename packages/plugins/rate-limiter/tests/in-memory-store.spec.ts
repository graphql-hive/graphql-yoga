import { InMemoryStore } from '../src/in-memory-store.js';

test('InMemoryStore sets correct timestamps', () => {
  const store = new InMemoryStore();
  store.setForIdentity({ contextIdentity: 'foo', fieldIdentity: 'bar' }, [1, 2, 3]);
  expect(store.state).toEqual({ foo: { bar: [1, 2, 3] } });

  store.setForIdentity({ contextIdentity: 'foo', fieldIdentity: 'bar2' }, [4, 5]);
  expect(store.state).toEqual({
    foo: { bar: [1, 2, 3], bar2: [4, 5] },
  });

  store.setForIdentity({ contextIdentity: 'foo', fieldIdentity: 'bar' }, [10, 20]);
  expect(store.state).toEqual({
    foo: { bar: [10, 20], bar2: [4, 5] },
  });
});

test('InMemoryStore get correct timestamps', () => {
  const store = new InMemoryStore();
  store.setForIdentity({ contextIdentity: 'foo', fieldIdentity: 'bar' }, [1, 2, 3]);
  expect(store.getForIdentity({ contextIdentity: 'foo', fieldIdentity: 'bar' })).toEqual([1, 2, 3]);

  store.setForIdentity({ contextIdentity: 'foo', fieldIdentity: 'bar2' }, [4, 5]);
  expect(store.getForIdentity({ contextIdentity: 'foo', fieldIdentity: 'bar2' })).toEqual([4, 5]);

  store.setForIdentity({ contextIdentity: 'foo', fieldIdentity: 'bar' }, [10, 20]);
  expect(store.getForIdentity({ contextIdentity: 'foo', fieldIdentity: 'bar' })).toEqual([10, 20]);
});
