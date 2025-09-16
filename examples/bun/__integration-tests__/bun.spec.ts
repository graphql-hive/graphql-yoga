import { Server } from 'bun';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { createSchema, createYoga, Plugin } from 'graphql-yoga';

describe('Bun integration', () => {
  const yoga = createYoga({
    schema: createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          greetings: String
        }
      `,
      resolvers: {
        Query: {
          greetings: () => 'Hello Bun!',
        },
      },
    }),
  });

  let server: Server;
  let url: string;
  beforeEach(() => {
    server = Bun.serve({
      fetch: yoga,
      port: 0,
    });
    url = `http://${server.hostname}:${server.port}${yoga.graphqlEndpoint}`;
  });

  afterEach(() => server.stop());

  it('shows GraphiQL', async () => {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'text/html',
      },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/html');
    const htmlContents = await response.text();
    expect(htmlContents.includes('GraphiQL')).toBe(true);
  });

  it('accepts a query', async () => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `{ greetings }`,
      }),
    });
    const result = await response.json();
    expect(result.data.greetings).toBe('Hello Bun!');
  });

  it('should have a different context for each request', async () => {
    const contexts: unknown[] = [];
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            greetings: String
            getContext: String
          }
        `,
        resolvers: {
          Query: {
            greetings: () => 'Hello Bun!',
            getContext: (_, __, ctx) => ctx['test'],
          },
        },
      }),
      plugins: [
        {
          onExecute: ({ args }) => {
            contexts.push(args.contextValue);
          },
        } as Plugin,
      ],
    });

    server = Bun.serve({
      fetch: yoga,
      port: 3001,
    });
    url = `http://${server.hostname}:${server.port}${yoga.graphqlEndpoint}`;

    async function makeTestRequest() {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `{ getContext }`,
        }),
      });
      await response.json();
    }

    try {
      await makeTestRequest();
      await makeTestRequest();
      expect(contexts[0]).not.toBe(contexts[1]);
    } finally {
      server.stop();
    }
  });
});
