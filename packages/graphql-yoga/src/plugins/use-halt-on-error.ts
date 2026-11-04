import { applyOnError, resolveOnError, type OnErrorBehavior } from '../on-error.js';
import type { Plugin } from './types.js';

/**
 * Not `context.params.onError`: `handleParams` is the only place that
 * assigns `params` onto `context`, and a response-cache hit skips it (an
 * earlier plugin's `onParams` hook calls `setResult` first), so
 * `context.params` can be unset when `onExecutionResult` fires.
 */
const behaviorByContext = new WeakMap<object, OnErrorBehavior>();

export function useHaltOnError(): Plugin {
  return {
    onParams({ params, context }) {
      // server.ts's onParamsHooks loop doesn't wire iterateAsync's early-exit
      // callback, so every plugin's onParams hook still runs after an earlier
      // one calls setResult — this always sees the real params, cache hit or not.
      behaviorByContext.set(context, resolveOnError(params.onError));
    },
    onExecutionResult({ result, setResult, context }) {
      if (result == null) return;
      const behavior = behaviorByContext.get(context) ?? 'PROPAGATE';
      setResult(applyOnError(behavior, result));
    },
  };
}
