import { createSchema, createYoga } from 'graphql-yoga';
import { useSofa } from '@graphql-yoga/plugin-sofa';

const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      _: String
    }
  `,
  resolvers: {
    Query: {
      _: () => 'DUMMY',
    },
  },
});

it('should be able to invoke graphql query w/ plugin active', async () => {
  const yoga = createYoga({
    schema,
    plugins: [
      useSofa({
        basePath: "/rest",
        swaggerUI: {
            endpoint: "/swagger",
        },
      }),
    ],
  });
  const response = await yoga.fetch('http://localhost:3000/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query: '{ _ }' }),
  });

  expect(response.status).toEqual(200);
  const body = await response.json();
  expect(body).toEqual({
    data: {
      _: 'DUMMY',
    },
  });
});