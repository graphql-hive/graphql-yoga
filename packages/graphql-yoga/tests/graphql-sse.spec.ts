import { setTimeout as setTimeout$ } from 'node:timers/promises';
import { createClient } from 'graphql-sse';
import { useGraphQLSSE } from '@graphql-yoga/plugin-graphql-sse';
import { createSchema, createYoga, Repeater } from '../src/index.js';

describe('GraphQL over SSE', () => {
  const schema = createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        hello: String!
      }
      type Subscription {
        greetings: String!
        waitForPings: String!
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
        waitForPings: {
          async *subscribe() {
            // a ping is issued every 300ms, wait for a few and just return
            await setTimeout$(300 * 3 + 100);
            return;
          },
        },
      },
    },
  });

  const yoga = createYoga({
    schema,
    maskedErrors: false,
    plugins: [useGraphQLSSE()],
  });

  describe('Distinct connections mode', () => {
    test('should issue pings while connected', async () => {
      const res = await yoga.fetch('http://yoga/graphql/stream?query=subscription{waitForPings}', {
        headers: {
          accept: 'text/event-stream',
        },
      });
      expect(res.ok).toBeTruthy();
      const text = await res.text();
      // Check that we have at least one ping
      expect(text).toContain(':');
      // Check that we have a complete event
      expect(text).toContain('event: complete');
    });

    it('should support single result operations', async () => {
      const client = createClient({
        url: 'http://yoga/graphql/stream',
        fetchFn: yoga.fetch,
        abortControllerImpl: AbortController,
        singleConnection: false, // distinct connection mode
        retryAttempts: 0,
      });

      await expect(
        new Promise((resolve, reject) => {
          let result: unknown;
          client.subscribe(
            {
              query: /* GraphQL */ `
                {
                  hello
                }
              `,
            },
            {
              next: msg => (result = msg),
              error: reject,
              complete: () => resolve(result),
            },
          );
        }),
      ).resolves.toMatchInlineSnapshot(`
        {
          "data": {
            "hello": "world",
          },
        }
      `);

      client.dispose();
    });

    it('should support streaming operations', async () => {
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

    it('should report errors through the stream', async () => {
      const client = createClient({
        url: 'http://yoga/graphql/stream',
        fetchFn: yoga.fetch,
        abortControllerImpl: AbortController,
        singleConnection: false, // distinct connection mode
        retryAttempts: 0,
      });

      try {
        await new Promise((resolve, reject) => {
          client.subscribe(
            {
              query: 'query TestQuery { nope }',
            },
            {
              next: () => {},
              error: reject,
              complete: () => reject(new Error('No errors received')),
            },
          );
        });
        // If we reach here, the test failed
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
        if (error instanceof Error && 'response' in (error as any)) {
          const response = (error as any).response as Response;
          const errorBody = await response.text();
          expect(errorBody).toContain('"errors":');
        } else {
          expect(String(error)).toContain('Cannot query field "nope" on type "Query"');
        }
      }

      client.dispose();
    });

    it('accept: application/graphql-response+json, application/json,  multipart/mixed, text/event-stream', async () => {
      const yoga = createYoga({
        schema: createSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              hi: [String]
            }

            type Subscription {
              hi: String!
            }
          `,
          resolvers: {
            Query: {
              hi: () => 'hi',
            },
            Subscription: {
              hi: {
                subscribe: () => new Repeater(push => push({ hi: 'hi' })),
              },
            },
          },
        }),
        plugins: [],
      });

      const response = await yoga.fetch('http://yoga/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept:
            'application/graphql-response+json, application/json, multipart/mixed, text/event-stream',
        },
        body: JSON.stringify({ query: 'subscription { hi }' }),
      });

      expect(response.status).toEqual(200);
      expect(response.headers.get('content-type')).toEqual('text/event-stream');
    });
  });

  describe('Single connection mode', () => {
    it('should support multiple operations over the same connection', async () => {
      const client = createClient({
        url: 'http://yoga/graphql/stream',
        fetchFn: yoga.fetch,
        abortControllerImpl: AbortController,
        singleConnection: true, // single connection mode
        retryAttempts: 0,
      });

      // Test single result operation (query)
      const queryResult = await new Promise((resolve, reject) => {
        let result: unknown;
        client.subscribe(
          {
            query: /* GraphQL */ `
              {
                hello
              }
            `,
          },
          {
            next: msg => (result = msg),
            error: reject,
            complete: () => resolve(result),
          },
        );
      });
      expect(queryResult).toMatchInlineSnapshot(`
        {
          "data": {
            "hello": "world",
          },
        }
      `);

      // Test streaming operation (subscription)
      const subscriptionResult = await new Promise((resolve, reject) => {
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
      });
      expect(subscriptionResult).toMatchInlineSnapshot(`
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
  });
});
