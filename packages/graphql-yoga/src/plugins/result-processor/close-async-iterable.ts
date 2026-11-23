import { isAsyncIterable } from '@graphql-tools/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import type { ResultProcessorInput } from '../types.js';

/**
 * Releases the source of a result that will never be consumed, e.g. a subscription
 * for which the response is a 406 because the client cannot receive a stream.
 */
export function closeAsyncIterable(result: ResultProcessorInput): void {
  if (isAsyncIterable(result)) {
    handleMaybePromise(
      () => result[Symbol.asyncIterator]().return?.(),
      () => {},
      () => {},
    );
  }
}
