import { Repeater } from 'graphql-yoga';
import { createDeferredPromise } from '@whatwg-node/server';

export const createPushPullAsyncIterable = <T>(): {
  source: Repeater<T>;
  push: (item: T) => void;
  terminate: () => void;
} => {
  const queue: Array<T> = [];
  let d = createDeferredPromise();
  let terminated = false;

  return {
    source: new Repeater<T>(async (push, stop) => {
      while (true) {
        if (terminated) {
          stop();
          return;
        }
        let item: T | undefined;
        while ((item = queue.shift())) {
          push(item);
        }
        await d.promise;
      }
    }),
    push: item => {
      queue.push(item);
      d.resolve();
      d = createDeferredPromise();
    },
    terminate: () => {
      terminated = true;
      d.resolve();
    },
  };
};
