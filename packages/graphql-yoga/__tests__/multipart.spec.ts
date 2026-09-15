import { createSchema } from '../src/schema';
import { createYoga } from '../src/server';

describe('Multipart', () => {
  const schema = createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        hello(name: String): String
      }
    `,
    resolvers: {
      Query: {
        hello: (_, { name }) => `hello ${name ?? 'Stranger'}!`,
      },
    },
  });
  const yoga = createYoga({
    schema,
  });
  it('should prevent prototype pollution', async () => {
    const form = new FormData();
    form.set('operations', JSON.stringify({ query: '{ hello }', variables: {} }));
    form.set('map', JSON.stringify({ 0: ['variables.hasOwnProperty.call'] }));
    form.set('0', new Blob(['x']), 'x.txt');
    const response1 = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      body: form,
    });

    expect(response1.status).toBe(200);
    await expect(response1.json()).resolves.toMatchObject({
      data: {
        hello: 'hello Stranger!',
      },
    });

    const response2 = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'query($name: String) { hello(name: $name) }',
        variables: { name: 'The Guild' },
      }),
    });
    expect(response2.status).toBe(200);
    await expect(response2.json()).resolves.toMatchObject({ data: { hello: 'hello The Guild!' } });
  });

  it('should return 400 for malformed multipart data instead of a generic 500', async () => {
    const response = await yoga.fetch('http://yoga/graphql', {
      method: 'POST',
      headers: {
        // missing the required `boundary` parameter
        'Content-Type': 'multipart/form-data',
      },
      body: 'operations={"query":"{ hello }"}',
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      errors: [{ message: expect.stringContaining('POST body sent invalid multipart data') }],
    });
  });
});
