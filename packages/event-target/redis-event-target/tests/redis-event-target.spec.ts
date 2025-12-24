import Redis from 'ioredis-mock';
import { CustomEvent } from '@whatwg-node/events';
import { createRedisEventTarget } from '../src';

// Use a uniq host name to prevent sharing data across test files when running on Bun
const redis = () => new Redis({ host: 'redis-event-target.spec.ts' });

describe('createRedisEventTarget', () => {
  it('can listen to a simple publish', done => {
    const eventTarget = createRedisEventTarget({
      publishClient: redis(),
      subscribeClient: redis(),
    });

    eventTarget.addEventListener('a', (event: CustomEvent) => {
      expect(event.type).toEqual('a');
      expect(event.detail).toEqual({
        hi: 1,
      });
      done();
    });

    const event = new CustomEvent('a', {
      detail: {
        hi: 1,
      },
    });
    eventTarget.dispatchEvent(event);
  });

  it('does not listen for events for which no lister is set up', done => {
    const eventTarget = createRedisEventTarget({
      publishClient: redis(),
      subscribeClient: redis(),
    });

    eventTarget.addEventListener('a', (_event: CustomEvent) => {
      done(new Error('This should not be invoked'));
    });
    eventTarget.addEventListener('b', (event: CustomEvent) => {
      expect(event.type).toEqual('b');
      expect(event.detail).toEqual({
        hi: 1,
      });
      done();
    });

    const event = new CustomEvent('b', {
      detail: {
        hi: 1,
      },
    });
    eventTarget.dispatchEvent(event);
  });
  it('distributes the event to all event listeners', done => {
    const eventTarget = createRedisEventTarget({
      publishClient: redis(),
      subscribeClient: redis(),
    });

    let counter = 0;
    eventTarget.addEventListener('b', (_event: CustomEvent) => {
      counter++;
    });
    eventTarget.addEventListener('b', (_event: CustomEvent) => {
      counter++;
    });

    const event = new CustomEvent('b', {
      detail: {
        hi: 1,
      },
    });
    eventTarget.dispatchEvent(event);

    setImmediate(() => {
      expect(counter).toEqual(2);
      done();
    });
  });
});
