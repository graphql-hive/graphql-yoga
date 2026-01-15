import { ExecutionResult } from 'graphql';
import { isAsyncIterable } from '@envelop/core';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import { fakePromise } from '@whatwg-node/server';
import { getResponseInitByRespectingErrors } from '../../error.js';
import { FetchAPI, MaybeArray } from '../../types.js';
import { ResultProcessor, ResultProcessorInput } from '../types.js';
import { jsonStringifyResultWithoutInternals } from './stringify.js';

export function getSSEProcessor(): ResultProcessor {
  return function processSSEResult(result: ResultProcessorInput, fetchAPI: FetchAPI): Response {
    let pingIntervalMs = 12_000;

    // for testing the pings, reduce the timeout
    if (globalThis.process?.env?.['NODE_ENV'] === 'test') {
      pingIntervalMs = 300;
    }

    const headersInit = {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
      'Content-Encoding': 'none',
    };

    const responseInit = getResponseInitByRespectingErrors(result, headersInit, true);

    let iterator: AsyncIterator<MaybeArray<ExecutionResult>>;

    let pingInterval: number;
    const textEncoder = new fetchAPI.TextEncoder();
    const readableStream = new fetchAPI.ReadableStream({
      start(controller) {
        // always start with a ping because some browsers dont accept a header flush
        // causing the fetch to stall until something is streamed through the response
        controller.enqueue(textEncoder.encode(':\n\n'));

        // ping client every 12 seconds to keep the connection alive
        pingInterval = setInterval(() => {
          if (!controller.desiredSize) {
            clearInterval(pingInterval);
            return;
          }
          controller.enqueue(textEncoder.encode(':\n\n'));
        }, pingIntervalMs) as unknown as number;

        if (isAsyncIterable(result)) {
          iterator = result[Symbol.asyncIterator]();
        } else {
          let finished = false;
          iterator = {
            next: () => {
              if (finished) {
                return fakePromise({ done: true, value: null });
              }
              finished = true;
              return fakePromise({ done: false, value: result });
            },
          };
        }
      },
      pull(controller) {
        return handleMaybePromise(
          () => iterator.next(),
          result => {
            if (result.value != null) {
              controller.enqueue(textEncoder.encode(`event: next\n`));
              const chunk = jsonStringifyResultWithoutInternals(result.value);
              controller.enqueue(textEncoder.encode(`data: ${chunk}\n\n`));
            }
            if (result.done) {
              controller.enqueue(textEncoder.encode(`event: complete\n`));
              controller.enqueue(textEncoder.encode(`data:\n\n`));
              clearInterval(pingInterval);
              controller.close();
            }
          },
          err => {
            controller.error(err);
          },
        );
      },
      cancel(e) {
        clearInterval(pingInterval);
        if (iterator.return) {
          return handleMaybePromise(
            () => iterator.return?.(e),
            () => {},
          );
        }
      },
    });
    return new fetchAPI.Response(readableStream, responseInit);
  };
}
