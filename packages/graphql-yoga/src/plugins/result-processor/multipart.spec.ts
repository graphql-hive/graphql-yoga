import type { ExecutionResult } from 'graphql';
import type { FetchAPI } from '../../types.js';
import type { ResultProcessorInput } from '../types.js';
import { processMultipartResult } from './multipart.js';

describe('processMultipartResult', () => {
  it('builds the response body via ReadableStream.from', () => {
    let fromArg: unknown;

    class FakeReadableStream {
      static from(iterable: unknown) {
        fromArg = iterable;
        return 'STREAM';
      }
    }

    class FakeResponse {
      body: unknown;
      constructor(body: unknown) {
        this.body = body;
      }
    }

    const fetchAPI = {
      TextEncoder: globalThis.TextEncoder,
      Response: FakeResponse,
      ReadableStream: FakeReadableStream,
    } as unknown as FetchAPI;

    const result: ResultProcessorInput = { data: { foo: 'bar' } };
    const response = processMultipartResult(result, fetchAPI);

    expect(typeof (fromArg as AsyncIterable<unknown>)[Symbol.asyncIterator]).toBe('function');
    expect(response.body).toBe('STREAM');
  });

  it('calls iterator.return when the stream is cancelled after reading', async () => {
    let returned = false;
    const result = {
      [Symbol.asyncIterator](): AsyncIterator<ExecutionResult> {
        return {
          next: async () => ({
            done: false,
            value: { data: { foo: 'bar' } },
          }),
          return: async () => {
            returned = true;
            return { done: true, value: undefined };
          },
        };
      },
    } as unknown as ResultProcessorInput;

    const response = processMultipartResult(result, globalThis as unknown as FetchAPI);
    const reader = response.body!.getReader();
    // Preamble is two chunks; third pull enters mapAsyncIterator → source.
    await reader.read();
    await reader.read();
    await reader.read();
    await reader.cancel(new Error('aborted'));

    expect(returned).toBe(true);
  });
});
