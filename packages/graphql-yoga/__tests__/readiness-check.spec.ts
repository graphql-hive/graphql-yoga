import { createSchema, createYoga } from '../src/index.js';
import { useReadinessCheck } from '../src/plugins/use-readiness-check.js';

describe('Readiness Check', () => {
  const schema = createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        hello: String!
      }
    `,
    resolvers: {
      Query: {
        async hello() {
          return 'world';
        },
      },
    },
  });

  it('should respond with 200 if check returns nothing', async () => {
    const yoga = createYoga({
      schema,
      plugins: [
        useReadinessCheck({
          check: async () => {
            // noop
          },
        }),
      ],
    });

    const response = await yoga.fetch('http://yoga/ready');
    expect(response.status).toBe(200);
  });

  it('should respond with 200 if check returns true', async () => {
    const yoga = createYoga({
      schema,
      plugins: [
        useReadinessCheck({
          check: async () => {
            return true;
          },
        }),
      ],
    });

    const response = await yoga.fetch('http://yoga/ready');
    expect(response.status).toBe(200);
  });

  it('should respond with 503 if check returns false', async () => {
    const yoga = createYoga({
      schema,
      plugins: [
        useReadinessCheck({
          check: async () => {
            return false;
          },
        }),
      ],
    });

    const response = await yoga.fetch('http://yoga/ready');
    expect(response.status).toBe(503);
  });

  it('should respond with 503 and the error message if check throws an error', async () => {
    const message = 'Not good, not bad.';

    const yoga = createYoga({
      schema,
      plugins: [
        useReadinessCheck({
          check: async () => {
            throw new Error(message);
          },
        }),
      ],
    });

    const response = await yoga.fetch('http://yoga/ready');
    expect(response.status).toBe(503);
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(await response.text()).toBe(message);
  });

  it('should respond with 503 and empty body if check throws not an error', async () => {
    const yoga = createYoga({
      schema,
      plugins: [
        useReadinessCheck({
          check: async () => {
            throw 1;
          },
        }),
      ],
    });

    const response = await yoga.fetch('http://yoga/ready');
    expect(response.status).toBe(503);
    expect(response.headers.get('content-type')).toBeNull();
    expect(await response.text()).toBe('');
  });

  it('should respond with the response from check', async () => {
    const message = 'I am a-ok!';

    const yoga = createYoga({
      schema,
      plugins: [
        useReadinessCheck({
          check: async ({ fetchAPI }) => {
            return new fetchAPI.Response(message, { status: 201 });
          },
        }),
      ],
    });

    const response = await yoga.fetch('http://yoga/ready');
    expect(response.status).toBe(201);
    expect(await response.text()).toBe(message);
  });
  it('does not run the readiness check for an endpoint in the query string', async () => {
    const check = jest.fn(() => true);
    const yoga = createYoga({ schema, plugins: [useReadinessCheck({ check })] });
    const response = await yoga.fetch('http://yoga/graphql?query=%7Bhello%7D&target=/ready');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { hello: 'world' } });
    expect(check).not.toHaveBeenCalled();
  });

  it('keeps matching mounted readiness endpoints with query strings', async () => {
    const check = jest.fn(() => true);
    const yoga = createYoga({ schema, plugins: [useReadinessCheck({ check })] });
    const response = await yoga.fetch('http://yoga/mounted/ready?probe=1');
    expect(response.status).toBe(200);
    expect(check).toHaveBeenCalledTimes(1);
  });
});
