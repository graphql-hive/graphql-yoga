import type { ExecutionResult } from 'graphql';
import { isAsyncIterable } from '@envelop/core';
import { mapAsyncIterator } from '@whatwg-node/promise-helpers';
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

  const results: AsyncIterable<MaybeArray<ExecutionResult>> = isAsyncIterable(result)
    ? result
    : {
        async *[Symbol.asyncIterator]() {
          yield result;
        },
      };

  function encodePart(value: MaybeArray<ExecutionResult>): Uint8Array {
    const chunk = jsonStringifyResultWithoutInternals(value);
    const encodedChunk = textEncoder.encode(chunk);
    return textEncoder.encode(
      `\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: ${encodedChunk.byteLength}\r\n\r\n${chunk}\r\n---`,
    );
  }

  async function* encodeMultipart(): AsyncGenerator<Uint8Array, void, undefined> {
    yield textEncoder.encode('\r\n');
    yield textEncoder.encode('---');
    yield* mapAsyncIterator(results, encodePart);
    yield textEncoder.encode('--\r\n');
  }

  const readableStream = readableStreamFrom(fetchAPI.ReadableStream, encodeMultipart());
  return new fetchAPI.Response(readableStream, responseInit);
}
