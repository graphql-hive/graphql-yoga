import { handleMaybePromise, isPromise, MaybePromise } from '@whatwg-node/promise-helpers';

export type GenericInstrumentation = Record<
  string,
  (payload: any, wrapped: () => MaybePromise<void>) => MaybePromise<void>
>;

/**
 * Composes 2 instrumentations together into one instrumentation.
 * The first one will be the outer call, the second one the inner call.
 */
export function chain<First extends GenericInstrumentation, Next extends GenericInstrumentation>(
  first: First,
  next: Next,
) {
  const merged: GenericInstrumentation = { ...next, ...first };

  for (const key of Object.keys(merged)) {
    if (key in first && first[key] && key in next && next[key]) {
      merged[key] = (payload, wrapped) => first[key]!(payload, () => next[key]!(payload, wrapped));
    }
  }
  return merged as First & Next;
}

/**
 * Composes a list of instrumentation together into one instrumentation object.
 * The order of execution will respect the order of the array,
 * the first one being the outter most call, the last one the inner most call.
 */
export function composeInstrumentation<T extends GenericInstrumentation>(
  instrumentation: T[],
): T | undefined {
  return instrumentation.length > 0 ? instrumentation.reduce(chain) : undefined;
}

/**
 * Extract instrumentation from a list of plugins.
 * It returns instrumentation found, and the list of plugins without their instrumentation.
 *
 * You can use this to easily customize the composition of the instrumentation if the default one
 * doesn't suits your needs.
 */
export function getInstrumentationAndPlugin<T, P extends { instrumentation?: T }>(
  plugins: P[],
): { pluginInstrumentation: T[]; plugins: Omit<P, 'instrumentation'>[] } {
  const pluginInstrumentation: T[] = [];
  const newPlugins: Omit<P, 'instrumentation'>[] = [];
  for (const { instrumentation, ...plugin } of plugins) {
    if (instrumentation) {
      pluginInstrumentation.push(instrumentation);
    }
    newPlugins.push(plugin);
  }
  return { pluginInstrumentation, plugins: newPlugins };
}

/**
 * A helper to instrument a function.
 *
 * @param payload: The first argument that will be passed to the instrumentation on each function call
 * @returns Function and Async Functions factories allowing to wrap a function with a given instrument.
 */
export const getInstrumented = <TPayload>(payload: TPayload) => ({
  /**
   * Wraps the `wrapped` function with the given `instrument` wrapper.
   * @returns The wrapped function, or `undefined` if the instrument is `undefined`.
   */
  fn<TResult, TArgs extends any[]>(
    instrument: ((payload: TPayload, wrapped: () => void) => void) | undefined,
    wrapped: (...args: TArgs) => TResult,
  ): (...args: TArgs) => TResult {
    if (!instrument) {
      return wrapped;
    }

    return (...args) => {
      let result: TResult;
      instrument(payload, () => {
        result = wrapped(...args);
      });
      return result!;
    };
  },

  /**
   * Wraps the `wrapped` function with the given `instrument` wrapper.
   * @returns The wrapped function, or `undefined` if the instrument is `undefined`.
   */
  asyncFn<TResult, TArgs extends any[]>(
    instrument:
      | ((payload: TPayload, wrapped: () => MaybePromise<void>) => MaybePromise<void>)
      | undefined,
    wrapped: (...args: TArgs) => MaybePromise<TResult>,
  ): (...args: TArgs) => MaybePromise<TResult> {
    if (!instrument) {
      return wrapped;
    }

    return (...args) => {
      let result: MaybePromise<TResult>;
      return handleMaybePromise(
        () =>
          instrument(payload, () => {
            result = wrapped(...args);
            return isPromise(result) ? result.then(() => undefined) : undefined;
          }),
        () => {
          return result;
        },
      );
    };
  },
});
