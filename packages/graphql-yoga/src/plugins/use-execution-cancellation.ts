import type { Plugin } from './types.js';

/**
 * Enables experimental support for request cancelation.
 */
export function useExecutionCancellation(): Plugin {
  return {
    onExecute({ args }) {
      args.signal = args.contextValue?.request?.signal ?? undefined;
    },
    onSubscribe({ args }) {
      args.signal = args.contextValue?.request?.signal ?? undefined;
    },
  };
}
