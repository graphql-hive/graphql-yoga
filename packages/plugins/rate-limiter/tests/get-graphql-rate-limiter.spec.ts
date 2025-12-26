import { RedisClient } from 'redis-mock';
import { RedisStore } from '@envelop/rate-limiter';
import { getFieldIdentity, getGraphQLRateLimiter } from '../src/get-graphql-rate-limiter.js';
import { InMemoryStore } from '../src/in-memory-store.js';
import { type GraphQLRateLimitDirectiveArgs } from '../src/types.js';

const sleep = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

test('getFieldIdentity with no identity args', () => {
  expect(getFieldIdentity('myField', [], {})).toBe('myField');
  expect(getFieldIdentity('random', [], {})).toBe('random');
});

test('getFieldIdentity with identity args', () => {
  expect(getFieldIdentity('myField', ['id'], { id: 2 })).toBe('myField:2');
  expect(getFieldIdentity('myField', ['name', 'id'], { id: 2, name: 'Foo' })).toBe('myField:Foo:2');
  expect(getFieldIdentity('myField', ['name', 'bool'], { bool: true, name: 'Foo' })).toBe(
    'myField:Foo:true',
  );
  expect(getFieldIdentity('myField', ['name', 'bool'], {})).toBe('myField::');
  expect(getFieldIdentity('myField', ['name', 'bool'], { name: null })).toBe('myField::');
});

test('getFieldIdentity with nested identity args', () => {
  expect(getFieldIdentity('myField', ['item.id'], { item: { id: 2 }, name: 'Foo' })).toBe(
    'myField:2',
  );
  expect(getFieldIdentity('myField', ['item.foo'], { item: { id: 2 }, name: 'Foo' })).toBe(
    'myField:',
  );

  const obj = { item: { subItem: { id: 9 } }, name: 'Foo' };
  expect(getFieldIdentity('myField', ['item.subItem.id'], obj)).toBe('myField:9');

  const objTwo = { item: { subItem: { id: 1 } }, name: 'Foo' };
  expect(getFieldIdentity('myField', ['name', 'item.subItem.id'], objTwo)).toBe('myField:Foo:1');
});

test('getGraphQLRateLimiter with an empty store passes, but second time fails', async () => {
  const rateLimit = getGraphQLRateLimiter({
    store: new InMemoryStore(),
    identifyContext: context => context.id,
  });
  const config = { max: 1, window: '1s' };
  const field = {
    args: {},
    context: { id: '1' },
  };
  expect(await rateLimit('myField', field, config)).toBeFalsy();
  expect(await rateLimit('myField', field, config)).toBe(
    `You are trying to access 'myField' too often`,
  );
});

test('getGraphQLRateLimiter should block a batch of rate limited fields in a single query', async () => {
  const rateLimit = getGraphQLRateLimiter({
    store: new RedisStore(new RedisClient({})),
    identifyContext: context => context.id,
    enableBatchRequestCache: true,
  });
  const config = { max: 3, window: '1s' };
  const field = {
    args: {},
    context: { id: '1' },
  };

  const requests = Array.from({ length: 5 })
    .map(async () => rateLimit('myField', field, config))
    .map(p => p.catch(e => e));

  (await Promise.all(requests)).forEach((result, idx) => {
    if (idx < 3) expect(result).toBeFalsy();
    else expect(result).toBe(`You are trying to access 'myField' too often`);
  });
});

test('getGraphQLRateLimiter timestamps should expire', async () => {
  const rateLimit = getGraphQLRateLimiter({
    store: new InMemoryStore(),
    identifyContext: context => context.id,
  });
  const config = { max: 1, window: '0.5s' };
  const field = {
    args: {},
    context: { id: '1' },
  };
  expect(await rateLimit('myField', field, config)).toBeFalsy();
  expect(await rateLimit('myField', field, config)).toBe(
    `You are trying to access 'myField' too often`,
  );
  await sleep(500);
  expect(await rateLimit('myField', field, config)).toBeFalsy();
});

test('getGraphQLRateLimiter uncountRejected should ignore rejections', async () => {
  const rateLimit = getGraphQLRateLimiter({
    store: new InMemoryStore(),
    identifyContext: context => context.id,
  });
  const config = { max: 1, window: '1s', uncountRejected: true };
  const field = {
    args: {},
    context: { id: '1' },
  };
  expect(await rateLimit('myField', field, config)).toBeFalsy();
  await sleep(500);
  expect(await rateLimit('myField', field, config)).toBe(
    `You are trying to access 'myField' too often`,
  );
  await sleep(500);
  expect(await rateLimit('myField', field, config)).toBeFalsy();
});

test('getGraphQLRateLimiter should limit by callCount if arrayLengthField is passed', async () => {
  const rateLimit = getGraphQLRateLimiter({
    store: new InMemoryStore(),
    identifyContext: context => context.id,
  });
  const config: GraphQLRateLimitDirectiveArgs = {
    max: 4,
    window: '1s',
    arrayLengthField: 'items',
  };
  const field = {
    args: {
      items: [1, 2, 3, 4, 5],
    },
    context: { id: '1' },
  };
  expect(await rateLimit('listOfItems', field, config)).toBe(
    `You are trying to access 'listOfItems' too often`,
  );
});

test('getGraphQLRateLimiter should allow multiple calls to a field if the identityArgs change', async () => {
  const rateLimit = getGraphQLRateLimiter({
    store: new InMemoryStore(),
    identifyContext: context => context.id,
  });
  const config: GraphQLRateLimitDirectiveArgs = {
    max: 1,
    window: '1s',
    identityArgs: ['id'],
  };
  const field = {
    args: {
      id: '1',
    },
    context: { id: '1' },
  };
  expect(await rateLimit('listOfItems', field, config)).toBeFalsy();
  expect(await rateLimit('listOfItems', field, config)).toBe(
    `You are trying to access 'listOfItems' too often`,
  );
  expect(await rateLimit('listOfItems', { ...field, args: { id: '2' } }, config)).toBeFalsy();
  expect(await rateLimit('listOfItems', field, config)).toBe(
    `You are trying to access 'listOfItems' too often`,
  );
});
