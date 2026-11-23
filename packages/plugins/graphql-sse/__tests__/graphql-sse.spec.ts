import { createClient } from 'graphql-sse';
import { createSchema, createYoga } from 'graphql-yoga';
import { usePersistedOperations } from '@graphql-yoga/plugin-persisted-operations';
import { useGraphQLSSE } from '../src/index.js';

describe('graphql-sse', () => {
  const schema = createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        hello: String!
      }
      type Subscription {
        greetings: String!
      }
    `,
    resolvers: {
      Query: {
        async hello() {
          return 'world';
        },
      },
      Subscription: {
        greetings: {
          async *subscribe() {
            for (const hi of ['Hi', 'Bonjour', 'Hola', 'Ciao', 'Zdravo']) {
              yield { greetings: hi };
            }
          },
        },
      },
    },
  });

  const yoga = createYoga({
    schema,
    plugins: [useGraphQLSSE()],
    maskedErrors: false,
  });

  it('should stream using distinct connection mode', async () => {
    const client = createClient({
      url: 'http://yoga/graphql/stream',
      fetchFn: yoga.fetch,
      abortControllerImpl: AbortController,
      singleConnection: false, // distinct connection mode
      retryAttempts: 0,
    });

    await expect(
      new Promise((resolve, reject) => {
        const msgs: unknown[] = [];
        client.subscribe(
          {
            query: /* GraphQL */ `
              subscription {
                greetings
              }
            `,
          },
          {
            next: msg => msgs.push(msg),
            error: reject,
            complete: () => resolve(msgs),
          },
        );
      }),
    ).resolves.toMatchInlineSnapshot(`
      [
        {
          "data": {
            "greetings": "Hi",
          },
        },
        {
          "data": {
            "greetings": "Bonjour",
          },
        },
        {
          "data": {
            "greetings": "Hola",
          },
        },
        {
          "data": {
            "greetings": "Ciao",
          },
        },
        {
          "data": {
            "greetings": "Zdravo",
          },
        },
      ]
    `);

    client.dispose();
  });

  it('should stream using single connection and lazy mode', async () => {
    const client = createClient({
      url: 'http://yoga/graphql/stream',
      fetchFn: yoga.fetch,
      abortControllerImpl: AbortController,
      singleConnection: true, // single connection mode
      lazy: true,
      retryAttempts: 0,
    });

    await expect(
      new Promise((resolve, reject) => {
        const msgs: unknown[] = [];
        client.subscribe(
          {
            query: /* GraphQL */ `
              subscription {
                greetings
              }
            `,
          },
          {
            next: msg => msgs.push(msg),
            error: reject,
            complete: () => resolve(msgs),
          },
        );
      }),
    ).resolves.toMatchInlineSnapshot(`
      [
        {
          "data": {
            "greetings": "Hi",
          },
        },
        {
          "data": {
            "greetings": "Bonjour",
          },
        },
        {
          "data": {
            "greetings": "Hola",
          },
        },
        {
          "data": {
            "greetings": "Ciao",
          },
        },
        {
          "data": {
            "greetings": "Zdravo",
          },
        },
      ]
    `);

    client.dispose();
  });

  it('should stream using single connection and non-lazy mode', async () => {
    const client = createClient({
      url: 'http://yoga/graphql/stream',
      fetchFn: yoga.fetch,
      abortControllerImpl: AbortController,
      singleConnection: true, // single connection mode
      lazy: false,
      retryAttempts: 0,
    });

    await expect(
      new Promise((resolve, reject) => {
        const msgs: unknown[] = [];
        client.subscribe(
          {
            query: /* GraphQL */ `
              subscription {
                greetings
              }
            `,
          },
          {
            next: msg => msgs.push(msg),
            error: reject,
            complete: () => resolve(msgs),
          },
        );
      }),
    ).resolves.toMatchInlineSnapshot(`
      [
        {
          "data": {
            "greetings": "Hi",
          },
        },
        {
          "data": {
            "greetings": "Bonjour",
          },
        },
        {
          "data": {
            "greetings": "Hola",
          },
        },
        {
          "data": {
            "greetings": "Ciao",
          },
        },
        {
          "data": {
            "greetings": "Zdravo",
          },
        },
      ]
    `);

    client.dispose();
  });

  it('should use CORS settings from the server', async () => {
    const yoga = createYoga({
      schema,
      cors: {
        origin: 'http://yoga',
        credentials: true,
        allowedHeaders: ['x-some-header'],
        methods: ['GET', 'POST', 'DELETE', 'PUT'],
      },
      plugins: [useGraphQLSSE()],
      maskedErrors: false,
    });

    const res = await yoga.fetch('http://yoga/graphql/stream', {
      method: 'OPTIONS',
      headers: {
        origin: 'http://yoga',
      },
    });

    const headersObj = Object.fromEntries(res.headers.entries());
    expect(headersObj).toMatchInlineSnapshot(
      { 'x-request-id': expect.any(String) },
      `
      {
        "Content-Length": "0",
        "access-control-allow-credentials": "true",
        "access-control-allow-headers": "x-some-header",
        "access-control-allow-methods": "GET, POST, DELETE, PUT",
        "access-control-allow-origin": "http://yoga",
        "x-request-id": Any<String>,
      }
    `,
    );
  });

  describe('pre-execution errors (https://github.com/graphql-hive/graphql-yoga/issues/4653)', () => {
    function createErrorYoga() {
      return createYoga({
        schema: createSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              hello(n: Int): String
            }
          `,
          resolvers: {
            Query: {
              hello: () => 'world',
            },
          },
        }),
        plugins: [useGraphQLSSE()],
        maskedErrors: true,
      });
    }

    it('reports a syntax error as a masked GraphQL error instead of a raw stack trace', async () => {
      const yoga = createErrorYoga();
      const res = await yoga.fetch('http://yoga/graphql/stream', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
        body: JSON.stringify({ query: '{' }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/event-stream');
      const text = await res.text();
      expect(text).toContain('event: next');
      const [, data] = text.match(/data: (.+)/) ?? [];
      expect(JSON.parse(data!)).toMatchObject({
        data: null,
        errors: [{ message: expect.stringContaining('Syntax Error') }],
      });
    });

    it('reports a validation error with its real message', async () => {
      const yoga = createErrorYoga();
      const res = await yoga.fetch('http://yoga/graphql/stream', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
        body: JSON.stringify({ query: '{ nope }' }),
      });

      expect(res.status).toBe(200);
      const text = await res.text();
      const [, data] = text.match(/data: (.+)/) ?? [];
      expect(JSON.parse(data!)).toMatchObject({
        data: null,
        errors: [{ message: expect.stringContaining('Cannot query field "nope"') }],
      });
    });

    it('reports a variable coercion error with its real message', async () => {
      const yoga = createErrorYoga();
      const res = await yoga.fetch('http://yoga/graphql/stream', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
        body: JSON.stringify({
          query: 'query($n: Int!) { hello(n: $n) }',
          variables: { n: 'x' },
        }),
      });

      expect(res.status).toBe(200);
      const text = await res.text();
      const [, data] = text.match(/data: (.+)/) ?? [];
      expect(JSON.parse(data!)).toMatchObject({
        data: null,
        errors: [{ message: expect.stringContaining('Variable "$n"') }],
      });
    });
  });

  describe('persisted operations enforcement', () => {
    let dangerousCallCount = 0;

    const persistedSchema = createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          secret: String!
        }
        type Mutation {
          dangerous: String!
        }
      `,
      resolvers: {
        Query: {
          secret: () => 'leaked',
        },
        Mutation: {
          dangerous: () => {
            dangerousCallCount++;
            return 'done';
          },
        },
      },
    });

    const store = new Map<string, string>([['allowed', '{ secret }']]);

    function createProtectedYoga() {
      return createYoga({
        schema: persistedSchema,
        plugins: [
          usePersistedOperations({
            getPersistedOperation(key) {
              return store.get(key) ?? null;
            },
          }),
          useGraphQLSSE(),
        ],
        maskedErrors: false,
      });
    }

    beforeEach(() => {
      dangerousCallCount = 0;
    });

    it('rejects the same arbitrary query over /graphql as a control', async () => {
      const yoga = createProtectedYoga();

      const response = await yoga.fetch('http://yoga/graphql', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: '{ secret }' }),
      });

      const body = await response.json();
      expect(body.errors?.[0]?.message).toBe('PersistedQueryOnly');
    });

    it.each([
      ['distinct connection mode', false],
      ['single connection mode', true],
    ])(
      'rejects an arbitrary query sent over the SSE endpoint, %s',
      async (_name, singleConnection) => {
        const yoga = createProtectedYoga();
        const client = createClient({
          url: 'http://yoga/graphql/stream',
          fetchFn: yoga.fetch,
          abortControllerImpl: AbortController,
          singleConnection,
          retryAttempts: 0,
        });

        const result = await new Promise<unknown>((resolve, reject) => {
          client.subscribe(
            { query: '{ secret }' },
            {
              next: resolve,
              error: reject,
              complete: () => reject(new Error('expected a result')),
            },
          );
        });

        expect((result as { errors?: Array<{ message: string }> }).errors?.[0]?.message).toBe(
          'PersistedQueryOnly',
        );
        client.dispose();
      },
    );

    it('does not run the mutation resolver for a non-persisted mutation sent over SSE', async () => {
      const yoga = createProtectedYoga();
      const client = createClient({
        url: 'http://yoga/graphql/stream',
        fetchFn: yoga.fetch,
        abortControllerImpl: AbortController,
        singleConnection: false,
        retryAttempts: 0,
      });

      const result = await new Promise<unknown>((resolve, reject) => {
        client.subscribe(
          { query: 'mutation { dangerous }' },
          { next: resolve, error: reject, complete: () => reject(new Error('expected a result')) },
        );
      });

      expect((result as { errors?: Array<{ message: string }> }).errors?.[0]?.message).toBe(
        'PersistedQueryOnly',
      );
      expect(dangerousCallCount).toBe(0);
      client.dispose();
    });

    it('still executes a persisted operation sent over the SSE endpoint', async () => {
      const yoga = createProtectedYoga();
      const client = createClient({
        url: 'http://yoga/graphql/stream',
        fetchFn: yoga.fetch,
        abortControllerImpl: AbortController,
        singleConnection: false,
        retryAttempts: 0,
      });

      const result = await new Promise<unknown>((resolve, reject) => {
        client.subscribe(
          {
            query: '',
            extensions: {
              persistedQuery: { version: 1, sha256Hash: 'allowed' },
            },
          },
          { next: resolve, error: reject, complete: () => reject(new Error('expected a result')) },
        );
      });

      expect(result).toEqual({ data: { secret: 'leaked' } });
      client.dispose();
    });
  });
});
