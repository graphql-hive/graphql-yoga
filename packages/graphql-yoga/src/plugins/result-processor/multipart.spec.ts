import type { FetchAPI } from '../../types.js';
import type { ResultProcessorInput } from '../types.js';
import { processMultipartResult } from './multipart.js';

describe('processMultipartResult', () => {
  it('does not throw when cancel is invoked before the iterator has been assigned', () => {
    let capturedCancel: ((reason?: unknown) => unknown) | undefined;

    class FakeReadableStream {
      constructor(source: UnderlyingSource) {
        capturedCancel = source.cancel?.bind(source);
        // Deliberately never call `start`, simulating the stream being torn
        // down (e.g. the underlying connection destroyed) before it had a
        // chance to initialize, so `iterator` is still unassigned.
      }
    }

    const fetchAPI = {
      TextEncoder: globalThis.TextEncoder,
      Response: globalThis.Response,
      ReadableStream: FakeReadableStream,
    } as unknown as FetchAPI;

    const result: ResultProcessorInput = { data: { foo: 'bar' } };

    processMultipartResult(result, fetchAPI);

    expect(capturedCancel).toBeDefined();
    expect(() => capturedCancel!(new Error('aborted'))).not.toThrow();
  });
});
