import request from 'supertest';
import { createDeferred } from '@graphql-tools/utils';
import { fetch } from '@whatwg-node/fetch';
import { eventStream } from '../../../packages/graphql-yoga/__tests__/utilities.js';
import { buildApp } from '../src/app.js';

describe('fastify example integration', () => {
  let app: ReturnType<typeof buildApp>[0];

  beforeEach(async () => {
    [app] = buildApp(false);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('sends GraphiQL', async () => {
    const response = await request(app.server).get('/graphql').set({
      accept: 'text/html',
    });

    expect(response.statusCode).toEqual(200);
    expect(response.text).toContain('<title>Yoga GraphiQL</title>');
  });

  it('handles query operation via POST', async () => {
    const response = await request(app.server)
      .post('/graphql')
      .set({ 'content-type': 'application/json' })
      .send(
        JSON.stringify({
          query: /* GraphQL */ `
            query {
              __typename
            }
          `,
        }),
      );

    expect(response.statusCode).toEqual(200);
    expect(response.body).toStrictEqual({
      data: {
        __typename: 'Query',
      },
    });
  });

  it("exposes fastify's request and reply objects", async () => {
    const response = await request(app.server)
      .post('/graphql')
      .set({ 'content-type': 'application/json' })
      .send(
        JSON.stringify({
          query: /* GraphQL */ `
            {
              isFastify
            }
          `,
        }),
      );

    expect(response.statusCode).toEqual(200);
    expect(response.body).toStrictEqual({
      data: {
        isFastify: true,
      },
    });
  });

  it('handles query operation via GET', async () => {
    const response = await request(app.server)
      .get('/graphql')
      .query({
        query: /* GraphQL */ `
          query {
            __typename
          }
        `,
      });

    expect(response.statusCode).toEqual(200);
    expect(response.body).toStrictEqual({
      data: {
        __typename: 'Query',
      },
    });
  });

  it('handles mutation operation via POST', async () => {
    const response = await request(app.server)
      .post('/graphql')
      .set({ 'content-type': 'application/json' })
      .send(
        JSON.stringify({
          query: /* GraphQL */ `
            mutation {
              __typename
            }
          `,
        }),
      );

    expect(response.statusCode).toEqual(200);
    expect(response.body).toStrictEqual({
      data: {
        __typename: 'Mutation',
      },
    });
  });

  it('rejects mutation operation via GET with an useful error message', async () => {
    const response = await request(app.server)
      .get('/graphql')
      .query({
        query: /* GraphQL */ `
          mutation {
            __typename
          }
        `,
      });

    expect(response.body).toStrictEqual({
      errors: [
        {
          message: 'Can only perform a mutation operation from a POST request.',
          extensions: {
            code: 'BAD_REQUEST',
          },
        },
      ],
    });
  });

  it('handles subscription operations via GET', async () => {
    const response = await request(app.server)
      .get('/graphql')
      .set({ accept: 'text/event-stream' })
      .query({
        query: /* GraphQL */ `
          subscription {
            countdown(from: 10, interval: 1)
          }
        `,
      });
    expect(response.statusCode).toEqual(200);
    expect(response.text.replace(/:\n\n/g, '')).toMatchInlineSnapshot(`
"event: next
data: {"data":{"countdown":10}}

event: next
data: {"data":{"countdown":9}}

event: next
data: {"data":{"countdown":8}}

event: next
data: {"data":{"countdown":7}}

event: next
data: {"data":{"countdown":6}}

event: next
data: {"data":{"countdown":5}}

event: next
data: {"data":{"countdown":4}}

event: next
data: {"data":{"countdown":3}}

event: next
data: {"data":{"countdown":2}}

event: next
data: {"data":{"countdown":1}}

event: next
data: {"data":{"countdown":0}}

event: complete
data"
`);
  });

  it('handles subscription operations via POST', async () => {
    const response = await request(app.server)
      .post('/graphql')
      .set({
        accept: 'text/event-stream',
        'content-type': 'application/json',
      })
      .send({
        query: /* GraphQL */ `
          subscription {
            countdown(from: 10, interval: 1)
          }
        `,
      });
    expect(response.statusCode).toEqual(200);
    expect(response.text.replace(/:\n\n/g, '')).toMatchInlineSnapshot(`
"event: next
data: {"data":{"countdown":10}}

event: next
data: {"data":{"countdown":9}}

event: next
data: {"data":{"countdown":8}}

event: next
data: {"data":{"countdown":7}}

event: next
data: {"data":{"countdown":6}}

event: next
data: {"data":{"countdown":5}}

event: next
data: {"data":{"countdown":4}}

event: next
data: {"data":{"countdown":3}}

event: next
data: {"data":{"countdown":2}}

event: next
data: {"data":{"countdown":1}}

event: next
data: {"data":{"countdown":0}}

event: complete
data"
`);
  });

  it('should handle file uploads', async () => {
    const response = await request(app.server)
      .post('/graphql')
      .field(
        'operations',
        JSON.stringify({
          query: 'mutation ($file: File!) { getFileName(file: $file) }',
          variables: { file: null },
        }),
      )
      .field('map', JSON.stringify({ 0: ['variables.file'] }))
      .attach('0', Buffer.from('TESTCONTENT'), {
        filename: 'file.txt',
        contentType: 'plain/text',
      });
    expect(response.statusCode).toBe(200);
    expect(response.body).toStrictEqual({
      data: {
        getFileName: 'file.txt',
      },
    });
  });

  it('request cancelation', async () => {
    const slowFieldResolverInvoked = createDeferred<void>();
    const slowFieldResolverCanceled = createDeferred<void>();
    const address = await app.listen({
      port: 0,
    });

    // we work with logger statements to detect when the slow field resolver is invoked and when it is canceled
    const loggerOverwrite = (part: unknown) => {
      if (part === 'Slow resolver invoked') {
        slowFieldResolverInvoked.resolve();
      }
      if (part === 'Slow field got cancelled') {
        slowFieldResolverCanceled.resolve();
      }
    };

    const info = app.log.info;
    app.log.info = loggerOverwrite;
    app.log.debug = loggerOverwrite;

    try {
      const abortController = new AbortController();
      const response$ = fetch(`${address}/graphql`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              slow {
                field
              }
            }
          `,
        }),
        signal: abortController.signal,
      });

      await slowFieldResolverInvoked.promise;
      abortController.abort();
      await expect(response$).rejects.toMatchInlineSnapshot(
        `[AbortError: The operation was aborted]`,
      );
      await slowFieldResolverCanceled.promise;
    } finally {
      app.log.info = info;
    }
  });

  it('subscription cancelation', async () => {
    const cancelationIsLoggedPromise = createDeferred<void>();
    const address = await app.listen({
      port: 0,
    });

    // we work with logger statements to detect when the subscription source is cleaned up.
    const loggerOverwrite = (part: unknown) => {
      if (part === 'countdown aborted') {
        cancelationIsLoggedPromise.resolve();
      }
    };

    const info = app.log.info;
    app.log.info = loggerOverwrite;

    try {
      const abortController = new AbortController();
      const url = new URL(`${address}/graphql`);
      url.searchParams.set(
        'query',
        /* GraphQL */ `
          subscription {
            countdown(from: 10, interval: 5)
          }
        `,
      );
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'content-type': 'application/json',
          accept: 'text/event-stream',
        },
        signal: abortController.signal,
      });

      const iterator = eventStream(response.body!);
      const next = await iterator.next();
      expect(next.value).toEqual({ data: { countdown: 10 } });
      abortController.abort();
      await expect(iterator.next()).rejects.toMatchInlineSnapshot(
        `[AbortError: The operation was aborted]`,
      );
      await cancelationIsLoggedPromise.promise;
    } finally {
      app.log.info = info;
    }
  });
});
