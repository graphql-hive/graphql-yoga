import Redis from 'ioredis-mock';
import { CustomEvent } from '@whatwg-node/events';
import { createRedisEventTarget } from '../src';

// Use a uniq host name to prevent sharing data across test files when running on Bun
const redis = () => new Redis({ host: 'serializer.spec.ts' });

describe('createRedisEventTarget: serializer arg', () => {
  it('uses native JSON by default', done => {
    const eventTarget = createRedisEventTarget({
      publishClient: redis(),
      subscribeClient: redis(),
    });

    eventTarget.addEventListener('a', (event: CustomEvent) => {
      // Serialized by JSON
      expect(event.detail).toEqual({
        someNumber: 1,
        someBoolean: true,
        someText: 'hi',
      });
      done();
    });

    const event = new CustomEvent('a', {
      detail: {
        someNumber: 1,
        someBoolean: true,
        someText: 'hi',
      },
    });
    eventTarget.dispatchEvent(event);
  });

  it('can use a custom serializer', done => {
    const eventTarget = createRedisEventTarget({
      publishClient: redis(),
      subscribeClient: redis(),
      serializer: {
        stringify: message => `__CUSTOM__${JSON.stringify(message)}`,
        parse: (message: string) => {
          const result = JSON.parse(message.replace(/^__CUSTOM__/, ''));
          for (const key in result) {
            if (typeof result[key] === 'number') {
              result[key]++;
            }
          }
          return result;
        },
      },
    });

    eventTarget.addEventListener('b', (event: CustomEvent) => {
      expect(event.detail).toEqual({
        someNumber: 2,
        someBoolean: true,
        someText: 'hi',
      });
      done();
    });

    const event = new CustomEvent('b', {
      detail: {
        someNumber: 1,
        someBoolean: true,
        someText: 'hi',
      },
    });
    eventTarget.dispatchEvent(event);
  });
});
