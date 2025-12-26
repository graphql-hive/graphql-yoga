import { createServer, get, IncomingMessage } from 'node:http';
import { AddressInfo } from 'node:net';
import { setTimeout as setTimeout$ } from 'node:timers/promises';
import fetchMultipart from 'fetch-multipart-graphql';
import { createLogger, createSchema, createYoga, useExecutionCancellation } from 'graphql-yoga';
import { useDeferStream } from '@graphql-yoga/plugin-defer-stream';
import { createDeferredPromise, fakePromise } from '@whatwg-node/server';
import { createPushPullAsyncIterable } from '../__tests__/push-pull-async-iterable.js';

it('correctly deals with the source upon aborted requests', async () => {
  const { source, push, terminate } = createPushPullAsyncIterable<string>();
  push('A');

  const yoga = createYoga({
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hi: [String]
        }
      `,
      resolvers: {
        Query: {
          hi: () => source,
        },
      },
    }),
    plugins: [useDeferStream()],
  });

  const server = createServer(yoga);

  try {
    await new Promise<void>(resolve => {
      server.listen(() => {
        resolve();
      });
    });

    const port = (server.address() as AddressInfo)?.port ?? null;
    if (port === null) {
      throw new Error('Missing port...');
    }

    const response = await fetch(`http://localhost:${port}/graphql`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'multipart/mixed',
      },
      body: JSON.stringify({
        query: '{ hi @stream }',
      }),
    });
    let counter = 0;
    const toStr = (arr: Uint8Array) => Buffer.from(arr).toString('utf-8');
    for await (const chunk of response.body!) {
      const parts = toStr(chunk)
        .split('\r\n')
        .filter(p => p.startsWith('{'));
      for (const part of parts) {
        if (counter === 0) {
          expect(part).toBe(`{"data":{"hi":[]},"hasNext":true}`);
        } else if (counter === 1) {
          expect(part).toBe(`{"incremental":[{"items":["A"],"path":["hi",0]}],"hasNext":true}`);
          push('B');
        } else if (counter === 2) {
          expect(part).toBe(`{"incremental":[{"items":["B"],"path":["hi",1]}],"hasNext":true}`);
          push('C');
        } else if (counter === 3) {
          expect(part).toBe(`{"incremental":[{"items":["C"],"path":["hi",2]}],"hasNext":true}`);
          // when the source is returned this stream/loop should be exited.
          terminate();
          push('D');
        } else if (counter === 4) {
          expect(part).toBe(`{"hasNext":false}`);
        } else {
          throw new Error("LOL, this shouldn't happen.");
        }

        counter++;
      }
    }
  } finally {
    await new Promise<void>(res => {
      server.close(() => {
        res();
      });
    });
  }
});

it('memory/cleanup leak by source that never publishes a value', async () => {
  let sourceGotCleanedUp = false;
  const controller = new AbortController();
  const d = createDeferredPromise();

  const noop = d.promise.then(() => ({ done: true, value: undefined }));

  const source = {
    [Symbol.asyncIterator]() {
      return this;
    },
    next() {
      setTimeout(() => {
        controller.abort();
      }, 10);
      return noop;
    },
    return() {
      sourceGotCleanedUp = true;
      return fakePromise({ done: true, value: undefined });
    },
  };

  const logger = createLogger('silent');
  const debugLogger = jest.fn();

  logger.debug = debugLogger;
  const yoga = createYoga({
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hi: [String]
        }
      `,
      resolvers: {
        Query: {
          hi: () => source,
        },
      },
    }),
    plugins: [useDeferStream(), useExecutionCancellation()],
    logging: logger,
  });

  const server = createServer(yoga);

  try {
    await new Promise<void>(resolve => {
      server.listen(() => {
        resolve();
      });
    });

    const port = (server.address() as AddressInfo)?.port ?? null;
    if (port === null) {
      throw new Error('Missing port...');
    }

    const response = await new Promise<IncomingMessage>(resolve => {
      get(
        `http://localhost:${port}/graphql?query={hi @stream}`,
        {
          headers: {
            accept: 'multipart/mixed',
          },
          signal: controller.signal,
        },
        response => resolve(response),
      );
    });

    const iterator = response![Symbol.asyncIterator]();

    const next = await iterator.next();

    const chunkStr = Buffer.from(next.value).toString('utf-8');
    expect(chunkStr).toMatchInlineSnapshot(`
"
---
Content-Type: application/json; charset=utf-8
Content-Length: 33

{"data":{"hi":[]},"hasNext":true}
---"
`);

    await expect(iterator.next()).rejects.toMatchInlineSnapshot(`[Error: aborted]`);

    // Wait a bit - just to make sure the time is cleaned up for sure...
    await setTimeout$(50);
    expect(sourceGotCleanedUp).toBe(true);

    expect(debugLogger.mock.calls).toEqual([
      ['Parsing request to extract GraphQL parameters'],
      ['Processing GraphQL Parameters'],
      ['Processing GraphQL Parameters done.'],
      ['Request aborted'],
    ]);
  } finally {
    d.resolve();
    await new Promise<void>(res => {
      server.close(() => {
        res();
      });
    });
  }
});

describe('fetch-multipart-graphql', () => {
  it('execute defer operation', async () => {
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            a: String
            b: String
          }
        `,
        resolvers: {
          Query: {
            a: async () => {
              return 'a';
            },
            b: async () => {
              return 'b';
            },
          },
        },
      }),
      plugins: [useDeferStream()],
    });

    const server = createServer(yoga);

    try {
      await new Promise<void>(resolve => {
        server.listen(() => {
          resolve();
        });
      });

      const port = (server.address() as AddressInfo)?.port ?? null;
      if (port === null) {
        throw new Error('Missing port...');
      }

      await new Promise<void>((resolve, reject) => {
        fetchMultipart(`http://localhost:${port}/graphql`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'multipart/mixed',
          },
          body: JSON.stringify({
            query: /* GraphQL */ `
              query {
                ... on Query @defer {
                  a
                }
              }
            `,
          }),
          onNext(next) {
            expect(next).toEqual([
              {
                data: {},
                hasNext: true,
              },
              {
                hasNext: false,
                incremental: [
                  {
                    data: {
                      a: 'a',
                    },
                    path: [],
                  },
                ],
              },
            ]);
          },
          onError(err) {
            reject(err);
          },
          onComplete() {
            resolve();
          },
        });
      });
    } finally {
      await new Promise<void>(res => {
        server.close(() => {
          res();
        });
      });
    }
  });
});
