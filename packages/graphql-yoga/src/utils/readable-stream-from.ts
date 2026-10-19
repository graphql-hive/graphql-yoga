/**
 * `ReadableStream.from` is available on Node 20.6+ / current `@whatwg-node/fetch`,
 * but DOM lib typings used by FetchAPI omit it.
 */
export function readableStreamFrom<R>(
  ReadableStreamCtor: {
    new (underlyingSource?: UnderlyingSource<R>, strategy?: QueuingStrategy<R>): ReadableStream<R>;
  },
  iterable: Iterable<R> | AsyncIterable<R>,
): ReadableStream<R> {
  const from = (
    ReadableStreamCtor as unknown as {
      from(iterable: Iterable<R> | AsyncIterable<R>): ReadableStream<R>;
    }
  ).from;
  if (typeof from !== 'function') {
    throw new TypeError('ReadableStream.from is not supported in this runtime');
  }
  return from.call(ReadableStreamCtor, iterable);
}
