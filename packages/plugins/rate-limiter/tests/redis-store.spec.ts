import redis from 'redis-mock';
import { RedisStore } from '../src/redis-store';

test('RedisStore sets and gets correct timestamps', async () => {
  const storeInstance = new RedisStore(redis.createClient());

  await storeInstance.setForIdentity({ contextIdentity: 'foo', fieldIdentity: 'bar' }, [1, 2, 3]);
  expect(
    await storeInstance.getForIdentity({
      contextIdentity: 'foo',
      fieldIdentity: 'bar',
    }),
  ).toEqual([1, 2, 3]);

  await storeInstance.setForIdentity({ contextIdentity: 'foo', fieldIdentity: 'bar2' }, [4, 5]);
  expect(
    await storeInstance.getForIdentity({
      contextIdentity: 'foo',
      fieldIdentity: 'bar2',
    }),
  ).toEqual([4, 5]);

  await storeInstance.setForIdentity({ contextIdentity: 'foo', fieldIdentity: 'bar' }, [10, 20]);
  expect(
    await storeInstance.getForIdentity({
      contextIdentity: 'foo',
      fieldIdentity: 'bar',
    }),
  ).toEqual([10, 20]);
});
