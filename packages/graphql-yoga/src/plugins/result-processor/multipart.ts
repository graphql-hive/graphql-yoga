import type { ExecutionResult } from 'graphql';
import { isAsyncIterable } from '@envelop/core';
import { getResponseInitByRespectingErrors } from '../../error.js';
import type { FetchAPI, MaybeArray } from '../../types.js';
import { readableStreamFrom } from '../../utils/readable-stream-from.js';
import type { ResultProcessorInput } from '../types.js';
import { jsonStringifyResultWithoutInternals } from './stringify.js';

export function processMultipartResult(result: ResultProcessorInput, fetchAPI: FetchAPI): Response {
  const headersInit = {
    Connection: 'keep-alive',
    'Content-Type': 'multipart/mixed; boundary="-"',
    'Transfer-Encoding': 'chunked',
  };

  const responseInit = getResponseInitByRespectingErrors(result, headersInit);
  const textEncoder = new fetchAPI.TextEncoder();

  async function* encodeMultipart(): AsyncGenerator<Uint8Array, void, undefined> {
    const iterator: AsyncIterator<MaybeArray<ExecutionResult>> = isAsyncIterable(result)
      ? result[Symbol.asyncIterator]()
      : (async function* () {
          yield result;
        })();

    let completed = false;
    try {
      yield textEncoder.encode('\r\n');
      yield textEncoder.encode(`---`);

      while (true) {
        const { done, value } = await iterator.next();

        if (value != null) {
          yield textEncoder.encode('\r\n');
          yield textEncoder.encode('Content-Type: application/json; charset=utf-8');
          yield textEncoder.encode('\r\n');

          const chunk = jsonStringifyResultWithoutInternals(value);
          const encodedChunk = textEncoder.encode(chunk);

          yield textEncoder.encode('Content-Length: ' + encodedChunk.byteLength);
          yield textEncoder.encode('\r\n');
          yield textEncoder.encode('\r\n');
          yield encodedChunk;
          yield textEncoder.encode('\r\n');
          yield textEncoder.encode('---');
        }

        if (done) {
          completed = true;
          yield textEncoder.encode('--\r\n');
          break;
        }
      }
    } finally {
      // Only tear down the source on cancel/error; natural completion already got done:true.
      if (!completed) {
        await iterator.return?.();
      }
    }
  }

  const readableStream = readableStreamFrom(fetchAPI.ReadableStream, encodeMultipart());
  return new fetchAPI.Response(readableStream, responseInit);
}
