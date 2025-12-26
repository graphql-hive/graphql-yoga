export const getNoOpCache = (): {
  set: ({ newTimestamps }: { newTimestamps: number[] }) => number[];
} => ({
  set: ({ newTimestamps }: { newTimestamps: number[] }) => newTimestamps,
});

export const getWeakMapCache = (): {
  set: ({
    context,
    fieldIdentity,
    newTimestamps,
  }: {
    context: Record<any, any>;
    fieldIdentity: string;
    newTimestamps: number[];
  }) => any;
} => {
  const cache = new WeakMap();

  return {
    set: ({
      context,
      fieldIdentity,
      newTimestamps,
    }: {
      context: Record<any, any>;
      fieldIdentity: string;
      newTimestamps: number[];
    }) => {
      const currentCalls = cache.get(context) || {};

      currentCalls[fieldIdentity] = [...(currentCalls[fieldIdentity] || []), ...newTimestamps];
      cache.set(context, currentCalls);
      return currentCalls[fieldIdentity];
    },
  };
};
