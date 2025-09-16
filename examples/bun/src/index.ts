import { createSchema, createYoga } from 'graphql-yoga';

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

const server = Bun.serve({
  fetch: yoga,
  port: 4000,
});

console.info(
  `Server is running on http://${server.hostname}:${server.port}${yoga.graphqlEndpoint}`,
);
