import { createSchema, createYoga } from 'graphql-yoga';
import { app, InvocationContext } from '@azure/functions';

const yoga = createYoga<InvocationContext>({
  graphqlEndpoint: '/api/yoga',
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        greetings: String
      }
    `,
    resolvers: {
      Query: {
        greetings: () => 'This is the `greetings` field of the root `Query` type',
      },
    },
  }),
});

app.http('yoga', {
  method: ['GET', 'POST'],
  handler: yoga,
});
