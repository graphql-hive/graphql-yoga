import { createSchema } from '../src/schema';
import { createYoga } from '../src/server';

describe('Request body size limit', () => {
  const schema = createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        hello: String
      }
    `,
    resolvers: {
      Query: {
        hello: () => 'world',
      },
    },
  });

  it('rejects a POST body whose Content-Length exceeds the configured limit', async () => {
    const yoga = createYoga({ schema, maxRequestBodySize: 10, logging: false });
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ hello }' }),
    });
    expect(response.status).toBe(413);
    const body = await response.json();
    expect(body.errors[0].message).toMatch(/must not be larger than 10 bytes/);
  });

  it('rejects a streamed POST body without Content-Length once it exceeds the limit', async () => {
    const yoga = createYoga({ schema, maxRequestBodySize: 10, logging: false });
    const encoder = new TextEncoder();
    const payload = JSON.stringify({ query: '{ hello }' });
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(payload));
        controller.close();
      },
    });
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: stream,
      duplex: 'half',
    });
    expect(response.status).toBe(413);
    const body = await response.json();
    expect(body.errors[0].message).toMatch(/must not be larger than 10 bytes/);
  });

  it('allows requests within the configured limit', async () => {
    const yoga = createYoga({ schema, maxRequestBodySize: 1000, logging: false });
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ hello }' }),
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ data: { hello: 'world' } });
  });

  it('allows requests of any size when the limit is disabled', async () => {
    const yoga = createYoga({ schema, maxRequestBodySize: false, logging: false });
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ hello }', variables: { padding: 'x'.repeat(50_000) } }),
    });
    expect(response.status).toBe(200);
  });

  it('applies the default limit without configuration', async () => {
    const yoga = createYoga({ schema, logging: false });
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ hello }' }),
    });
    expect(response.status).toBe(200);
  });
});
