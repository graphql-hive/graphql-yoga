import { setTimeout as setTimeout$ } from 'node:timers/promises';
import { useDeferStream } from '@graphql-yoga/plugin-defer-stream';
import { createDeferredPromise, fakePromise } from '@whatwg-node/server';
import { createLogger, createSchema, createYoga, FetchAPI } from '../src/index';
import { useExecutionCancellation } from '../src/plugins/use-execution-cancellation';

const variants: Array<[name: string, fetchAPI: undefined | FetchAPI]> = [
  ['Ponyfill', undefined],
  [
    'Native',
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - URLPattern is not available in types
    globalThis,
  ],
];

function waitAFewMillisecondsToMakeSureGraphQLExecutionIsNotResumingInBackground() {
  return setTimeout$(5);
}

describe.each(variants)('request cancellation (%s)', (_, fetchAPI) => {
  it('request cancellation stops invocation of subsequent resolvers (GraphQL over HTTP)', async () => {
    const rootResolverGotInvokedD = createDeferredPromise();
    const requestGotCancelledD = createDeferredPromise();
    let aResolverGotInvoked = false;
    const schema = createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          root: A!
        }
        type A {
          a: String!
        }
      `,
      resolvers: {
        Query: {
          async root() {
            rootResolverGotInvokedD.resolve();
            await requestGotCancelledD.promise;
            return { a: 'a' };
          },
        },
        A: {
          a() {
            aResolverGotInvoked = true;
            return 'a';
          },
        },
      },
    });
    const logger = createLogger('silent');
    const debugLogs = jest.fn();
    logger.debug = debugLogs;
    const yoga = createYoga({
      schema,
      fetchAPI,
      logging: logger,
      plugins: [useExecutionCancellation()],
    });
    const abortController = new AbortController();
    const promise = fakePromise(
      yoga.fetch('http://yoga/graphql', {
        method: 'POST',
        body: JSON.stringify({ query: '{ root { a } }' }),
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortController.signal,
      }),
    );
    await rootResolverGotInvokedD.promise;
    abortController.abort();
    requestGotCancelledD.resolve();
    await expect(promise).rejects.toThrow(/operation was aborted/);
    await waitAFewMillisecondsToMakeSureGraphQLExecutionIsNotResumingInBackground();
    expect(aResolverGotInvoked).toBe(false);
    expect(debugLogs.mock.calls).toEqual([
      ['Parsing request to extract GraphQL parameters'],
      ['Processing GraphQL Parameters'],
      ['Request aborted'],
    ]);
  });

  it.only('request cancellation stops invocation of subsequent resolvers (GraphQL over SSE with Subscription)', async () => {
    const rootResolverGotInvokedD = createDeferredPromise();
    const requestGotCancelledD = createDeferredPromise();
    let aResolverGotInvoked = false;
    const schema = createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          root: A!
        }
        type Subscription {
          root: A!
        }
        type A {
          a: String!
        }
      `,
      resolvers: {
        Subscription: {
          root: {
            async *subscribe() {
              yield 1;
            },
            async resolve() {
              rootResolverGotInvokedD.resolve();
              await requestGotCancelledD.promise;
              return { a: 'a' };
            },
          },
        },
        A: {
          a() {
            aResolverGotInvoked = true;
            return 'a';
          },
        },
      },
    });
    const logger = createLogger('silent');
    const debugLogs = jest.fn();
    logger.debug = debugLogs;
    const yoga = createYoga({
      schema,
      fetchAPI,
      logging: logger,
      plugins: [useExecutionCancellation()],
    });
    const abortController = new AbortController();
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      body: JSON.stringify({ query: 'subscription { root { a } }' }),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      signal: abortController.signal,
    });
    expect(response.status).toBe(200);
    const iterator = response.body![Symbol.asyncIterator]();
    // first we will always get a ping/keep alive for flushed headers
    const next = await iterator.next();
    expect(next.value).toBeDefined();
    expect(Buffer.from(next.value!).toString('utf-8')).toMatchInlineSnapshot(`
":

"
`);

    const next$ = iterator.next().then(({ done, value }) => {
      // in case it resolves, parse the buffer to string for easier debugging.
      expect(value).toBeDefined();
      return { done, value: Buffer.from(value!).toString('utf-8') };
    });
    await rootResolverGotInvokedD.promise;

    abortController.abort();
    requestGotCancelledD.resolve();

    await expect(next$).rejects.toThrow(/operation was aborted/);
    await waitAFewMillisecondsToMakeSureGraphQLExecutionIsNotResumingInBackground();
    expect(aResolverGotInvoked).toBe(false);

    expect(debugLogs.mock.calls).toEqual([
      ['Parsing request to extract GraphQL parameters'],
      ['Processing GraphQL Parameters'],
      ['Processing GraphQL Parameters done.'],
      ['Request aborted'],
    ]);
  });

  it('request cancellation stops invocation of subsequent resolvers (GraphQL over Multipart with defer/stream)', async () => {
    const aResolverGotInvokedD = createDeferredPromise();
    const requestGotCancelledD = createDeferredPromise();
    let bResolverGotInvoked = false;
    const schema = createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          root: A!
        }
        type A {
          a: B!
        }
        type B {
          b: String
        }
      `,
      resolvers: {
        Query: {
          async root() {
            return { a: 'a' };
          },
        },
        A: {
          async a() {
            aResolverGotInvokedD.resolve();
            await requestGotCancelledD.promise;
            return { b: 'b' };
          },
        },
        B: {
          b: obj => {
            bResolverGotInvoked = true;
            return obj.b;
          },
        },
      },
    });
    const logger = createLogger('silent');
    const debugLogs = jest.fn();
    logger.debug = debugLogs;
    const yoga = createYoga({
      schema,
      plugins: [useDeferStream(), useExecutionCancellation()],
      fetchAPI,
      logging: logger,
    });

    const abortController = new AbortController();
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: /* GraphQL */ `
          query {
            root {
              ... @defer {
                a {
                  b
                }
              }
            }
          }
        `,
      }),
      headers: {
        'content-type': 'application/json',
        accept: 'multipart/mixed',
      },
      signal: abortController.signal,
    });
    expect(response.status).toEqual(200);
    const iterator = response.body![Symbol.asyncIterator]();
    let payload = '';

    // Shitty wait condition, but it works lol
    while (payload.split('\r\n').length < 6 || !payload.endsWith('---')) {
      const next = await iterator.next();
      expect(next.value).toBeDefined();
      payload += Buffer.from(next.value!).toString('utf-8');
    }

    const next$ = iterator.next().then(({ done, value }) => {
      // in case it resolves, parse the buffer to string for easier debugging.
      expect(value).toBeDefined();
      return { done, value: Buffer.from(value!).toString('utf-8') };
    });

    await aResolverGotInvokedD.promise;
    abortController.abort();
    requestGotCancelledD.resolve();
    await expect(next$).rejects.toThrow(/operation was aborted/);
    await waitAFewMillisecondsToMakeSureGraphQLExecutionIsNotResumingInBackground();
    expect(bResolverGotInvoked).toBe(false);
    expect(debugLogs.mock.calls).toEqual([
      ['Parsing request to extract GraphQL parameters'],
      ['Processing GraphQL Parameters'],
      ['Processing GraphQL Parameters done.'],
      ['Request aborted'],
    ]);
  });
});
