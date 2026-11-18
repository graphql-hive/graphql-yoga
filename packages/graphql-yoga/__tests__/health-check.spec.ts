import { createSchema, createYoga } from '../src/index.js';

describe('health check', () => {
  it('return 200 status code for health check endpoint', async () => {
    const yoga = createYoga({
      logging: false,
    });
    const result = await yoga.fetch('http://yoga/health');
    expect(result.status).toBe(200);
  });
  it.each(['/health?probe=1', '/mounted/health?probe=1'])(
    'matches the health pathname with a query string: %s',
    async path => {
      const yoga = createYoga({ logging: false });
      const result = await yoga.fetch(`http://yoga${path}`);
      expect(result.status).toBe(200);
      expect(result.headers.get('x-yoga-id')).not.toBeNull();
    },
  );

  it('supports a custom health endpoint with a query string', async () => {
    const yoga = createYoga({ logging: false, healthCheckEndpoint: '/status' });
    const result = await yoga.fetch('http://yoga/status?probe=1');
    expect(result.status).toBe(200);
    expect(result.headers.get('x-yoga-id')).not.toBeNull();
  });

  it.each(['/health', '/graphql'])(
    'does not match an endpoint in a query parameter: %s',
    async endpoint => {
      const yoga = createYoga({ logging: false, landingPage: false });
      const result = await yoga.fetch(
        `http://yoga/not-found?query=%7B__typename%7D&target=${endpoint}`,
      );
      expect(result.status).toBe(404);
      expect(result.headers.get('x-yoga-id')).toBeNull();
    },
  );

  it('does not intercept GraphQL queries ending in the health endpoint', async () => {
    const yoga = createYoga({
      logging: false,
      schema: createSchema({ typeDefs: 'type Query { hello: String }' }),
    });
    const result = await yoga.fetch('http://yoga/graphql?query=%7B__typename%7D&target=/health');
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ data: { __typename: 'Query' } });
    expect(result.headers.get('x-yoga-id')).toBeNull();
  });
});
