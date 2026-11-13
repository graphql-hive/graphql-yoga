import { createClient } from 'graphql-sse';
import { createSchema, createYoga } from 'graphql-yoga';
import { usePersistedOperations } from '@graphql-yoga/plugin-persisted-operations';
import { useGraphQLSSE } from '../src/index.js';

describe('graphql-sse', () => {
  const schema = createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        hello: String!
        double(n: Int): Int
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
        double: (_root: unknown, { n }: { n?: number | null }) => (n ?? 0) * 2,
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

  describe('errors raised before execution', () => {
    async function request(body: Record<string, unknown>) {
      const response = await yoga.fetch('http://yoga/graphql/stream', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
        body: JSON.stringify(body),
      });
      return response;
    }

    async function subscribeErrors(params: { query: string; variables?: Record<string, unknown> }) {
      const client = createClient({
        url: 'http://yoga/graphql/stream',
        fetchFn: yoga.fetch,
        abortControllerImpl: AbortController,
        singleConnection: false,
        retryAttempts: 0,
      });
      return new Promise<unknown[]>((resolve, reject) => {
        const msgs: unknown[] = [];
        client.subscribe(params, {
          next: msg => msgs.push(msg),
          error: reject,
          complete: () => resolve(msgs),
        });
      });
    }

    it('should report syntax errors as GraphQL errors instead of a 500', async () => {
      const response = await request({ query: '{' });
      expect(response.status).not.toBe(500);
      expect(response.headers.get('content-type')).not.toContain('text/plain');
      const text = await response.text();
      expect(text).toContain('Syntax Error: Expected Name, found <EOF>.');
      expect(text).not.toContain('    at ');
    });

    it('should report validation errors with their real message', async () => {
      const response = await request({ query: '{ nope }' });
      const text = await response.text();
      expect(text).toContain('Cannot query field \\"nope\\" on type \\"Query\\".');
      expect(text).not.toContain('Unable to detect operation AST');
    });

    it('should report variable coercion errors with their real message', async () => {
      const response = await request({
        query: 'query ($n: Int!) { double(n: $n) }',
        variables: { n: 'x' },
      });
      const text = await response.text();
      expect(text).toMatch(/Variable \\+"\$n\\+" (got|has) invalid value/);
      expect(text).not.toContain('Unable to detect operation AST');
    });

    it('should deliver the errors to graphql-sse clients as a next event', async () => {
      await expect(subscribeErrors({ query: '{ nope }' })).resolves.toMatchObject([
        { data: null, errors: [{ message: 'Cannot query field "nope" on type "Query".' }] },
      ]);
      await expect(subscribeErrors({ query: '{' })).resolves.toMatchObject([
        { data: null, errors: [{ message: 'Syntax Error: Expected Name, found <EOF>.' }] },
      ]);
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
