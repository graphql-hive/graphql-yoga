import { Server } from 'bun';
import { describe, expect, it } from 'bun:test';
import { createSchema, createYoga } from 'graphql-yoga';

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
  function beforeEach() {
    server = Bun.serve({
      fetch: yoga,
      port: 3000,
    });
    url = `http://${server.hostname}:${server.port}${yoga.graphqlEndpoint}`;
  }

  function afterEach() {
    server.stop();
  }

  it('shows GraphiQL', async () => {
    beforeEach();
    try {
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
    } finally {
      afterEach();
    }
  });

  it('accepts a query', async () => {
    beforeEach();
    try {
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
    } finally {
      afterEach();
    }
  });
});
