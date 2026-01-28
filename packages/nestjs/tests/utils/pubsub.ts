export interface Generator<T> {
  gen: AsyncGenerator<T, void, T>;
  produce(val: T): void;
}

function createGenerator<T>(): Generator<T> {
  const pending: T[] = [];

  const deferred = {
    done: false,
    error: null as unknown,
    resolve: () => {
      // noop
    },
  };

  const gen = (async function* gen() {
    for (;;) {
      if (!pending.length) {
        // only wait if there are no pending messages available
        await new Promise<void>(resolve => (deferred.resolve = resolve));
      }
      // first flush
      while (pending.length) {
        yield pending.shift()!;
      }
      // then error
      if (deferred.error) {
        throw deferred.error;
      }
      // or complete
      if (deferred.done) {
        return;
      }
    }
  })();

  gen.throw = async err => {
    if (!deferred.done) {
      deferred.done = true;
      deferred.error = err;
      deferred.resolve();
    }
    return { done: true, value: undefined };
  };

  gen.return = async () => {
    if (!deferred.done) {
      deferred.done = true;
      deferred.resolve();
    }
    return { done: true, value: undefined };
  };

  return {
    gen,
    produce(val) {
      pending.push(val);
      deferred.resolve();
    },
  };
}

export function createPubSub<T>() {
  const producers: Generator<T>['produce'][] = [];
  return {
    pub(val: T) {
      for (const next of producers) next(val);
    },
    sub() {
      const { gen, produce } = createGenerator<T>();
      producers.push(produce);
      const origReturn = gen.return;
      gen.return = () => {
        producers.splice(producers.indexOf(produce), 1);
        return origReturn();
      };
      return gen;
    },
  };
}
