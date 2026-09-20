import Redis from 'ioredis-mock';
import { createRedisEventTarget } from '@graphql-yoga/redis-event-target';
import { DroppingBuffer, FixedBuffer, SlidingBuffer } from '@repeaterjs/repeater';
import { createPubSub } from './create-pub-sub.js';

async function collectAsyncIterableValues<TType>(
  asyncIterable: AsyncIterable<TType>,
): Promise<Array<TType>> {
  const values: Array<TType> = [];
  for await (const value of asyncIterable) {
    values.push(value);
  }
  return values;
}

describe('createPubSub', () => {
  it('create', () => {
    createPubSub();
  });

  describe.each([
    ['InMemory', () => new EventTarget()],
    [
      'Redis',
      () =>
        createRedisEventTarget({
          publishClient: new Redis({}),
          subscribeClient: new Redis({}),
        }),
    ],
  ])(`API %s`, (_, createEventTarget) => {
    it('subscribe to topic', async () => {
      const pubSub = createPubSub<{
        a: [number];
      }>({
        eventTarget: createEventTarget(),
      });

      const sub = pubSub.subscribe('a');
      const allValues = collectAsyncIterableValues(sub);
      pubSub.publish('a', 1);
      pubSub.publish('a', 2);
      pubSub.publish('a', 3);

      setImmediate(() => {
        sub.return();
      });

      const result = await allValues;
      expect(result).toEqual([1, 2, 3]);
    });
    it('subscribe to multiple topics', async () => {
      const pubSub = createPubSub<{
        a: [number];
        b: [string];
      }>({
        eventTarget: createEventTarget(),
      });

      const sub1 = pubSub.subscribe('a');
      const sub2 = pubSub.subscribe('b');
      const allValues1 = collectAsyncIterableValues(sub1);
      const allValues2 = collectAsyncIterableValues(sub2);

      pubSub.publish('a', 1);
      pubSub.publish('b', '1');
      pubSub.publish('a', 2);
      pubSub.publish('b', '2');
      pubSub.publish('a', 3);
      pubSub.publish('b', '3');

      setImmediate(() => {
        sub1.return();
        sub2.return();
      });

      const result1 = await allValues1;
      const result2 = await allValues2;
      expect(result1).toEqual([1, 2, 3]);
      expect(result2).toEqual(['1', '2', '3']);
    });
    it('subscribe to fine-grained topic', async () => {
      const pubSub = createPubSub<{
        a: [id: string, payload: number];
      }>({
        eventTarget: createEventTarget(),
      });
      const id1 = '1';
      const sub1 = pubSub.subscribe('a', id1);
      const allValues1 = collectAsyncIterableValues(sub1);
      pubSub.publish('a', id1, 1);
      pubSub.publish('a', id1, 2);
      pubSub.publish('a', id1, 3);
      setImmediate(() => {
        sub1.return();
      });

      const result1 = await allValues1;
      expect(result1).toEqual([1, 2, 3]);
    });
    it('subscribe to multiple fine-grained topics', async () => {
      const pubSub = createPubSub<{
        a: [id: string, payload: number];
        b: [id: string, payload: string];
      }>({
        eventTarget: createEventTarget(),
      });
      const id1 = '1';
      const id2 = '1';

      const sub1 = pubSub.subscribe('a', id1);
      const sub2 = pubSub.subscribe('b', id2);

      const allValues1 = collectAsyncIterableValues(sub1);
      const allValues2 = collectAsyncIterableValues(sub2);

      pubSub.publish('a', id1, 1);
      pubSub.publish('b', id1, '1');
      pubSub.publish('a', id1, 2);
      pubSub.publish('b', id1, '2');
      pubSub.publish('a', id1, 3);
      pubSub.publish('b', id1, '3');
      setImmediate(() => {
        sub1.return();
        sub2.return();
      });

      const result1 = await allValues1;
      const result2 = await allValues2;
      expect(result1).toEqual([1, 2, 3]);
      expect(result2).toEqual(['1', '2', '3']);
    });
    it('subscribe to topic without payload', async () => {
      const pubSub = createPubSub<{
        a: [];
      }>({
        eventTarget: createEventTarget(),
      });

      const sub = pubSub.subscribe('a');
      const allValues = collectAsyncIterableValues(sub);
      pubSub.publish('a');
      pubSub.publish('a');
      pubSub.publish('a');

      setImmediate(() => {
        sub.return();
      });

      const result = await allValues;
      expect(result).toEqual([null, null, null]);
    });
  });

  describe('repeaterBuffer', () => {
    it('uses SlidingBuffer to handle overflow', async () => {
      const pubSub = createPubSub<{
        a: [number];
      }>({
        repeaterBuffer: new SlidingBuffer(3),
      });

      const sub = pubSub.subscribe('a');
      const allValues = collectAsyncIterableValues(sub);

      // Push more values than buffer capacity
      // First value (1) goes directly to the waiting consumer
      // Remaining values go to buffer: 2,3,4,5
      // SlidingBuffer(3) keeps last 3, so 2 slides out → buffer has [3,4,5]
      pubSub.publish('a', 1);
      pubSub.publish('a', 2);
      pubSub.publish('a', 3);
      pubSub.publish('a', 4);
      pubSub.publish('a', 5);

      setImmediate(() => {
        sub.return();
      });

      const result = await allValues;
      // First value (1) bypasses buffer, then buffer drains [3,4,5]
      expect(result).toEqual([1, 3, 4, 5]);
    });

    it('uses DroppingBuffer to handle overflow', async () => {
      const pubSub = createPubSub<{
        a: [number];
      }>({
        repeaterBuffer: new DroppingBuffer(3),
      });

      const sub = pubSub.subscribe('a');
      const allValues = collectAsyncIterableValues(sub);

      // Push more values than buffer capacity
      // First value (1) goes directly to the waiting consumer
      // Remaining values go to buffer: 2,3,4,5
      // DroppingBuffer(3) keeps first 3, so 5 is dropped → buffer has [2,3,4]
      pubSub.publish('a', 1);
      pubSub.publish('a', 2);
      pubSub.publish('a', 3);
      pubSub.publish('a', 4);
      pubSub.publish('a', 5);

      setImmediate(() => {
        sub.return();
      });

      const result = await allValues;
      // First value (1) bypasses buffer, then buffer drains [2,3,4]
      expect(result).toEqual([1, 2, 3, 4]);
    });

    it('uses FixedBuffer with higher capacity', async () => {
      const pubSub = createPubSub<{
        a: [number];
      }>({
        repeaterBuffer: new FixedBuffer(5),
      });

      const sub = pubSub.subscribe('a');
      const allValues = collectAsyncIterableValues(sub);

      pubSub.publish('a', 1);
      pubSub.publish('a', 2);
      pubSub.publish('a', 3);
      pubSub.publish('a', 4);
      pubSub.publish('a', 5);

      setImmediate(() => {
        sub.return();
      });

      const result = await allValues;
      // FixedBuffer with capacity 5 keeps all 5 values
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });
  });
});
