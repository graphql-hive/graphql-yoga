/**
 * Jest Fake Timers don't work with performance.now()
 * Thus we replace it with a custom implementation lol.
 */
const nowOffset = Date.now();

globalThis.performance = {
  ...globalThis.performance,
  now: () => {
    return Date.now() - nowOffset;
  },
};
